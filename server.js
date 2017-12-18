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



var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

    if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
      var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
          mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
          mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
          mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
          mongoPassword = process.env[mongoServiceName + '_PASSWORD']
          mongoUser = process.env[mongoServiceName + '_USER'];

      if (mongoHost && mongoPort && mongoDatabase) {
        mongoURLLabel = mongoURL = 'mongodb://';
        if (mongoUser && mongoPassword) {
          mongoURL += mongoUser + ':' + mongoPassword + '@';
        }
        // Provide UI label that excludes user id and pw
        mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
        mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

      }
  }

var app = express();


//imposto lengine di ejs per template
app.set("view engine", "ejs");


//connesione al db
//var url = 'mongodb://'+mongoUrl+':27017/bikeaway';
var url = mongoURL;

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
app.use(express.static(__dirname + "/../template"));

//override per rendere compatibile CRUD con i browser più vecchi per chiamate ajax
//pag 131
app.use("/private/api/json/:slag_percorso", methodOverride());
app.use("/private/api/json/all", methodOverride());
app.use("/private/api/json/commento/upload", methodOverride());

//upload commenti
app.use(bodyParser.urlencoded({ extended: false }))


//set cookieParser
app.use(cookieParser());

//MIDDLEWARE **********************************************************************************
//example middelware
/*app.use(function (req, res, next) {
  console.log('Time:', Date.now());
  next();
});
//middleware su url
app.use('/user/:id', function (req, res, next) {
  console.log('Request Type:', req.method);
  next();
});*/

//middleware per memorizzare la ricerca !!!
// middleware app o router ???


//middleware con doppia funzione utile per 404
/*app.get('/user/:id', function (req, res, next) {
  // if the user ID is 0, skip to the next route
  if (req.params.id == 0) next('route');
  // otherwise pass the control to the next middleware function in this stack
  else next(); //
}, function (req, res, next) {
  // render a regular page
  res.render('regular');
});*/
//MIDDLEWARE **********************************************************************************


//non trova la path -> output template html
app.get("/404", function(req,res) {

  baDB.collection("category").find({"publish":true},{"publish":0, "order":0})
                              .sort({"order":1})
                            .toArray(function(err, result) {

                              if(err) {
                                  res.redirect("/505");
                                  return;
                              }



                              res.status(404)
                              res.render(__dirname + "/../template/404", {
                                  title: "404 la pagina non è più disponibile",
                                  description: "meta descrizione categoria",
                                  categoryObj: result
                              } )

                          })




})



app.get("/500", function(req,res) {
    res.status(500);
    res.render(__dirname + "/../template/505", {
        title: "404 la pagina non è più disponibile",
        description: "meta descrizione categoria",
    } )
})

app.get("/private-policy", function(req,res) {
  res.render(__dirname + "/../template/private-policy", {
      title: "Private Policy",
      description: "meta descrizione categoria",
  } )
})

app.get("/help-center", function(req,res) {
  res.render(__dirname + "/../template/help-center", {
      title: "Help Center",
      description: "meta descrizione categoria",
  } )
})

