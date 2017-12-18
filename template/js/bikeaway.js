//riga 219 cambira url immagine pin mappa

//funzione controllo dimensione finestra
function windowMobile() {
	var size = $(window).width();
	if(size<768) {
		return true;
	} else {
		return false;
	}
}
//variabile per timeout funzione di resize
var resizeAction;

//inizializzazione larghezza barra ricerca avanzata
function initLarghezzaSearch() {
	resizeLarghezzaSearch();
	$(window).resize(function() {
															setTimeout(resizeLarghezzaSearch, 150);
														});

	//botton filtri avanzati
	$('#search-advanced-view a:nth-child(1)').click(visualizzaFiltriAvanzati);

}

//ridimensionamento ricerca avanzata
function resizeLarghezzaSearch() {
		var sao = $('#search-advanced-options');

		//azzero i filitri
		sao.removeAttr('style');

		var larghezza = $('#search-field #search-field-group').outerWidth();
		larghezza += $('#search-field input[type="submit"]').outerWidth();

		if(!windowMobile()){
			larghezza+=40;
		}
			//larghezza += 40;
			sao.attr('style', 'width:'+larghezza+'px;'+sao.attr('style'));

}

//set visibilità ed etichetta filtri avanzati
function visualizzaFiltriAvanzati(e) {
	e.preventDefault()
	//ricalcolo la larghezza sumobile
	resizeLarghezzaSearch()

	var sao = $('#search-advanced-options');
	var a = $('#search-advanced-view a:nth-child(1)');
	var span = $('#search-advanced-view a:nth-child(1) span');

	if(sao.hasClass('hidden')) {
		sao.removeClass('hidden');
		span.removeClass('glyphicon-option-horizontal');
		span.addClass('glyphicon-trash');
		a.addClass('remove');
	} else {
		sao.addClass('hidden');
		span.removeClass('glyphicon-trash');
		span.addClass('glyphicon-option-horizontal');
		a.removeClass('remove');

		//svuotare i valori dei campi di input
		$("#search-advanced-options input[type='text']").val(null);
		$("#search-advanced-options select").val(0);
		$('#search-advanced-options input:checkbox:checked').prop('checked', false);

	}
}


//gestione cookie per preferenza velocità
function initCookie() {

	var cookieVel = $.cookie('velPref');

	if(cookieVel==null) {
		setVelocita();
	} else {
		setVelocita(cookieVel);
	}

	//imposto il bottone per il cambio
	$('#setVelocita').click(btnVelocita);
}

//cambio velocità preferenza
function btnVelocita() {
	var velocita = $('#velocita').val();

	if (!isNaN(velocita) && velocita > 0 && velocita < 100) {
		//1. disabilito i bottoni
		$('#velocita').attr('disabled', 'disabled');
		$('#setVelocita').attr('disabled', 'disabled');

		//2. visualizzo il messaggio
		$('#piede #preference').append('<p class="msg wait">ricalcolo</p>');
		$('#piede #preference p.msg.wait').hide().fadeIn();



		//3. imposto la velocita
		setVelocita(velocita);

		//4. imposto il cookie
		$.cookie('velPref', velocita, { expires: 36500 });

		//5. riabilito i pulsanti
		setTimeout(abilitaBtnPreferenze, 1500);
	} else {
		$('#velocita').attr('disabled', 'disabled');
		$('#setVelocita').attr('disabled', 'disabled');
		$('#piede #preference').append('<p class="msg error">valore non valido</p>');
		$('#piede #preference p.msg.error').hide().fadeIn().delay(1500).fadeOut(function() {	this.remove();
																																													$('#velocita').removeAttr('disabled');
																																													$('#setVelocita').removeAttr('disabled');

																																													//carico il cookie o il valore di default
																																													var velocitaSdt = $.cookie('velPref');

																																													if (velocitaSdt == null || isNaN(velocitaSdt)) {
																																														$('#velocita').val(8);
																																													} else {
																																															$('#velocita').val(velocitaSdt);
																																													}
																																												});

	}
}

// messaggio preferenza e abilitazione pulsanti
function abilitaBtnPreferenze() {
	$('#piede #preference p.msg').replaceWith('<p class="msg ok">salvato</p>');
	$('#piede #preference p.msg.ok').delay(1500).fadeOut(function() {
																				this.remove();
																				$('#velocita').removeAttr('disabled');
																				$('#setVelocita').removeAttr('disabled');
																			});
}

//funzione per impostare e calcolare il tempo del percorso in base della velocità
function setVelocita(vel) {
	var velocitaDaUsare = 0;
	if ((isNaN(vel) || vel==null) || vel<1 || vel> 99)   {
		//velocità di default
		velocitaDaUsare = 8;
	} else {
		//velocità carcata da cookie
		velocitaDaUsare = vel;

	}

	//funzione di calcolo della velocità
	var campi = $('.row.dettagli .col-md-6:nth-child(2) strong, #dettagli #tempo strong');
	var lunghezza = $('.lunghezza strong');

	for (var i = 0; i<lunghezza.length; i++) {
		var secondi = (parseInt($(lunghezza[i]).text())/velocitaDaUsare)*60*60;


		 var hours   = Math.floor(secondi / 3600);
		var minutes = Math.floor((secondi - (hours * 3600)) / 60);
		var seconds = Math.ceil(secondi - (hours * 3600) - (minutes * 60));

		if(hours<10) {hours = '0'+hours};
		if(minutes<10) {minutes = '0'+minutes};
		if (seconds<10) {seconds = '0'+seconds};

		$(campi[i]).text(hours+":"+minutes+":"+seconds);
	}

	//imposto le preferenze con il numero corretto
	$('#velocita').val(velocitaDaUsare);

}
//gps attivo
var gpsAPI = false
//gestione mappa home
var mapHome;

//posizione verona centro
var latDefault = 45.43838419999999;
var lngDefault = 10.991621500000065;

//finestra aperta
var infoWindowOpen = null;

