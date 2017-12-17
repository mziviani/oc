
exports.version = "1.0.0";

//funzione index di test
exports.testFunctionIndex = function(req, res) {
  res.end("hai chiamato l'index");
  console.log("è stata chiamata l'index");
}

exports.keyWordGenerator = function(stringa) {
  //pronomi da rimuovere
  var removeArray = ["di", "a", "da", "in", "con", "su", "per", "tra", "fra", "il", "del", "al", "dal", "nel","col", "sul", "per il", "tra il", "fra il", "lo", "dello", "allo", "dallo", "nello", "con lo", "sullo", "per lo", "tra lo", "fra lo", "la", "della", "alla", "dalla", "nella", "con la", "sulla", "per la", "tra la", "fra la", "i", "dei", "ai", "dai", "nei", "con i", "sui", "per i", "trai", "frai", "gli", "degli", "agli", "dagli", "negli", "con gli", "sugli", "per gli", "tra gli", "fra gli", "le", "delle", "alle", "dalle", "nelle", "con le", "sulle", "per le", "tra le","fra le", "mio", "mia", "tuo", "tua", "suo", "sua", "nostro", "nostra", "vostro", "vostra", "loro", "miei", "mie", "tuoi", "tue", "suoi", "sue", "nostri", "nostre", "vostri", "vostre","questo", "questi", "questa", "queste", "codesto", "codesta", "codesti", "codeste", "quello", "quella", "quelli", "quegli", "quei", "quelle", "via", "san","piazza","vicolo", "palazzo"]

  //1 pulire la ricerca
  var parolaPulita = stringa.toLowerCase()

  removeArray.forEach(function(txtRemove) {
          var regEx =  new RegExp("\\b"+txtRemove+"\\b","i");
          parolaPulita = parolaPulita.replace(regEx,"")
  })

  //rimuovo gli spazi doppi e prima o dopo la frase
  parolaPulita = parolaPulita.replace(/\s\s+/g, ' ');
  parolaPulita = parolaPulita.trim();

  //array di tag da ricercare nei percorsi
  var searchKeyword = parolaPulita.split(" ");
  return searchKeyword;
}