//cerca
app.get("/cerca", function(req,res) {


  //1 pulire la ricerca
  var parolaRicercata = req.query.q;
  //modulo personalizzato per ricavare le keyword da una stringa di ricerca
  var searchKeyword = ba.keyWordGenerator(parolaRicercata);

  //controllo se esiste un cookie per identificare l'utente
  // se non esiste genero un hash per identificare l'utente
  var idCookie = req.cookies.sessionid;

  if (idCookie == undefined) {
    crypto.randomBytes(48, function(err, buffer) {
      var idCookie = buffer.toString('hex');
      res.cookie("sessionid", idCookie, { expires: new Date(253402300000000)});
    });
  }

  //doppia ricerca
  //prima ricerca rigida in caso 0 result
  //seconda ricerca lasca
  async.waterfall([
        function(callback) {
          baDB.collection('percorsi').aggregate([
                                                    {
                                                            $match: {
                                                                      'scheda.publish':true,
                                                                      'scheda.tags': { $all: searchKeyword }
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
                                                      {
                                                        $sort: {
                                                              "scheda.title": 1
                                                        }

                                                      }

                                                  ]).toArray(function(err,result) {
                                                    if(err) {
                                                      callback(err)
                                                      return;
                                                    }

                                                    callback(null, result)


                                                  })

        },
        function(result,callback) {
          if(result.length==0) {
            baDB.collection('percorsi').aggregate([
                                                          {
                                                                  $match: {

                                                                             $text: { $search: parolaRicercata,
                                                                                      $caseSensitive: false},
                                                                             'scheda.publish':true,
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
                                                            {
                                                              $sort: {
                                                                    "scheda.title": 1
                                                              }

                                                            }


                                                  ]).toArray(
                                                    function(err,result) {
                                                    if(err) {
                                                      callback(err)
                                                      return;
                                                    }

                                                    callback(null, result)

                                                  })



          } else {
            callback(null,result)
          }

        }, function(result, callback) {

          //inserisco nel db la ricerca + hash utente
          baDB.collection("historySearch").insert(
                            {_idUtente: idCookie,
                              data: new Date(Date.now()),
                              ricerca: parolaRicercata,
                              keyword: searchKeyword
                            })

          callback(null,result)

        }],
        function(err, result) {
          if(err) {
            console.log("errore nella ricerca: " + err);
            res.redirect("/505");
            return;
          }

          if(result.length==0) {
            result = undefined;
          }


          res.render(__dirname + "/../template/ricerca", {
              title:  "Ricerca | "+parolaRicercata,
              description: "meta descrizione categoria",
              query: parolaRicercata,
              serp: result
          } )
        }


  )

})

//annunci
app.get("/annunci/:slag_id", function(req,res) {
  var idAnnuncio = null

  try {
    idAnnuncio = ObjectId(req.params.slag_id)
  } catch(err) {
    idAnnuncio = null
  }

  //cerco il documento e aggiorno i click
   baDB.collection("annunci").findOneAndUpdate(
                                                { _id: ObjectId(idAnnuncio)},
                                                 {$inc: { 'click': 1}},
                                                 function(err,result) {
                                                   if(err){
                                                     res.redirect("/505");
                                                     console.log("Errore in annunci -> " + err);
                                                     return
                                                   }

                                                   if (idAnnuncio == null) {
                                                     res.redirect("/404");
                                                     return
                                                   }

                                                   res.redirect(result['value']['link']);

                                                 }
                                               )
});



//categoria -> output template html
app.get("/:slag_category",function(req,res) {

    var idCategoria = req.params.slag_category;

    async.series([
        function(callback) {
          baDB.collection('category').aggregate([
                                                {
                                                    $match: {
                                                               _id:idCategoria
                                                            }
                                                },
                                                { $lookup: {
                                                            from: "percorsi",
                                                            localField: "_id",
                                                            foreignField: "scheda._idcategory",
                                                            as: "percorsi"
                                                            }
                                                },
                                                {
                                                   $project: {
                                                               "title":1,
                                                               "percorsi": {
                                                                            $filter: {
                                                                                        input:"$percorsi",
                                                                                        as: "percorsi",
                                                                                        cond: {
                                                                                                    $eq: ["$$percorsi.scheda.publish", true]
                                                                                                }
                                                                                      }


                                                                           }
                                                              }
                                                },
                                                 { $unwind:"$percorsi" },
                                                          { $sort: {
                                                                    "percorsi.scheda.title":1
                                                                    }
                                                          },
                                                          { $group: {
                                                                    _id:"$_id",
                                                                    title: {$first:"$title"},
                                                                    percorsi: {$push: "$percorsi"}
                                                                    }
                                                          }
                                              ]).toArray(function(err,resPercorsi) {
                                                                                    if(err) {
                                                                                      callback(err);
                                                                                      return
                                                                                    }

                                                                                    //controllo il numero di percorsi -> 0 redirect 404
                                                                                    if (resPercorsi.length==0) {
                                                                                      res.redirect("/404");
                                                                                      return;
                                                                                    }

                                                                                    callback(null, resPercorsi);
                                                                                  })
        },
        function(callback) {
          baDB.collection("category").aggregate([
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
                                                    },{
                                                       $sort: {
                                                                "order": 1
                                                              }
                                                       },
                                                    {
                                                      $project: {
                                                                  "_id":1,
                                                                  "title":1,

                                                                 }

                                                     }
                                                ]).toArray(function(err, resCategory) {
                                                    if(err) {
                                                        callback(err)
                                                        return
                                                    }

                                                    if (resCategory.length==0) {
                                                      resCategory = undefined;
                                                    }

                                                    callback(null, resCategory)

                                                })
        }
      ], function(err,result) {
        if(err) {
          console.log("errore in index mongodb find: " + err);
          //redirect errore server 500
          res.redirect("/500");
          return;
        }

        res.render(__dirname + "/../template/category", {
            title: req.params.slag_category + " | " ,
            description: "meta descrizione categoria",
            percorsiObj: result[0],
            categoryObj: result[1]
        } )
      }
    )
})

//percorso -> output template html
app.get("/:slag_category/:slag_percorso",function(req,res) {
  var idPercorso = req.params.slag_percorso;
  var idCategory = req.params.slag_category;
  var cerca = false;

  //controllo se deriva dal cerca o dalla categoria
  if (req.query.type=="search") {
    cerca = true;
  }

  baDB.collection("percorsi").aggregate([
                                        {
                                                $match: {
                                                            $and: [
                                                                    {_id: idPercorso},
                                                                    {'scheda._idcategory':idCategory},
                                                                    {'scheda.publish': true}
                                                            ]
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
                                          { $limit : 1 }
                            ]).toArray(function(err, resPercorso) {

                              if(err) {
                                  res.redirect("/505");
                                  return;
                              }

                              if (resPercorso.length==0) {
                                  res.redirect("/404");
                                  return;
                              }

                              //Incremento di 1 le visite al percorso
                              baDB.collection("percorsi").update(
                                                {_id: resPercorso[0]['_id']},
                                                 {$inc: { 'scheda.view': 1}}
                                                )

                              res.render(__dirname + "/../template/percorso", {
                                  title: resPercorso[0]['scheda'].title + " | ",
                                  description: "meta descrizione categoria",
                                  percorsoObj: resPercorso,
                                  search: cerca
                              } )

                          })




})



//INDEX
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






//xhr per home
app.get("/private/api/json/all/", function(req,res) {
  baDB.collection('percorsi').aggregate([
                                                      {
                                                              $match: {
                                                                        'scheda.publish':true,
                                                                      }
                                                       },
                                                       {
                                                           $lookup: {
                                                                      from:"category",
                                                                      localField: "scheda._idcategory",
                                                                      foreignField: "_id",
                                                                      as: "categoria"

                                                               }

                                                        },{
                                                         $project: {  "_id":1,
                                                                      "coordinates": {
                                                                                         "$slice": [ "$coordinates", 0,1]
                                                                                      },
                                                                      "scheda.title":1,
                                                                      "scheda.difficolta":1,
                                                                      "scheda.lunghezza":1,
                                                                      "scheda.pendenza":1,
                                                                      "scheda.strada":1,
                                                                      "categoria": {
                                                                                      "title":1,
                                                                                      "_id":1
                                                                                    }

                                                                    }
                                                      }
                                             ]).toArray(function(err,result) {
                                               res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
                                               res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                                               res.setHeader('Content-Type', 'application/json');

                                                if (err) {
                                                  console.log("Errore /private/api/json/all/ ->" +err);
                                                  res.end(JSON.stringify({error: true}));
                                                  return
                                                }

                                                res.end(JSON.stringify(result));
                                            });



})


//json ricerca
app.get("/private/api/json/cerca", function(req,res) {
  var parolaRicercata = req.query.q;
  var searchKeyword = ba.keyWordGenerator(parolaRicercata);


  async.waterfall([
        function(callback) {
          baDB.collection('percorsi').aggregate([
                                                    {
                                                            $match: {
                                                                      'scheda.publish':true,
                                                                      'scheda.tags': { $all: searchKeyword }
                                                                    }
                                                     },
                                                     {
                                                         $lookup: {
                                                                    from:"category",
                                                                    localField: "scheda._idcategory",
                                                                    foreignField: "_id",
                                                                    as: "categoria"

                                                             }

                                                      },{
                                                          $project: {  "_id":1,
                                                                       "coordinates": {
                                                                                          "$slice": [ "$coordinates", 0,1]
                                                                                       },
                                                                       "scheda.title":1,
                                                                       "scheda.difficolta":1,
                                                                       "scheda.lunghezza":1,
                                                                       "scheda.pendenza":1,
                                                                       "scheda.strada":1,
                                                                       "categoria": {
                                                                                       "title":1,
                                                                                       "_id":1
                                                                                     }

                                                                     }
                                                    }
                                                  ]).toArray(function(err,result) {
                                                    if(err) {
                                                      callback(err)
                                                      return;
                                                    }

                                                    callback(null, result)


                                                  })

        },
        function(result,callback) {
          if(result.length==0) {
            baDB.collection('percorsi').aggregate([
                                                          {
                                                                  $match: {

                                                                             $text: { $search: parolaRicercata,
                                                                                      $caseSensitive: false},
                                                                             'scheda.publish':true,
                                                                          }
                                                           },
                                                           {
                                                               $lookup: {
                                                                          from:"category",
                                                                          localField: "scheda._idcategory",
                                                                          foreignField: "_id",
                                                                          as: "categoria"

                                                                   }

                                                            },{
                                                                $project: {  "_id":1,
                                                                             "coordinates": {
                                                                                                "$slice": [ "$coordinates", 0,1]
                                                                                             },
                                                                             "scheda.title":1,
                                                                             "scheda.difficolta":1,
                                                                             "scheda.lunghezza":1,
                                                                             "scheda.pendenza":1,
                                                                             "scheda.strada":1,
                                                                             "categoria": {
                                                                                             "title":1,
                                                                                             "_id":1
                                                                                           }

                                                                           }
                                                          }


                                                  ]).toArray(
                                                    function(err,result) {
                                                    if(err) {
                                                      callback(err)
                                                      return;
                                                    }

                                                    callback(null, result)

                                                  })



          } else {
            callback(null,result)
          }

        }],
        function(err, result) {
          res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
          res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
          res.setHeader('Content-Type', 'application/json');

           if (err || result.length==0) {
             console.log("Errore /private/api/json/all/ ->" +err);
             res.end(JSON.stringify({error: true}));
             return
           }

           res.end(JSON.stringify(result));

        }


  )
})

//json annunci scheda
//annunci per percorso
app.post("/private/api/json/annunci", function(req,res) {
  var x1 = Number((req.body.lat1).trim());
  var y1 = Number((req.body.lng1).trim());
  var x2 = Number((req.body.lat2).trim());
  var y2 = Number((req.body.lng2).trim());


  //carico gli annunci all'interno delle coordinate
  baDB.collection('annunci').find({
     "coordinates": {
       $geoWithin: {
          $geometry: {
             type: "Polygon" ,
             coordinates: [
               [ [x1,y1],[x2,y1],[x2, y2],[x1,y2],[x1,y1] ]
             ]
          }
        }
       },"publish":true },
      {_id:1, "title":1, "text":1, "dominiovisualizzato":true, "coordinates":1}
   ).sort({"impression":1})
    .limit(5)
     .toArray(function(err,result) {
     res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
     res.setHeader('Content-Type', 'application/json');

      if (err) {
        console.log("Errore /private/api/json/all/ ->" +err);
        res.end(JSON.stringify({error: true}));
        return
      }

      var idAnnunci =[];
      result.forEach(function(a) {
            idAnnunci.push(a['_id'])
      })


      //incremento di 1 le impression delle pubblicità
      baDB.collection("annunci").updateMany(
                          {_id: {$in:idAnnunci}},
                         {$inc: { 'impression': 1}}
                       )

      res.end(JSON.stringify(result));
  });

})

//json per caricare tutti i percorsi di una categoria
app.get("/private/api/json/category/:slag_category", function(req,res) {
  var idCategory = req.params.slag_category
  baDB.collection('percorsi').aggregate([
                                                      {
                                                              $match: {
                                                                        'scheda.publish':true,
                                                                      }
                                                       },
                                                       {
                                                           $lookup: {
                                                                      from:"category",
                                                                      localField: "scheda._idcategory",
                                                                      foreignField: "_id",
                                                                      as: "categoria"

                                                               }

                                                        },{
                                                         $project: {  "_id":1,
                                                                      "coordinates": {
                                                                                         "$slice": [ "$coordinates", 0,1]
                                                                                      },
                                                                      "scheda.title":1,
                                                                      "scheda.difficolta":1,
                                                                      "scheda.lunghezza":1,
                                                                      "scheda.pendenza":1,
                                                                      "scheda.strada":1,
                                                                      "categoria": {
                                                                                      "title":1,
                                                                                      "_id":1
                                                                                    }

                                                                    }

                                                      },
                                                      {
                                                              $match: {
                                                                        'categoria._id':idCategory
                                                                      }
                                                       },
                                                       { $sort: {
                                                                 "scheda.title":1
                                                                 }
                                                       }
                                             ]).toArray(function(err,result) {
                                               res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
                                               res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                                               res.setHeader('Content-Type', 'application/json');

                                                if (err || result.length==0) {
                                                  console.log("Errore /private/api/json/all/ ->" +err);
                                                  res.end(JSON.stringify({error: true}));
                                                  return
                                                }

                                                res.end(JSON.stringify(result));
                                            });

})

//upload segnalazioni
app.post("/private/api/json/segnalazioni/upload", function(req,res) {
  var tipoSegnalazione = Number((req.body.tipoSegnalazione).trim());
  var lat = Number((req.body.lat).trim());
  var lng = Number((req.body.lng).trim());
  var percorso = (req.body.idPercorso).trim()

  if (isNaN(tipoSegnalazione) || isNaN(lat) || isNaN(lng) || tipoSegnalazione == null || lat==null || lng == null || percorso == null){
    red.end(JSON.stringify({code: "error"}))
    //-> err
    return
  }

  baDB.collection("alert").insert({type:"Point", coordinates: [lat,lng], data: {data: new Date(Date.now()), type: tipoSegnalazione, _idPercorso: percorso}}, function(err,result){
                                                                                                                                                              res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
                                                                                                                                                              res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                                                                                                                                                              res.setHeader('Content-Type', 'application/json');


                                                                                                                                                              if(err) {
                                                                                                                                                                  red.end(JSON.stringify({code: "error"}));
                                                                                                                                                                  return
                                                                                                                                                              }

                                                                                                                                                                res.end(JSON.stringify({code: "ok"}))
                                                                                                                                                          });


})

//download segnalazioni
app.get("/private/api/json/segnalazioni/:slag_percorso", function(req,res) {
  var idPercorso = req.params.slag_percorso;

  //carico gli alert specifici del percorsi
  baDB.collection('alert').find({"data._idPercorso" : idPercorso}, {type:0, _id:0, "data.data":0, "data._idPercorso":0})
                          .toArray(function(err, result) {
                            res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
                            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                            res.setHeader('Content-Type', 'application/json');


                            if (err) {
                              res.end(JSON.stringify({code: "error"}));
                              console.log("errore in json alert percorso " + idPercorso);
                              return
                            }

                            if(result.length==0) {
                                res.end(JSON.stringify({code: 0}));
                                return
                            }

                              res.end(JSON.stringify(result));

                          })

})

//download attivita bar e parcheggi
app.get("/private/api/json/attivita/:slag_percorso", function(req,res) {
  var idPercorso = req.params.slag_percorso;

  //carico gli alert specifici del percorsi
  baDB.collection('attivita').find({"_idPercorso" : idPercorso}, {_id:0, "_idPercorso":0, "location.type":0})
                          .toArray(function(err, result) {
                            res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
                            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                            res.setHeader('Content-Type', 'application/json');


                            if (err) {
                              res.end(JSON.stringify({code: "error"}));
                              console.log("errore in json alert percorso " + idPercorso);
                              return
                            }

                            if(result.length==0) {
                                res.end(JSON.stringify({code: 0}));
                                return
                            }

                              res.end(JSON.stringify(result));

                          })

})



app.post("/private/api/json/commento/upload/", function(req,res) {
  var autore = (req.body.autore).trim();
  var idPercorso = (req.body._idPercorso).trim();
  var mail = (req.body.mail).trim();
  var commento = (req.body.commento).trim();
  var tappa = Number((req.body.tappa).trim());
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var headers = req.header['user-agent'];
  var data = new Date(Date.now());
  var referrer = req.header('Referer');
  var pass = "spam"

  //1 type: 1 dati non validi
  //2  type 2 SPAM
  // 3 type3  ok
  // 4 type 4 errore sistema

  //se c'è qualche dato null ritorno un errore
  if (autore == "" || idPercorso == "" || mail == "" || isNaN(tappa) || autore == null || idPercorso == null || mail == null ) {
    res.end(JSON.stringify({code: 1}));
    return;
  }

  //controllo che il messaggio non sia spam mediante akismet-api
  //usare aync
  //1 controllo se è spam
  //2 inserisco in db
  //3 ritorno il risultato
  async.waterfall([
    function(callback) {
      clientAki.checkSpam({
                          user_ip : ip,
                          user_agent : headers,
                          referrer : referrer,
                          comment_author : autore,
                          comment_author_email : mail,
                          comment_content : commento,
                        }, function(err, spam) {
                                                if (err) {
                                                  callback(err);
                                                };
                                                if (spam) {
                                                  callback(null, "spam");
                                                } else {
                                                  callback(null,"ok");
                                                }

                        });
    }, function(spam, callback) {
      pass = spam;

      //striptags
      autore =  striptags(autore);
      mail = striptags(mail);
      commento = striptags(commento);
      commento = commento.replace("\n", "<br/>");

      //inserisco in db
      baDB.collection("commenti").insert({_idPercorso: idPercorso, data: data, autore: autore, mail: mail, commento: commento, status: pass, tappa: tappa, ip: ip}, function(err,result) {
                                                                                                                                                                                          if (err) {
                                                                                                                                                                                              callback(err)
                                                                                                                                                                                              return
                                                                                                                                                                                          }

                                                                                                                                                                                          callback(null,result)
                                                                                                                                                                                        })

    }

  ],function (err, result) {
    res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader('Content-Type', 'application/json');


    if(err) {
      console.log("errore inserimento commento ->" + err);
      res.end(JSON.stringify({code: 4}))
      return
    }
    if(result.result.ok && pass=="spam") {
        res.end(JSON.stringify({code: 2}));
        return;
    };

     res.end(JSON.stringify({code: 3}));
  })


})

//

//json per caricare i commenti di un percorso
app.get("/private/api/json/commenti/:slag_percorso/", function(req,res) {
  var idPercorso = req.params.slag_percorso;



                           baDB.collection("commenti").find({_idPercorso: idPercorso, status: "ok"}, {data:1,autore:1,commento:1,tappa:1,_id:0})
                                                      .sort({data: -1})
                                                      .toArray(function(err, result) {
                                                       res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
                                                       res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                                                       res.setHeader('Content-Type', 'application/json');

                                                       if (err) {
                                                         console.log("Errore /private/api/json/commenti/"+idPercorso +" ->" +err);
                                                         res.end(JSON.stringify({error: true}));
                                                         return
                                                       }

                                                       if(result.length==0) {
                                                         res.end(JSON.stringify({commenti: 0}));
                                                       }

                                                       res.end(JSON.stringify(result));

                                                    })
})



//json per caricare tutti i percorsi di una categoria
app.get("/private/api/json/:slag_category/:slag_percorso/", function(req,res) {
  var idPercorso = req.params.slag_percorso;
  var idCategory = req.params.slag_category;



                           baDB.collection("percorsi").find({_id: idPercorso, "scheda._idcategory": idCategory, "scheda.publish": true}, {"scheda.tags":0, "scheda.view":0})
                                                      .toArray(function(err, result) {
                                                       res.header("Access-Control-Allow-Origin", "http://localhost:8080/");
                                                       res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                                                       res.setHeader('Content-Type', 'application/json');

                                                       if (err || result.length==0) {
                                                         console.log("Errore /private/api/json/singolopercorso ->" +err);
                                                         res.end(JSON.stringify({error: true}));
                                                         return
                                                       }

                                                       res.end(JSON.stringify(result));

                                                    })
})





//in caso di URI non definiti -> redirect con errore 404
app.get("*", function(req,res) {
  res.redirect("/404")
})

//cronjop per eliminare gli alert ogni 60 gg
//alle 2 di ogni notte pulizia degli alert più vecchi di 60 gg
new CronJob('00 00 02 * * *', function() {
  var dataAttuale = new Date(Date.now())
  var data60gg = new Date(dataAttuale-(24*60*60*1000*60))

   baDB.collection("alert").remove({"data.data": {$lt: data60gg}})

  console.log("Pulizia degli alert minori del " + data60gg);
}, null, true);


//to do
// -> parte amministrativa ? (no)
//realizzare pagine statiche (contatti, help center ecc...)
// realizzare redirect /505
// api mailchimp
// sistemare filtering con javascript
//sistemre il filtro della scheda sul cellulare


app.listen(port,ip);
module.exports = app;