//memorizzare il centro della mappa per il resize;
var centroMappa = null;

		 function initMapHome() {
				if (navigator.geolocation) {
				     navigator.geolocation.getCurrentPosition(setLatLngDefault, fallbackMap);
				} else {
					setMapHome();
				}
		 }

		function setLatLngDefault(position) {
			 latDefault = position.coords.latitude;
			 lngDefault = position.coords.longitude;
			 gpsAPI = true;
			 setMapHome();
		 }

		 function fallbackMap() {
			 setMapHome();
			}

		 function setMapHome() {
			 mapHome = new google.maps.Map(document.getElementById('map'), {
																			center: {lat: latDefault, lng: lngDefault},
																			zoom: 13,
																			streetViewControl: false,
																			fullscreenControl: false,
																			mapTypeControl: false,
																			styles: 	[
																									   {
																									     featureType: "poi.business",
																									     stylers: [
																									      { visibility: "off" }
																									     ]
																										 },
																										 {
																									     featureType: "poi.sports_complex",
																									     stylers: [
																									      { visibility: "off" }
																									     ]
																										 }

																									]

																		});




																		//marker esempi chiamata ajax
																		$.getJSON('/private/api/json/all/')
																							.done(function(data) {
																									if(data['error']==true) {
																										$("#map").hide()
																										return;
																									}
																									var bounds = new google.maps.LatLngBounds();

																									$.each(data, function(key,val) {
																										addMarkerNoLabel(mapHome,val['coordinates'][0][0],val['coordinates'][0][1], val['scheda'],val['categoria'][0]['title'], val['_id'],val['categoria'][0]['_id'])
																										bounds.extend(new google.maps.LatLng(val['coordinates'][0][0],val['coordinates'][0][1]));
																									})

																									//se l'api è attiva ricalcolo il ridimensionamento
																									if(gpsAPI==true) {
																										bounds.extend(new google.maps.LatLng(latDefault,lngDefault));
																									}

																									//autozoom mappa
 																								 mapHome.fitBounds(bounds);

																								 //mermorizzo il centro della centroMappa
																								 	centroMappa = mapHome.getCenter();

																								 //imposto lazione di ricentraggio della mappa in caso di resize
																								addEventCentroMappa()

																							})
																							.fail(function(data) {
																									//in caso di errore nascondo la mappa
																									$("#map").hide()
																							})


				//se l'api gps è stata attivata inserisco l'omino e calcolo le distanze dal punto
				if(gpsAPI==true) {
				//	addMarker(mapHome,latDefault,lngDefault,null,10,null)


						var img = pinMarker(10);

						var marker = new google.maps.Marker({
							position: {lat: latDefault, lng: lngDefault},
							map: mapHome,
							icon: img,
							clickable: false
						});

						//carico gli articoli centralli
						var articoli = $("article.percorso");
						$.each(articoli, function(key,value) {
								var latArticolo = $(value).data("lat");
								var lngArticolo = $(value).data("lng");

								var distanza = definisciDistanzePercorsoGPS(latDefault,lngDefault,latArticolo,lngArticolo)

								var areaHtml = $(value).find("section div.row div.col-md-9")
								$('<br/><span class="gps-txt"><img src="/images/gps-small.png" alt="gps"/> '+distanza+' Km</span>').appendTo(areaHtml)
						})

						//rimuovo il margine inferiore alla header
						$("#percorsi article.row > div header").css("margin-bottom","0px");

				}


		 }
//calcolo distanze gps

