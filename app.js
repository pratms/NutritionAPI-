var express = require('express');
var path = require('path');
var request = require('request');
var index = require('./routes/index');
var natural = require('natural');
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var XLSX = require('xlsx');

var app = express();

// Database settings
mongoose.connect('mongodb://pratik:pratik@ds059496.mlab.com:59496/heroku_9rflxd4s');
var db = mongoose.connection;

db.on('error', function (err) {
console.log('connection error', err);
});
db.once('open', function () {
console.log('connected.');
});

// MongoDB Schema
var Schema = mongoose.Schema;
var KoneksaSchema = new Schema({
  user_input: String,
  result: { },
  distance: Number
});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);

// food items xls file
function file_food_item()
{
  var w = XLSX.readFile('food items.xlsx');
  var sheet_name_list = w.SheetNames;
  var j = XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {header:1});

  j.forEach(function(food_items)

  {
    request('https://api.nutritionix.com/v1_1/search/'+ food_items +'?fields=item_name%2Citem_id%2Cbrand_name%2Cnf_calories%2Cnf_total_fat&appId=6d84533f&appKey=ca319bc840f460ac9eb20ae310d477cb',
    function (error, response, body) {

      var Koneksa = mongoose.model('Koneksa', KoneksaSchema);
      var Koneksa = new Koneksa(body);


      Koneksa.save(function (err, data)
      {
      if (err) console.log(err);
      });

  });
})
}


// response to user input

app.get('/searching', function(req, res) {
  var string = req.query.q;
  if (!string) {
    res.send('invalid input');
  }
  console.log(string);

  //tokenize
    natural.PorterStemmer.attach();
  var stems = string.tokenizeAndStem();
  var element = stems.join(' ');
  console.log(element);

// API Call

    request('https://api.nutritionix.com/v1_1/search/'+ element +'?fields=item_name%2Citem_id%2Cbrand_name%2Cnf_calories%2Cnf_total_fat&appId=6d84533f&appKey=ca319bc840f460ac9eb20ae310d477cb',
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
           body = JSON.parse(body);
      var result = body.hits;
      var Koneksa = mongoose.model('Koneksa', KoneksaSchema);
      var result_exits;

// Handle promise

      var promise = getData(string);

      promise.then(function(result){

      if(!result.length) return insertData();

      res.send(result);

      }).catch(function(error){
         console.log(error);
      });

// if string already exists
      function getData(name){
         var promise = Koneksa.find({ "user_input":string }).exec();
         return promise;
      }

// New string search
      function insertData(){
        var response = [];
        result.forEach(function (item) {
          var returned_str = item.fields;
          var returned_item_name = item.fields.item_name;
          var distance = natural.LevenshteinDistance(string, returned_item_name);

         var document = { user_input: string, result: returned_str, distance: distance};
        console.log(document);
         var Koneksa = mongoose.model('Koneksa', KoneksaSchema);
         var Koneksa = new Koneksa(document);
// insert into Database

                      Koneksa.save(function (err, data) {
                      if (err) console.log(err);
                    });
          response.push(document);

        })
    res.send(response);
      }

  }

    });

});


// catch 404 
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
