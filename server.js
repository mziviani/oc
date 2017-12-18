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


var port = process.env.PORT || 8080;


//imposto lengine di ejs per template
app.set("view engine", "ejs");


//connesione al db
var url = 'mongodb://localhost:27017/Bikeaway';
var baDB;
mongoClient.connect(url, function(err, db) {
  if (err) {
      console.log("Non riesco a connetermi al database: "+err);
      return;
    };
  baDB=db
});

//verifica akismet
var clientAki = akismet.client({
  key  : '98d8beff97bd',
  blog : 'http://localhost'
});

//scrivo sul log il risultato per verificare la key di akistmet
clientAki.verifyKey()
.then(function(valid) {
  if (valid) console.log('Akismet Valid key!');
  else console.log('Akismet Invalid key!');
})

//percorso statico per caricare i file dei template
app.use(express.static(__dirname + "/template"));

//override per rendere compatibile CRUD con i browser più vecchi per chiamate ajax
app.use("/private/api/json/:slag_percorso", methodOverride());
app.use("/private/api/json/all", methodOverride());
app.use("/private/api/json/commento/upload", methodOverride());

//upload commenti
app.use(bodyParser.urlencoded({ extended: false }))


//set cookieParser
app.use(cookieParser());




app.get("/", function(req,res) {
  console.log("index");
  res.end("ciao sono index")

});


app.listen(port);
