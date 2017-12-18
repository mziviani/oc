//api akismet 98d8beff97bd

var express = require("express");
var ba = require("./bikeaway-handlers/base");
var methodOverride = require('method-override');
var mongoClient = require('mongodb').MongoClient;
var async = require("async");
var crypto = require("crypto");
var cookieParser = require('cookie-parser');
var striptags = require('striptags');
var bodyParser = require('body-parser');
var akismet = require('akismet-api');
var CronJob = require('cron').CronJob;
var ObjectId = require('mongodb').ObjectID;





var app = express();


//imposto lengine di ejs per template
app.set("view engine", "ejs");

var port = process.env.PORT || 8080;

app.get("/", function(req,res) { 
  console.log("index");
  res.end("ciao sono index")

});


app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);
});
