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

  var idCookie = req.cookies.sessionid;

  async.waterfall([
        function(callback) {
          baDB.collection('category').aggregate([
                                                   {
                                                     $match:  {
                                                                publish: true
                                                              }
                                                    },
                                                    { $lookup: {
                                                                  from: "percorsi",
                                                                  localField: "_id",
                                                                  foreignField: "scheda._idcategory",
                                                                  as: "percorsi"
                                                                }
                                                    },
                                                    {  $project: {  "title": 1,
                                                                    "image": 1,
                                                                    "order":1,
                                                                    "percorsi": {
                                                                                  $filter: {
                                                                                             input: "$percorsi",
                                                                                             as: "percorsi",
                                                                                             cond: {
                                                                                                    "$eq": ["$$percorsi.scheda.publish", true]
                                                                                                   }
                                                                                            }
                                                                                }
                                                                    }
                                                     },
                                                      { $unwind:"$percorsi" },
                                                      { $sort: {
                                                                "percorsi.scheda.publish_date": -1
                                                                }
                                                      },
                                                      { $group: {
                                                                _id:"$_id",
                                                                title: {$first:"$title"},
                                                                image: {$first:"$image"},
                                                                order: {$first: "$order"},
                                                                percorsi: {$push: "$percorsi"}
                                                                }
                                                      },
                                                      {  $project: {
                                                                "title": 1,
                                                                "image": 1,
                                                                "order":1,
                                                                "percorsi": {
                                                                          $slice: ["$percorsi", 2]
                                                                            },
                                                                      }
                                                      }, {
                                                          $sort: {
                                                                  "order": 1
                                                                }
                                                         }
                                                       ]).toArray(function(err,category) {
                                                         if(err) {
                                                           callback(err)
                                                           return
                                                         }
                                                          callback(null, category)
                                                        })
        },
        function(category, callback) {
          //id da escludere per gli hightlight

          var idEscludere = []
            category.forEach(function(catObj) {
                catObj['percorsi'].forEach(function percorsi(objPercorso) {
                    idEscludere.push(objPercorso._id);
                })

            })
            callback(null, category, idEscludere)
        },
        function (category, idEscludere, callback) {
          //1. recupero le keyword dell'utente


          //se l'utente non ha un id non ritorno le keyword utente
          //altrimenti richiamo le keyword da db
          if (idCookie==null) {
            //non ci sono keyword utente
            callback(null,null,idEscludere,category)
            return
          }

          //1. carico le keyword più utilizzate dall'_idUtente
          baDB.collection('historySearch').aggregate([

                {
                   $group: {
                                _id: '$_idUtente',
                                keyword: {$push: '$keyword' },
                          }

                },
                {
                    $match: { _id: idCookie}
                 },
                 { $unwind: "$keyword" },
                 { $unwind: "$keyword" },
                 { $sortByCount: "$keyword" },
                 { $match: {
                            'count': {
                                        $not: {
                                                $eq: 1
                                               }
                                      }
                            }

                 },
                 {$limit:5}
            ]).toArray(function(err,userKeyword) {


                if(err || userKeyword.length==0) {
                //non ci sono keyword utente
                  callback(null,null,idEscludere,category)
                  return
                }


                //estrapolo le keyword
                var userKeywordArray = []
                  userKeyword.forEach(function(keyObj) {
                          userKeywordArray.push(keyObj['_id']);
                  })


                //ritorno le k eyword utente
                callback(null,userKeywordArray,idEscludere,category)
            })


        },
        function(userKeyword, idEscludere,category,callback) {
          //2. carico i percorsi in funzione delle keyword utente

          //controllo se esistono keyword utente
          if (userKeyword == null) {

            //err, risultato percorsi, idEscludere, category
            callback(null,null, idEscludere, category)
            return
          }

          //altrimenti richiamo i percorsi utente escludendo gli id già visualizzati
            baDB.collection('percorsi').aggregate([
                                                              {
                                                                      $match: {
                                                                                'scheda.publish':true,
                                                                                'scheda.tags': { $in: userKeyword },
                                                                                '_id': {$nin: idEscludere}
                                                                              }


                                                               },

                                                                  {
                                                                   $lookup: {
                                                                              from:"category",
                                                                              localField: "scheda._idcategory",
                                                                              foreignField: "_id",
                                                                              as: "categoria"

                                                                       }

                                                                },
                                                                { $limit : 3}

                                                  ]).toArray(function(err,hightlight) {


                                                    //se errore o se ritorna 0
                                                    if (err || hightlight.length == 0 ) {


                                                      //err, risultato percorsi, idEscludere, category
                                                      callback(null,null, idEscludere, category)
                                                      return
                                                    }



                                                    //aggiorno gli id da idEscludere
                                                    hightlight.forEach(function percorsiObj(idEx) {
                                                        idEscludere.push(idEx['_id'])
                                                    })



                                                    callback(null,hightlight, idEscludere,category)
                                                  })




        },
        function (hightlight,idEsludere,category, callback) {
          //3. controllo che gli hightlight tornati sono 3
          // 3-> exit <3 ricarico le 10  keyword più utilizzate da tutti gli utenti
          if (hightlight!=null) {
              if(hightlight.length==3) {
                callback(null,null,hightlight,idEsludere,category)
                return
              }
          }

          //aggiorno la tabella delle keyword più usate dagli utenti
          baDB.collection('historySearch').mapReduce(function() {
                                                                  this['keyword'].forEach(function(parola){ emit(parola,1)})
                                                                  },
                                                      function(keyword, count) {
                                                                  var i = 0;
                                                                  count.forEach(function(v) { i+=v});
                                                                  return i
                                                                  },

                                                      {out: "usedKeyword"}
                                                     );

          //richiamo le 10 keyword più ricercate da tutti gli utenti
            baDB.collection('usedKeyword').find({value: {$ne: 1}})
                                          .sort({value:-1})
                                          .limit(10)
                                          .toArray(function(err,allUserKeyword) {
                                            if (err || allUserKeyword.length==0) {
                                                //nessuna keyword per tutti gli utenti passo null
                                                //err, allUserkeyword,hightlight,idEscludere,category
                                                callback(null,null,hightlight,idEsludere,category)
                                                return
                                            }
                                                //genero l'array
                                                var AllKeywordArray = []
                                                allUserKeyword.forEach(function percorsiObj(id) {
                                                    AllKeywordArray.push(id['_id'])
                                                })

                                                callback(null,AllKeywordArray,hightlight,idEsludere,category)
                                          })

        },
        function(allUserKeyword, hightlight,idEscludere,category,callback) {
          var limiteQuery = 3
          var allUserKeywordN = 0
          if (allUserKeyword != null) {
            allUserKeywordN = allUserKeyword.length
          }
          //4. controllo che gli hightlight tornati sono 3 in caso carico gli altri percorsi
          // 3-> exit <3 chiamare percorsi con keyword più ricercate da tutti gli utenti
          if (hightlight != null) {
              if(hightlight.length==3 || allUserKeywordN.length==0) {

                callback(null,hightlight,idEscludere,category)
                return
              } else {

                limiteQuery = 3-hightlight.length
              }
          }


          //manca l'esclusione degli id
          //carico i percorsi con le keyword
          baDB.collection('percorsi').aggregate([
                                                  {
                                                          $match: {
                                                                    'scheda.publish':true,
                                                                    'scheda.tags': { $in: allUserKeyword },
                                                                    '_id': { $nin: idEscludere}

                                                                  }
                                                   },
                                                   {
                                                       $lookup: {
                                                                  from:"category",
                                                                  localField: "scheda._idcategory",
                                                                  foreignField: "_id",
                                                                  as: "categoria"

                                                           }

                                                    },
                                                    { $limit : limiteQuery }

                                      ]).toArray(function(err,result) {

                                          if (err || result.length==0) {

                                            callback(null,hightlight,idEscludere,category)
                                            return
                                          }

                                          //aggiungo il risultato a hightlith
                                          if (hightlight != null) {

                                            result.forEach(function(ele) {
                                              hightlight.push(ele)
                                            })
                                          } else {

                                            hightlight = result
                                          }

                                          //aggiorno la lista di id da escludere in caso nella fase successiva
                                          result.forEach(function percorsiObj(idEx) {
                                              idEscludere.push(idEx['_id'])
                                          })


                                          callback(null,hightlight,idEscludere,category)

                                      })
        },
        function(hightlight,idEscludere,category,callback) {
          //5. carico i percorsi più visualizzati
          // se highlight = 3 exit altrimenti carico quelli più visti
          var limiteQuery = 3
          //4. controllo che gli hightlight tornati sono 3 in caso carico gli altri percorsi
          // 3-> exit <3 chiamare percorsi con keyword più ricercate da tutti gli utenti
          if (hightlight!=null) {
            if(hightlight.length==3) {
              callback(null,hightlight,category)
              return
            } else {
              limiteQuery = 3-hightlight.length
            }
          }
          //carico i percorsi più visualizzati
          baDB.collection('percorsi').aggregate([
                                                  {
                                                          $match: {
                                                                    'scheda.publish':true,
                                                                    '_id': { $nin: idEscludere}

                                                                  }
                                                   },
                                                   {
                                                        $sort: { 'scheda.view':-1}
                                                    },
                                                   {
                                                       $lookup: {
                                                                  from:"category",
                                                                  localField: "scheda._idcategory",
                                                                  foreignField: "_id",
                                                                  as: "categoria"

                                                           }

                                                    },
                                                    { $limit : limiteQuery }

                                      ]).toArray(function(err,result) {

                                          if (err || result.length==0) {
                                          //  console.log("errore");
                                            callback(null,hightlight,category);
                                            return
                                          }

                                          if (result.length>0 && hightlight != null) {
                                            //console.log("result > 0 ma non nullo");
                                            result.forEach(function(ele) {
                                              hightlight.push(ele)
                                            })
                                          } else if (result.length>0 && hightlight == null) {

                                            //console.log("hightlight = result");
                                            hightlight = result
                                          }


                                          callback(null,hightlight,category)
                                      })

        },
        function(hightlight, category, callback) {
          //carico la storia della ricerca utente
          if (hightlight != null) {
            if (hightlight.length<3) {
              hightlight = null
            }
          }


          if (idCookie==null) {
            //non ci sono keyword utente
            callback(null,hightlight,category,null)
            return
          }
          //carico la ricerca utente
          baDB.collection('historySearch').find({'_idUtente':idCookie}, {'ricerca':1})
                                          .sort({'data':-1})
                                          .limit(3)
                                          .toArray(function(err,searchStory) {
                                              if (err) {
                                                  callback(null,hightlight,category,null);
                                                  return
                                              }
                                              callback(null,hightlight,category,searchStory);
                                          })
        },
        function(hightlight,category,searchStory,callback) {
            //carico gli annunciin home 3
            baDB.collection('annunci').find({"publish":true, "home":true}, {"title":1, "text":1, "dominiovisualizzato": 1})
                                      .sort({"impression":1})
                                      .limit(3)
                                      .toArray(function(err,annunci) {
                                                if (err || annunci.length<3) {
                                                    callback(null,hightlight,category,searchStory,null);
                                                    return
                                                }

                                                var idAnnunci =[];
                                                annunci.forEach(function(a) {
                                                      idAnnunci.push(a['_id'])
                                                })


                                                //incremento di 1 le impression delle pubblicità
                                                baDB.collection("annunci").updateMany(
                                                                    {_id: {$in:idAnnunci}},
                                                                   {$inc: { 'impression': 1}}

                                                                 )


                                                callback(null,hightlight,category,searchStory,annunci);


                                            })

        }
      ], function (err, hightlight, category, searchStory,annunci) {

              if (err) {
                res.redirect("/500");
                return;
              }

               res.render(__dirname + "/../template/index", {
                                                            title: null,
                                                            description: "meta descrizione",
                                                             highlightObj: hightlight,
                                                             searchStoryObj: searchStory,
                                                             categoryObj: category,
                                                             annunciObj: annunci
                                                           })
         })


});


app.listen(port);