function definisciDistanzePercorsoGPS(latA,lngA, latB,lngB) {


			var latArad = (latA*2*Math.PI)/360;
			var lngArad= (lngA*2*Math.PI)/360;
			var latBrad= (latB*2*Math.PI)/360;
			var lngBrad= (lngB*2*Math.PI)/360;;

			var distanza = 6372.795477598 * Math.acos(Math.sin(latArad)*Math.sin(latBrad)+Math.cos(latArad)*Math.cos(latBrad)*Math.cos(lngArad-lngBrad))
 			var distanzaRound = (Math.round(distanza*10)/10)

			return distanzaRound

}
			//immagine pin
		 function pinMarker(type) {
			 var img
			 switch (type) {
			 case 1:
					 img='pinstar.png'
				 break;
				case 2:
							img='pinTappa.png'
				break;
				case 3:
							img='strada-dissestata.png'
				break;
				case 4:
							img='traffico.png'
				break;
				case 5:
							img='chiuso-per-lavori.png'
				break;
				case 6:
						img='pericolo.png'
				break;
				case 7:
						img='errore-mappa.png'
				break;
				case 8:
						img='parcheggio.png'
				break;
				case 9:
						img='bar.png'
				break;
				case 10:
						img='gps.png'
				break;
			 default:
					 img='pinhome.png'
			}
			var url = 'https://bikeaway.herokuapp.com/images/'+img;
			return url;
		 }


		 function addMarker(map,lat,lng,nometappa, type,n) {
			 var img = pinMarker(type);


			 var marker = new google.maps.Marker({
					 position: {lat: lat, lng: lng},
					 map: map,
					 label: {text: " ", color:'white'},
					 icon: img,
					 clickable: true
				 });

				 marker.label.text = n

				 var infowindow = new google.maps.InfoWindow({
						content: '<h6 class="titlemap">'+nometappa+'</h6><p class="tagsmap"><a href="#" onclick="apriCommentidaTappa(event,'+n+')"><img src="/images/triangolo.png" alt="vai ai commenti"/> Commenta</a></p>'
  				});

					marker.addListener('click', function() {
 																				 //chiudo eventuali finestre aperte
 																							if (infoWindowOpen) {
 																								infoWindowOpen.close();
 																						 }
 																	 infowindow.open(map, marker);
 																	 infoWindowOpen = infowindow;
 																 });


		 }
		 function addMarkerNoLabel(map,lat,lng,scheda, titleCat,schedaId, catId) {


			 var img = pinMarker(type);

			var marker = new google.maps.Marker({
					position: {lat: lat, lng: lng},
					map: map,
					icon: img,
					clickable: true
				});

			var difficoltaHTML = "";
			for (var i = 1; i<=3;i++) {
					if (i<=scheda['difficolta']) {
						difficoltaHTML +="<span class=\"full\"></span>"
					} else {
						difficoltaHTML += "<span></span>"
					}
			}
				var infowindow = new google.maps.InfoWindow({
					content: '<h6 class="titlemap"><a href="/'+catId+'/'+schedaId+'">'+scheda['title']+'</a></h6><p class="textmap">Lunghezza <strong>'+scheda['lunghezza']+' Km</strong></p><p class="textmap">Difficoltà '+difficoltaHTML+'</p><p class="textmap">Strada <strong>'+scheda['strada']+'</strong></p><p class="textmap">Pendenza <strong>'+scheda['pendenza']+'%</strong></p><p class="tagsmap"><a href="/'+ catId+'"><span class="glyphicon glyphicon-tags" aria-hidden="true"></span> '+titleCat+'</a></p>'
				 });

			 marker.addListener('click', function() {
																			 //chiudo eventuali finestre aperte
																						if (infoWindowOpen) {
																							infoWindowOpen.close();
																					 }
																 infowindow.open(map, marker);
																 infoWindowOpen = infowindow;
															 });

				return marker;
		}





		 /********* category map *****/
		 //variabile globale per i filitri
		 var pinMapCategory = [];

		 function initMapCategory() {



			var idcategory = window.location.pathname;
			var search = window.location.search;
			 idcategory = idcategory.replace("/","");

			 var url = '/private/api/json/category/'+idcategory

			 if(idcategory == "cerca") {
				 	url = "/private/api/json/cerca/"+search
			 }


			 mapHome = new google.maps.Map(document.getElementById('map'), {
																		 center: {lat: latDefault, lng: lngDefault},
																		 zoom: 15,
																		 streetViewControl: false,
																		 fullscreenControl: false,
																		 mapTypeControl: false,
																		 styles: 	[
																										{
																											featureType: "poi.business",
																											stylers: [
																											 { visibility: "off" }
																											]
																										},
																										{
																											featureType: "poi.sports_complex",
																											stylers: [
																											 { visibility: "off" }
																											]
																										}

																								 ]

																	 });


																	 $.getJSON(url)
																						 .done(function(data) {

																								 if(data['error']==true) {
																									 $("#map").hide()
																									 return;
																								 }

																								 var bounds = new google.maps.LatLngBounds();


																								 $.each(data, function(key,val) {
																									 pinMapCategory[val['_id']] = (addMarkerNoLabel(mapHome,val['coordinates'][0][0],val['coordinates'][0][1], val['scheda'],val['categoria'][0]['title'], val['_id'],val['categoria'][0]['_id']))
																									 bounds.extend(new google.maps.LatLng(val['coordinates'][0][0],val['coordinates'][0][1]));

																								 })

																								 //con un solo risultato non faccio l'autozoom
																								 if (data.length > 1) {
																								 //autozoom mappa
																									mapHome.fitBounds(bounds);
																								} else {
																									mapHome.setCenter(new google.maps.LatLng(data[0]['coordinates'][0][0],data[0]['coordinates'][0][1]))
																								}
																								 //mermorizzo il centro della centroMappa
																								 centroMappa = mapHome.getCenter();

																								 //imposto lazione di ricentraggio della mappa in caso di resize
																							 	addEventCentroMappa()



																								//controllo se è attivo il gps
																								if (navigator.geolocation) {
																										navigator.geolocation.getCurrentPosition(visualizzaGPScategory);
																								}

																								//controllo gli articoli visibili e tolgo i pin degli articoli non visibi
																								//serve quando si carica la pagina con filtri attivati
																								var articoli = $("#result article:hidden")
																								if(articoli.length>0) {
																													$.each(articoli, function(key,value) {
																														var id = $(value).data("id");
																															pinMapCategory[id].setMap(null)

																													})
																								}



																						 })
																						 .fail(function(data) {
																								 //in caso di errore nascondo la mappa
																								 $("#map").hide()
																						 })


		 }



		function initCategory() {
			var btnfiltri = $('#filter button');
			var order = $('#order #orderInput');

			btnfiltri.click(gestisciFiltri);
			order.change(attivaOrdinamento);

			//verifico se ci sono dei filtri url attivi
			attivaFiltriOnLoad()

		}

		//carico altitutide e longitudine del gps
		//attivo il flag globale su si gps
		function visualizzaGPScategory(position) {
			latDefault = position.coords.latitude;
			lngDefault = position.coords.longitude;
			gpsAPI = true;

			//se il gps è attivo metto il pin gps e calcolo le distanze dei percorsi
					var img = pinMarker(10);

					var marker = new google.maps.Marker({
						position: {lat: latDefault, lng: lngDefault},
						map: mapHome,
						icon: img,
						clickable: false
					});

					//carico gli articoli centralli
					var articoli = $("article.percorso");
					$.each(articoli, function(key,value) {
							var latArticolo = $(value).data("lat");
							var lngArticolo = $(value).data("lng");

							var distanza = definisciDistanzePercorsoGPS(latDefault,lngDefault,latArticolo,lngArticolo)

							var areaHtml = $(value).find("section div.row div.col-md-9")
							$('<br/><span class="gps-txt"><img src="/images/gps-small.png" alt="gps"/> '+distanza+' Km</span>').appendTo(areaHtml)
					})

					//attivo due nuove modalità di orginamento
					$('<option value="6">Vicinanza Crescente</option>').appendTo("#orderInput")
					$('<option value="7">Vicinanza Decrescente</option>').appendTo("#orderInput")



		}

		function attivaFiltriOnLoad() {
			var queryRaw = window.location.search.substring(1);
			var queryObj = null;
			var flagLauch = false

			var inputLung = $("#lung");
			var inputPend = $("#pend");
			var selectStrada = $("#type");
			var selectDifficolta = $("#diff");
			var inputCheckbox = $("#filter input[type='checkbox']");


			if (queryRaw.length>0 && queryRaw.indexOf("=")>-1) {
					queryObj = $.parseJSON('{"' + decodeURI(queryRaw).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
			}


			if (queryObj!= null && queryObj.lung!=null && !isNaN(parseFloat(queryObj.lung)) && parseFloat(queryObj.lung) != 0) {
				inputLung.val(parseFloat(queryObj.lung))
				flagLauch = true
			}


			if (queryObj!= null && queryObj.pend!=null && !isNaN(parseFloat(queryObj.pend))) {
				inputPend.val(parseFloat(queryObj.pend))
				flagLauch = true
			}

			if (queryObj!= null && queryObj.type!=null && !isNaN(parseFloat(queryObj.type)) && parseFloat(queryObj.type) >=0 && parseFloat(queryObj.type)<= 4) {
				selectStrada.val(parseFloat(queryObj.type))
				flagLauch = true
			}

			if (queryObj!= null && queryObj.diff!=null && !isNaN(parseFloat(queryObj.diff)) && parseFloat(queryObj.diff) >=0 && parseFloat(queryObj.diff)<= 3) {
				selectDifficolta.val(parseFloat(queryObj.diff))
				flagLauch = true
			}

			if (queryObj!= null && queryObj.bambini!=null && !isNaN(parseFloat(queryObj.bambini)) && parseFloat(queryObj.bambini)== 1) {
				$(inputCheckbox[0]).prop('checked', true);
				flagLauch = true
			}

			if (flagLauch==true) {
				attivaFiltro()
			}
		}

		function attivaOrdinamento(e) {
			var obj = $(e.target)
			var articoli = $("#result article");


			//rimuovo gli articoli
			$('#result div article').remove()


			var fsort = funzioneSort(obj.val());

			//funzione di sort
			articoli.sort(fsort)


			//isnerisco gli articoli
			//$('#result div').html(articoli);
			$(articoli).appendTo("#result div")
			}

//0 alfabetico Crescente
//1 alfabetico decrescente
//2 distanza Crescente
//3 distanza decrescente
//4 difficolta Crescente
//5 difficolta Decrescente
function funzioneSort(type) {
	var freturn;

	type= Number(type)

	switch (type) {
		case 0:
						freturn=function(a,b) {
							var tita = $(a).find("h3").text();
							var titb = $(b).find("h3").text();

							if (tita >= titb) {
								return 1
							} else {
								return -1
							}
						}
		break;
		case 1:
						freturn=function(a,b) {
							var tita = $(a).find("h3").text();
							var titb = $(b).find("h3").text();

							if (tita <= titb) {
								return 1
							} else {
								return -1
							}
						}
		break;
		case 2:
					freturn=function(a,b) {

						var datia = $(a).find("section strong");
						var datib = $(b).find("section strong");

						var lungha = parseFloat($(datia[0]).text())
						var lunghb = parseFloat($(datib[0]).text())

						if (lungha >= lunghb) {
							return 1
						} else {
							return -1
						}
					}
			break;
			case 3:
						freturn=function(a,b) {
							var datia = $(a).find("section strong");
							var datib = $(b).find("section strong");

							var lungha = parseFloat($(datia[0]).text())
							var lunghb = parseFloat($(datib[0]).text())

							if (lungha >= lunghb) {
								return -1
							} else {
								return 1
							}
						}
				break;
			case 4:
						freturn=function(a,b) {
							var datia = $(a).find("span.full");
							var datib = $(b).find("span.full");

							if (datia.length >= datib.length) {
								return 1
							}  else {
								return -1
							}
						}
				break;
				case 5:
							freturn=function(a,b) {
								var datia = $(a).find("span.full");
								var datib = $(b).find("span.full");

								if (datia.length < datib.length) {
									return 1
								} else {
									return -1
								}
							}
					break;
					case 6:
								freturn=function(a,b) {
									var datia = $(a).find("section div.row div.col-md-9 span.gps-txt");
									var datib = $(b).find("section div.row div.col-md-9 span.gps-txt");

									var distA = parseFloat($(datia).text())
									var distB = parseFloat($(datib).text())

									if (distA < distB) {
										return -1
									} else {
										return 1
									}
								}
						break;

						case 7:
									freturn=function(a,b) {
										var datia = $(a).find("section div.row div.col-md-9 span.gps-txt");
										var datib = $(b).find("section div.row div.col-md-9 span.gps-txt");

										var distA = parseFloat($(datia).text())
										var distB = parseFloat($(datib).text())

										if (distA < distB) {
											return 1
										} else {
											return -1
										}
									}
							break;

	}

	return freturn
}

		function gestisciFiltri() {
			var queryRaw = window.location.search.substring(1);
			var queryObj = null;

			var inputLung = $("#lung");
			var inputPend = $("#pend");
			var selectStrada = $("#type");
			var selectDifficolta = $("#diff");
			var inputCheckbox = $("#filter input[type='checkbox']");

			if (queryRaw.length>0 && queryRaw.indexOf("=")>-1) {
					queryObj = $.parseJSON('{"' + decodeURI(queryRaw).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
			}

			if(queryObj!= null) {

				if (queryObj.lung != inputLung.val() && inputLung.val().trim() != '') { {
						queryObj.lung =inputLung.val().trim();

				} } else if ((inputLung.val().trim() == '' || inputLung.val() == null) && queryObj.lung != null) {
					delete queryObj.lung;
				}

				if (queryObj.pend != inputPend.val() && inputPend.val().trim() != '') {
						queryObj.pend =inputPend.val().trim();

				} else if ((inputPend.val().trim() == '' || inputPend.val() == null) && queryObj.pend != null) {
					delete queryObj.pend;
				}

				if (queryObj.type != selectStrada.val()) {
						queryObj.type =selectStrada.val().trim();
				}

				if (queryObj.diff != selectDifficolta.val()) {
						queryObj.diff =selectDifficolta.val().trim();
				}

				switch (inputCheckbox[0].checked) {
					case true:
							queryObj.bambini=1;
						break;
					case false:
						queryObj.bambini=0;
					break;
				}

			}else {

				queryObj = new Object();

				if (inputLung.val().trim().length>0) {
						queryObj.lung = inputLung.val().trim();
				}

				if (inputPend.val().trim().length>0) {
						queryObj.pend = inputPend.val().trim();
				}
					queryObj.type = selectStrada.val();
					queryObj.diff = selectDifficolta.val();

				if (inputCheckbox[0].checked) {
					queryObj.bambini = 1;
				} else {
					queryObj.bambini = 0;
				}
			}

			//cambio url
			window.history.pushState({}, window.document.title, "?"+$.param(queryObj));

			attivaFiltro();

			//se è un cell attivare lo scroll fino a result
			if (windowMobile()) {
				$('html, body').animate({
						 scrollTop:  $('#result').offset().top
				 }, 500);
			}
		}



function attivaFiltro() {
	var inputLung = $("#lung");
	var inputPend = $("#pend");
	var selectStrada = $("#type");
	var selectDifficolta = $("#diff");
	var inputCheckbox = $("#filter input[type='checkbox']");

	var inputLungVal = parseFloat(inputLung.val());
	var inputPendVal = parseFloat(inputPend.val())

	var articoli = $("#result article");
	var nArticoli = $("#result article").length

	//1 visualizza tutti i percorsi
	articoli.show();

	//visualizzo tutti i pin, controlalndo che siano stati caricati
	$.each(articoli, function(key,value) {
		var id = $(value).data("id");
		if (pinMapCategory[id] != undefined) {
			pinMapCategory[id].setMap(mapHome)
		}
	})


	// rimuovo eventuali messaggi precedenti
	$("#msgResult").remove()

	if (!isNaN(inputLungVal)) {
		$.each(articoli, function(key, value) {
						var strongArticoli = $(value).find("section strong");
						var lunghezza = parseFloat($(strongArticoli[0]).text())

						if (lunghezza > inputLungVal ) {
							$(value).hide();
						}


		})
	}

	//2 ricarico glli articoli visibili
	articoli = $("#result article:visible");

	if (!isNaN(inputPendVal)) {
		$.each(articoli, function(key, value) {
						var strongArticoli = $(value).find("section strong");
						var pendenza = parseFloat($(strongArticoli[2]).text())

						if (pendenza > inputPendVal) {
							$(value).hide();
						}


		})
	}

	//3 ricarico gli articoli visibili
	articoli = $("#result article:visible");
	var tipoStrada = ["", "asfalto", "terra", "ghiaia", "misto"]

	if (selectStrada.val()!=0) {
		$.each(articoli, function(key, value) {
						var strongArticoli = $(value).find("section strong");
						var strada = $(strongArticoli[3]).text().trim()

						if (strada != tipoStrada[selectStrada.val()]) {
							$(value).hide();
						}


		})
	}

	//4 ricarico gli articoli visibili
	articoli = $("#result article:visible");
	var difficolta = [0, 1,2,3];

	if (selectDifficolta.val()!=0) {
		$.each(articoli, function(key, value) {
						var diff = $(value).find("span.full");

						if (diff.length!=selectDifficolta.val()) {
							$(value).hide();
						}


		})
	}

	//5 ricarico gli articoli visibili
	articoli = $("#result article:visible");

	if(inputCheckbox[0].checked) {
		$.each(articoli, function(key, value) {
						var bambini = $(value).data("bambini");

						if (bambini!=true) {
							$(value).hide();
						}
		})
	}

	var nArticoliVisibili = $("#result article:visible").length

	if(nArticoli-nArticoliVisibili==nArticoli && nArticoli>0) {
		var a = $("#result div.row:nth-child(1)");
		$("<div id=\"msgResult\" class=\"col-md-12\"><h2>Nessun risultato per i filtri impostati</h2></div>").prependTo(a[0]);

		articoli = $("#result article");
		//nascondere tutti i pin della mappa
		$.each(articoli, function(key,value) {
			var id = $(value).data("id");
			pinMapCategory[id].setMap(null)
		})
		return;
	}

	//carico gli id degli articoli non visibili e li nascondo nella mappa
	var nArticoliNonVisibili = $("#result article:hidden");

	$.each(nArticoliNonVisibili, function(key, value) {
			var id = $(value).data("id");
			pinMapCategory[id].setMap(null);
	})


}
//******* scheda *******//
		function initScheda() {

			$('#commenti #menu2 a').click(campiCommento);

			//nascondo i campi input
			$('#commenti #areaInserimento').hide();

			//azione per l'invio del campiCommento
			$('#commenti #areaInserimento input[value="inserisci"]').click(inserisciCommento);



			//carico gli alert
			retriveAlert()

			//carico i attivita
			retriveAttivita()

		}

		function campiCommento(e) {
			e.preventDefault();
			var area = $('#commenti #areaInserimento')
			var bottone = $('#commenti #menu2 a')

			if(area.css("display")!="none") {
				bottone.text("Inserisci commento")

			} else {
				bottone.text("Chiudi area commenti")


			}

			$('#commenti #areaInserimento').slideToggle();
		}

		function inserisciCommento(e) {
			var form = $("form")

			//verifico la validità del form tramite funzioni browser
			if(form[0].checkValidity() === false) {
      		return ;
    	}

			e.preventDefault()

			var url = (window.location.pathname).split("/")
			var idPercorso = url[url.length-1];

			var autore = $("#commenti #areaInserimento #nome").val();
			var mail = $("#commenti #areaInserimento #email").val();
			var commento = $("#commenti #areaInserimento #commento").val();
			var tappa = $("#commenti #areaInserimento #typec").val();

			//disabilito il pulsante
			$("#areaInserimento form input[type='submit']").attr('disabled','disabled');

			//attivo il messaggio di attesa
			$('#areaInserimento form').append('<div class="col-md-12"><p class="msg wait">Inserimento in corso</p></div>');
			$('#areaInserimento form p.msg').hide().fadeIn();

			$.post("/private/api/json/commento/upload", {_idPercorso: idPercorso, autore: autore, mail: mail, commento: commento, tappa: tappa}, "json" )
						.done(function(data) {

								var txt
								var classe

								switch(data.code) {
									case 1:
										txt = "I dati inseriti non sono validi.";
										classe ="error";
									break;
									case 2:
										txt = "Ci dispiace ma per noi il tuo messaggio è SPAM.";
										classe ="error";
									break;
									case 3:
										txt = "Grazie, il messaggio è stato inserito correttamente.";
										classe ="ok";
									break;
									default:
										txt = "Abbiamo riscontrato un errore. Cercheremo di risolverlo il prima possibile.";
										classe ="error";
								}

									chiusuraCommenti(classe,txt, function() {

										//aggiornare la paginazione + inserire il commento
										if (data.code==3) {
											allComments.unshift({"data": new Date(Date.now()), "autore": autore, "commento": commento, "tappa":tappa})
										}


										//imposto la visualizzazione su tutti
										$('#commentType').val(-1)
										filtraCommentiChange(e)


									})

						})
						.fail(function(data) {
								chiusuraCommenti("error", "Abbiamo riscontrato un errore. Cercheremo di risolverlo il prima possibile.",null);
						})


		}

function chiusuraCommenti(classe, txt, callback) {
	$('#areaInserimento form p.msg').replaceWith('<p class="msg '+classe+'">'+txt+'</p>');
	$('#commenti #areaInserimento').delay(1500).slideToggle();
	$('#areaInserimento form p.msg').delay(1500).fadeOut(function() {
																				this.remove();
																				//abilito il pulsante
																				$("#areaInserimento form input[type='submit']").removeAttr('disabled');

																				//pulisco i campi
																				var autore = $("#commenti #areaInserimento #nome").val("");
																				var mail = $("#commenti #areaInserimento #email").val("");
																				var commento = $("#commenti #areaInserimento #commento").val("");
																				var tappa = $("#commenti #areaInserimento #typec").val(0);
																				callback()
																				});


}

function apriCommentidaTappa(e,n) {
	e.preventDefault();

	//scrollTo areaInserimento
	$('html, body').animate({
			 scrollTop:  $('#commenti header').offset().top
	 }, 500);

	//apro l'area commenti
	if ($("#areaInserimento").css('display') == "none") {
		$("#commenti #menu2 a").click()
	}
	//imposto la tappa di inserimento
	$('#commenti #areaInserimento #typec').val(n);

	//visualizzao solo i commenti di quella tappa
	$('#commentType').val(n).change();


}


var directionsDisplay;
var directionsService;
var allComments = [];
var paginazioneObj = null;

function initMapScheda() {
	var url = window.location.pathname ;


	//carico i dati della schedaId
	$.getJSON('/private/api/json'+url)
						.done(function(data) {

								if(data['error']==true) {
									$("#map").hide()
									$("#other-pins").hide()
									return;
								}

								directionsDisplay = new google.maps.DirectionsRenderer();
								directionsService = new google.maps.DirectionsService();

								mapHome = new google.maps.Map(document.getElementById('map'), {
																							center: {lat: data[0]['coordinates'][0][0], lng: data[0]['coordinates'][0][1]},
																							zoom: 12,
																							streetViewControl: false,
																							fullscreenControl: false,
																							mapTypeControl: false,
																							styles: 	[
																														 {
																															 featureType: "poi.business",
																															 stylers: [
																																{ visibility: "off" }
																															 ]
																														 },
																														 {
																															 featureType: "poi.sports_complex",
																															 stylers: [
																																{ visibility: "off" }
																															 ]
																														 }

																													]

																						});

								//layer bici
								var bikeLayer = new google.maps.BicyclingLayer();
								bikeLayer.setMap(mapHome);

								//bounds per autozoom
								var bounds = new google.maps.LatLngBounds();

								var wayout = []
								var tappa = 1;

								$.each(data[0]['coordinates'], function(key,value) {


									if (data[0]['scheda']['tappe'][key][0] == true) {
										addMarker(mapHome,value[0],value[1],data[0]['scheda']['tappe'][key][1],2,tappa);
										bounds.extend(new google.maps.LatLng(value[0],value[1]));

										wayout.push({
																location: new google.maps.LatLng({lat: value[0], lng: value[1]}),
																stopover: true

																})

										tappa++;
									} else  {

										/*addMarker(mapHome,value[0],value[1],data[0]['scheda']['tappe'][key][1],2,tappa);
										tappa++*/


										wayout.push({
																location: new google.maps.LatLng({lat: value[0], lng: value[1]}),
																stopover: false
																})
									}

									})

										//autozoom
										 mapHome.fitBounds(bounds);

										 //inizializzo il percorso
										 directionsDisplay.setMap(mapHome);

										 var start = wayout[0]['location'];
									 	var end =wayout[wayout.length-1]['location'];

									 	var request = {
									 		 origin: start,
									 		 destination: end,
									 		 travelMode: 'WALKING', //DRIVING
									 		 unitSystem: google.maps.UnitSystem.METRIC,
									 		 waypoints: wayout,
									 			optimizeWaypoints: false,
									 			provideRouteAlternatives: false,
									 			avoidHighways: true,
									 			avoidTolls: true
									 	 };


										 directionsService.route(request, function(result, status) {
											 //fare uno switch con gli altri status
										  if (status == 'OK') {
												directionsDisplay.setOptions( {
																												suppressMarkers: true,
																												polylineOptions: {strokeColor: '#ffb839',strokeWeight:'6',strokeOpacity: 0.7, clickable: true}

																												}

																											 );
												//test polyline
												var pol = result.routes[0].overview_polyline

												var flightPath = new google.maps.Polyline({
									          path: google.maps.geometry.encoding.decodePath(pol),
									          geodesic: true,
									          strokeColor: '#ffb839',
									          strokeOpacity: 0.7,
									          strokeWeight: 7
									        });

									        flightPath.setMap(mapHome);

													flightPath.addListener("click", function(event) {

																																					var infowindow = new google.maps.InfoWindow({
																																																											 content: "<h6 class=\"titlemap\"><strong>Segnalazione</strong></h6><p class=\"textmap\"><a href=\"#\" onclick=\"insertAvviso(event,1,"+event.latLng.lat()+","+event.latLng.lng()+")\"><img src=\"/images/strada-dissestata.png\" alt=\"strada dissestata\" /> Strada dissestata</a><br/><a href=\"#\" onclick=\"insertAvviso(event,2,"+event.latLng.lat()+","+event.latLng.lng()+")\"><img src=\"/images/traffico.png\" alt=\"traffico\" /> Zona trafficata</a><br/><a href=\"#\" onclick=\"insertAvviso(event,3,"+event.latLng.lat()+","+event.latLng.lng()+")\"><img src=\"/images/chiuso-per-lavori.png\" alt=\"chiuso per lavori\" /> Chiuso per lavori</a><br/><a href=\"#\" onclick=\"insertAvviso(event,4,"+event.latLng.lat()+","+event.latLng.lng()+")\"><img src=\"/images/pericolo.png\" alt=\"strada pericolo\" /> Pericolo</a><br/><a href=\"#\" onclick=\"insertAvviso(event,5,"+event.latLng.lat()+","+event.latLng.lng()+")\"><img src=\"/images/errore-mappa.png\" alt=\"errore mappa\" /> Errore mappa</a><p>"
																																																										 });
																																					if (infoWindowOpen) {
																																						infoWindowOpen.close()
																																					}
																																					infowindow.setPosition(event.latLng)
																																					infowindow.open(mapHome);

																																					infoWindowOpen = infowindow

																																		})



													//mermorizzo il centro della centroMappa
													centroMappa = mapHome.getCenter();

													//imposto lazione di ricentraggio della mappa in caso di resize
												 addEventCentroMappa()


												 //controllo se è attivo il gps
												 //controllo se è attivo il gps
													if (navigator.geolocation) {
															navigator.geolocation.getCurrentPosition(visualizzaGPSscheda);
													}



												 //da elimminare
												 /*mapHome.addListener('click', function(event) {

																							 alert(event.latLng.lat()+" "+event.latLng.lng());

																			 });
																			 */
												//se cambiano i confini vengono ricaricati gli annunci
												mapHome.addListener('bounds_changed', function(event) {
																						//nascondo gli Annunci
																					//	$('#base-annunci').fadeOut(function() {

																							//ricarico gli annunci
																							retriveAnnunciScheda(mapHome.getBounds())
																					//	})
																			})

												retriveAnnunciScheda(mapHome.getBounds())
									    }
									});





						})
						.fail(function(data) {
								//in caso di errore nascondo la mappa
								$("#map").hide()
								$("#other-pins").hide()
						})


		var slagPercorso = url.split("/")
		//carico i dati dei commenti
		$.getJSON("/private/api/json/commenti/"+slagPercorso[2])
							.done(function(data) {

									var listaCommenti = $("#listacommenti")


									if(data['error']==true || data['commenti']==0) {
										listaCommenti.append('<article class="col-sm-12 corpo-commento"><p><strong>Nessun commento inserito</strong></p></article>');
										return
									}

									//metto i commenti in una variabile globale
									allComments = data;

									//attivaizone della paginazione
									var containerPag = $('#paginazione');
									var dataContainer = $('#listacommenti');


									containerPag.pagination({
									    dataSource: allComments,
											pageSize: 10,
											callback: function(data, pagination) {
																														 // template method of yourself
																														 var html = formattazioneCommento2(data);
																														 dataContainer.html(html);
																												 }
									});


									paginazioneObj = containerPag

									//filtro commenti
									$('#commenti #menu1 select').change(filtraCommentiChange);

									//verifico l'altezza del contenitore dei commenti e lo imposto come altezza minima
									dataContainer.css('min-height',dataContainer.height());
									var listacommenti = $("#listacommenti");
									containerPag.css('min-height',containerPag.height());




							})

}

function visualizzaGPSscheda(position) {
	latGPS = position.coords.latitude;
	lngGPS = position.coords.longitude;

	//se il gps è attivo metto il pin gps e calcolo le distanze dei percorsi
			var img = pinMarker(10);

			var marker = new google.maps.Marker({
				position: {lat: latGPS, lng: lngGPS},
				map: mapHome,
				icon: img,
				clickable: false
			});



		var scheda = $("#content")
		var distanza = definisciDistanzePercorsoGPS(latGPS,lngGPS,scheda.data("lat"),scheda.data("lng"))
					var areaHtml = $("#content #dettagli")
					$('<div class="col-sm-3" style="color:#DC493C;"><img src="/images/gps-small.png" alt="gps"/> '+distanza+' Km</div>').appendTo(areaHtml)


}

function filtraCommentiChange(e) {
	var dd = $("#commentType");
	var scelta = parseInt(dd.val());

	var containerPag = $('#paginazione');
	var dataContainer = $('#listacommenti');
	var articoli =$("#listacommenti article")
	dataContainer.fadeOut(100, function() {

																//nascondo tutti i commenti e poi li distruggo
																articoli.remove()

																if (paginazioneObj != null) {
																	//distruggo la vecchia paginazione
																	paginazioneObj.pagination('destroy')
																}

																//pulisco la sorgetnte dati di paginazione
																var result = [];
																$.each(allComments,function(key,value) {
																		if (scelta==value['tappa'] || scelta == -1) {
																			result.push(value)
																		}
																})

																if (result.length>0) {
																		containerPag.pagination({
																				dataSource: result,
																				pageSize: 10,
																				callback: function(data, pagination) {
																																							 // template method of yourself
																																							 var html = formattazioneCommento2(data);
																																							 dataContainer.html(html);
																																					 },
																		});

																		//salvo nel globale la nuova paginazioneObj
																		paginazioneObj = containerPag
																} else {
																		var txt = "per la <strong>tappa " + scelta+"</strong>";

																		if (scelta == 0) {
																			 txt = "<strong>Generale</strong>"
																		}

																		dataContainer.append('<article class="col-sm-9 corpo-commento"><p>Nessun commento '+txt+'</p></article>')

																}

															 dataContainer.fadeIn(100);
			})

}

function formattazioneCommento2(data) {
	var html = "";

	$.each(data, function(key,value) {
			html+=formattazioneCommento(value['data'],value['autore'],value['commento'],value['tappa'])
	})

	return html
}

function formattazioneCommento(data,autore,commento,tappa) {
	var html = "";
	var d = new Date(data);

	html += '<article class="col-sm-9 corpo-commento">';

	if (tappa > 0) {
		html += '<div class="tappa">'+tappa+'</div>'
	}

	html += '<p>'+d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear()+' | <strong>'+autore+'</strong><br/>'+commento+'</p>'

	html += '</article>';

	return html;
}

//******************************* GESTIONE ALERT **************************/
//array con maker di google maps
var alertMarker = [];
//dati raw
var alertCollection = null;
//N alert
var nAlert = 0

//inserisco un alert
function insertAvviso(e,n, lat, long) {

	e.preventDefault();

	var url = (window.location.pathname).split("/")
	var percorso = url[url.length-1];


	$.post("/private/api/json/segnalazioni/upload", {tipoSegnalazione: n, lat: lat, lng: long, idPercorso: percorso}, "json" )
				.done(function(data) {

					//inserire alert come marcatura
					if (data['code']=="ok") {
							//inserire alert come marcatura
							addAlertMarker(mapHome,lat,long, n);

							//incremento gli alert
							nAlert++
							visualizzaNalert()

					}

				});

				infoWindowOpen.close()


}


function addAlertMarker(map,lat,lng, type) {
	type+=2;
	var img = pinMarker(type);


	var marker = new google.maps.Marker({
			position: {lat: lat, lng: lng},
			map: map,
			icon: img,
			clickable: false
		});

	//inserisco il marker nell'array
	alertMarker.push(marker);

}



//carico gli addAlertMarker
function retriveAlert() {
	var url = window.location.pathname ;
	var slagPercorso = url.split("/")
	var pulsanteAlert = $('#other-pins input[name="alert"]');
	pulsanteAlert.change(toggleAlert)

	$.getJSON('/private/api/json/segnalazioni/'+slagPercorso[2])
						.done(function(data) {
								if(data['code']==0 || data['code'] == 'error') {
									visualizzaNalert()
									return;
								}

								alertCollection = data
								nAlert= data.length
								visualizzaNalert();
							})
}

function toggleAlert() {
	//alert("visualizza o non visualizza")

		    if (this.checked) {
						if (alertCollection==null) {
								$.each(alertMarker, function(key, value) {
										//inserisco i marker all'interno della mappa
										value.setMap(mapHome);
								})
						} else if(alertCollection!= null) {
								$.each(alertCollection, function(key,value) {
											addAlertMarker(mapHome, value['coordinates'][0], value['coordinates'][1], value['data']['type']);
								})

								alertCollection = null
						}

		    } else {
					$.each(alertMarker, function(key, value) {
							//inserisco i marker all'interno della mappa
							value.setMap(null);
					})
		    }
}

function visualizzaNalert() {
	var label = $('#other-pins #alert span')
	label.text("("+nAlert+")")
}

//******************************* GESTIONE ATTIVITA **************************/
//array con maker di google maps
var parcheggiMarker = [];
var barMarker = [];

//n parcheggi e bar
var nParcheggi = 0
var nBar = 0

function retriveAttivita() {
	var url = window.location.pathname ;
	var slagPercorso = url.split("/")
	var pulsanteParcheggi = $('#other-pins input[name="parcheggi"]');
	pulsanteParcheggi.change(toggleParcheggi)

	var pulsanteBar = $('#other-pins input[name="bar"]');
	pulsanteBar.change(toggleBar)

	$.getJSON('/private/api/json/attivita/'+slagPercorso[2])
						.done(function(data) {
								if(data['code']==0 || data['code'] == 'error') {
									visualizzaNattivita()
									return;
								}

								$.each(data, function(key, value) {
									var icona = null;


									if(value['attivita']=='bar') {
										nBar++
										icona = pinMarker(9);

										var marker = new google.maps.Marker({
												position: {lat: value['location']['coordinates'][0], lng: value['location']['coordinates'][1]},
												icon: icona,
												clickable: false
											});

										barMarker.push(marker)


									} else if (value['attivita']=='parcheggio') {
										nParcheggi++
										icona = pinMarker(8);

										var marker = new google.maps.Marker({
												position: {lat: value['location']['coordinates'][0], lng: value['location']['coordinates'][1]},
												icon: icona,
												clickable: false
											});

										parcheggiMarker.push(marker)
									}



								})


								visualizzaNattivita()

							})
}

function visualizzaNattivita() {
	var label = $('#other-pins #parking span')
	label.text("("+nParcheggi+")")

	var label2 = $('#other-pins #bar span')
	label2.text("("+nBar+")")

}


function toggleParcheggi() {
		   if (this.checked) {
								$.each(parcheggiMarker, function(key, value) {
										//inserisco i marker all'interno della mappa
										value.setMap(mapHome);
								})

		    } else {
					$.each(parcheggiMarker, function(key, value) {
							value.setMap(null);
					})
		    }
}

function toggleBar() {
		if (this.checked) {
	 					$.each(barMarker, function(key, value) {
	 							//inserisco i marker all'interno della mappa
	 							value.setMap(mapHome);
	 					})

	 	} else {
	 		$.each(barMarker, function(key, value) {
	 				value.setMap(null);
	 		})
	 	}


}

/***************** annunci singolo percorso *****************/
var annunciMarker = [];
function retriveAnnunciScheda(area) {
	var coordinate = area.toJSON()
	var alfabeto= ["A","B","C", "D", "E", "F", "G", "H", "I", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "Z"]
	$.post("/private/api/json/annunci", {lat1: coordinate["south"], lng1: coordinate["west"], lat2: coordinate["north"], lng2:coordinate["east"]}, "json" )
				.done(function(data) {

							//rimuovo eventuali vecchi annunci
							$("#base-annunci").remove()
							//rimuovo i pins
							$.each(annunciMarker, function(key,value) {
										value.setMap(null)
							})

							//svuoto l'array
							annunciMarker=[]


							if (data!="") {
								var tabindex=12;
								var counter= 0;
								var img = pinMarker(1);



								var html = '<div class="background-yellow" id="base-annunci">'
										html += '<h3>Annunci</h3>'

								$.each(data, function(key,value){

										html+='<a href="/annunci/'+value['_id']+'"><h4>'+value['title']+'</h4>'
										html+='<p>'+value['text']
										//html+='<br/><a href="/annunci/'+value['_id']+'" tabindex="'+tabindex+'">vai al sito</a></p>'
										html+="</p></a>"
										tabindex++;

										//aggingi marker
										var marker = new google.maps.Marker({
												position: {lat: value['coordinates'][0], lng: value['coordinates'][1]},
												map: mapHome,
												label: {text: " ", color:'white'},
												icon: img,
												clickable: false
											});

										marker.label.text = alfabeto[counter];

										annunciMarker.push(marker);
										counter++

									})

									html += '</div>'
									$(html).appendTo("#annunci")
							}


				})

}


/********************** ALTRO *******************/
function setCentroMappa() {
	mapHome.setCenter(centroMappa)
}

function addEventCentroMappa() {
	$(window).resize(function() {clearTimeout(resizeAction);
														 resizeAction = setTimeout(setCentroMappa, 150);
														 });
}
