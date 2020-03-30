
/**
* Jesse Weisbeck's Crossword Puzzle (for all 3 people left who want to play them)
*
*/
(function($){
	$.fn.crossword = function(entryData) {
			/*
				Qurossword Puzzle: a javascript + jQuery crossword puzzle
				"light" refers to a white box - or an input

				DEV NOTES: 
				- activePosition and activeClueIndex are the primary vars that set the ui whenever there's an interaction
				- 'Entry' is a puzzler term used to describe the group of letter inputs representing a word solution
				- This puzzle isn't designed to securely hide answerers. A user can see answerers in the js source
					- An xhr provision can be added later to hit an endpoint on keyup to check the answerer
				- The ordering of the array of problems doesn't matter. The position & orientation properties is enough information
				- Puzzle authors must provide a starting x,y coordinates for each entry
				- Entry orientation must be provided in lieu of provided ending x,y coordinates (script could be adjust to use ending x,y coords)
				- Answers are best provided in lower-case, and can NOT have spaces - will add support for that later
			*/
			
			var puzz = {}; // put data array in object literal to namespace it into safety
			puzz.data = entryData;
			
			// append clues markup after puzzle wrapper div
			// This should be moved into a configuration object
			this.append('<div id=puzzle>');
			// this.append('<hr/>');
			this.append('<div id="puzzle-clues"><h2>Across</h2><ol id="across"></ol><h2>Down</h2><ol id="down"></ol></div>');

			// initialize some variables
			var tbl = ['<table id="puzzle">'],
			    puzzEl = $(this).find('#puzzle'),
				clues = $('#puzzle-clues'),
				clueLiEls,
				entryCount = puzz.data.length,
				entries = [], 
				rows = 0,
				cols = 0,
				solved = [],
				$actives,
				activePosition = 0,
				activeEntry = 0;
				activeClueIndex = 0,
				currentOrientation = 'across',
				mode = 'interacting',
				solvedToggle = false;

			var puzInit = {
				
				init: function() {
					currentOrientation = 'across'; // app's init orientation could move to config object
					
					// Reorder the problems array ascending by POSITION
					puzz.data.sort(function(a,b) {
						return a.position - b.position;
					});

					// Set keyup handlers for the 'entry' inputs that will be added presently
					puzzEl.delegate('input', 'keyup', function(e){
						mode = 'interacting';
						puzInit.checkAnswer(e);
						
						// need to figure out orientation up front, before we attempt to highlight an entry
						switch(e.which) {
							case 39:
							case 37:
								currentOrientation = 'across';
								break;
							case 38:
							case 40:
								currentOrientation = 'down';
								break;
							default:
								break;
						}
						
						if ( e.keyCode === 9) {
							return false;
						} else if (
							e.keyCode === 37 ||
							e.keyCode === 38 ||
							e.keyCode === 39 ||
							e.keyCode === 40 ||
							e.keyCode === 8 ||
							e.keyCode === 46 ) {			
												

							
							if (e.keyCode === 8 || e.keyCode === 46) {
								currentOrientation === 'across' ? nav.nextPrevNav(e, 37) : nav.nextPrevNav(e, 38); 
							} else {
								nav.nextPrevNav(e);
							}
							
							e.preventDefault();
							return false;
						} else {
							
							console.log('input keyup: '+solvedToggle);
							
							puzInit.checkAnswer(e);

						}

						e.preventDefault();
						return false;					
					});
			
					// tab navigation handler setup
					puzzEl.delegate('input', 'keydown', function(e) {

						if ( e.keyCode === 9) {
							
							mode = "setting ui";
							if (solvedToggle) solvedToggle = false;

							//puzInit.checkAnswer(e)
							nav.updateByEntry(e);
							
						} else {
							return true;
						}
												
						e.preventDefault();
									
					});
					
					// tab navigation handler setup
					puzzEl.delegate('input', 'click', function(e) {
						mode = "setting ui";
						if (solvedToggle) solvedToggle = false;

						console.log('input click: '+solvedToggle);
					
						nav.updateByEntry(e);
						e.preventDefault();
									
					});
					
					
					// click/tab clues 'navigation' handler setup
					clues.delegate('li', 'click', function(e) {
						mode = 'setting ui';
						
						if (!e.keyCode) {
							nav.updateByNav(e);
						} 
						e.preventDefault(); 
					});
					
					
					// highlight the letter in selected 'light' - better ux than making user highlight letter with second action
					puzzEl.delegate('#puzzle', 'click', function(e) {
						$(e.target).focus();
						$(e.target).select();
					});
					
					// DELETE FOR BG
					puzInit.calcCoords();
					
					// Puzzle clues added to DOM in calcCoords(), so now immediately put mouse focus on first clue
					clueLiEls = $('#puzzle-clues li');
					$('#' + currentOrientation + ' li' ).eq(0).addClass('clues-active').focus();
				
					// DELETE FOR BG
					puzInit.buildTable();
					puzInit.buildEntries();
										
				},
				
				/*
					- Given beginning coordinates, calculate all coordinates for entries, puts them into entries array
					- Builds clue markup and puts screen focus on the first one
				*/
				calcCoords: function() {
					/*
						Calculate all puzzle entry coordinates, put into entries array
					*/
					entries = puzz.data.map((word, i) => {
						// Add a unique identifier to link clues and answers
						word.id = `${word.position}-${word.orientation}`;
						let clueId = `clue-${word.id}`;

						// Add clues to DOM

						let clueHtml = `<li tabindex="1" data-entry="${i}" data-position="${word.position}" value="${word.position}" id="${clueId}">${word.clue}</li>`;
						$('#' + word.orientation).append(clueHtml); 

						let x = word.startx;
						let y = word.starty;

						// Loop to get coordinates for each letter
						let coordList = word.answer.split('').map(() => {
							// Calculate grid size by tracking highest x and y coordinates
							cols = Math.max(cols, x);
							rows = Math.max(rows, y);

							let coords = `${x},${y}`;
							if (word.orientation === 'across') {
								x++;
							} else {
								y++;
							}
							return coords;
						});
						word.coordList = coordList;
						return coordList;
					});
				},
				
				/*
					Build the table markup
					- adds [data-coords] to each <td> cell
				*/
				buildTable: function() {
					for (var y=1; y <= rows; ++y) {
						tbl.push("<tr>");
							for (var x=1; x <= cols; ++x) {
								tbl.push('<td data-coords="' + x + ',' + y + '"></td>');		
							};
						tbl.push("</tr>");
					};

					tbl.push("</table>");
					puzzEl.append(tbl.join(''));
				},
				
				/*
					Builds entries into table
					- Adds entry class(es) to <td> cells
					- Adds tabindexes to <inputs> 
				*/
				buildEntries: function() {
					var puzzCells = $('#puzzle td');
					var	light;
					var	$groupedLights;
						
					puzz.data.forEach((word, i) => {
						word.coordList.forEach(coord => {
							light = $(puzzCells +'[data-coords="' + coord + '"]');

							if($(light).empty()){
								$(light)
									.addClass(`entry-${i} position-${word.position} position-${word.id}`)
									.append('<input maxlength="1" val="" type="text" tabindex="-1" />');
							}
						});
					})
					
					// Put entry number in first 'light' of each entry, skipping it if already present
					puzz.data.forEach(({position}, i) => {
						$groupedLights = $('.entry-' + i);
						if(!$('.entry-' + i +':eq(0) span').length){
							$groupedLights.eq(0)
								.append('<span>' + position + '</span>');
						}
					});
					
					util.highlightEntry();
					util.highlightClue();
					$('.active').eq(0).focus();
					$('.active').eq(0).select();
										
				},
				
				
				/*
					- Checks current entry input group value against answer
					- If not complete, auto-selects next input for user
				*/
				checkAnswer: function(e) {
					
					var valToCheck, currVal;
					
					util.getActivePositionFromClassGroup($(e.target));

					let done = check(activeEntry);

					if (!done) {
						currentOrientation === 'across' ? nav.nextPrevNav(e, 39) : nav.nextPrevNav(e, 40);
					}

					// Check the other word if this is an intersection
					let altEntry = util.getClasses($(e.target).parent(), 'entry')
						.filter(num => num != activeEntry)[0];

					if(altEntry) {
						check(altEntry)
					}

					function check(entry) {
						valToCheck = puzz.data[entry].answer.toLowerCase();

						currVal = $('.entry-' + entry + ' input')
							.map(function() {
								  return $(this)
									.val()
									.toLowerCase();
							})
							.get()
							.join('');
						
						//console.log(currVal + " " + valToCheck);
						if(valToCheck === currVal){	
							$(`.entry-${entry} input`)
								.addClass('done')
								.prop('readonly', true)
								.removeClass('active');
						
							$('.clues-active').addClass('clue-done');
	
							solved.push(valToCheck);
							solvedToggle = true;
							return true;
						}
					}
				}				


			}; // end puzInit object
			

			var nav = {
				
				nextPrevNav: function(e, override) {

					var struck = override ? override : e.which,
						el = $(e.target),
						p = el.parent(),
						ps = el.parents(),
						selector;
				
					util.getActivePositionFromClassGroup(el);
					util.highlightEntry();
					util.highlightClue();
					
					$('.current').removeClass('current');
					
					selector = '.position-' + activePosition + ' input';
					
					//console.log('nextPrevNav activePosition & struck: '+ activePosition + ' '+struck);
						
					// move input focus/select to 'next' input
					switch(struck) {
						case 39:
							p
								.next()
								.find('input')
								.addClass('current')
								.select();

							break;
						
						case 37:
							p
								.prev()
								.find('input')
								.addClass('current')
								.select();

							break;

						case 40:
							ps
								.next('tr')
								.find(selector)
								.addClass('current')
								.select();

							break;

						case 38:
							ps
								.prev('tr')
								.find(selector)
								.addClass('current')
								.select();

							break;

						default:
						break;
					}
															
				},
	
				updateByNav: function(e) {
					
					$('.clues-active').removeClass('clues-active');
					$('.active').removeClass('active');
					$('.current').removeClass('current');
					currIndex = 0;

					activePosition = $(e.target).data('position');
					activeEntry = $(e.target).data('entry');
					
					util.highlightEntry();
					util.highlightClue();
										
					$('.active').eq(0).focus();
					$('.active').eq(0).select();
					$('.active').eq(0).addClass('current');
					
					// store orientation for 'smart' auto-selecting next input
					currentOrientation = $('.clues-active').parent('ol').prop('id');
										
					activeClueIndex = $(clueLiEls).index(e.target);
					//console.log('updateByNav() activeClueIndex: '+activeClueIndex);
					
				},
			
				// Sets activePosition var and adds active class to current entry
				updateByEntry: function(e, next) {
					var next, clue;
					
					if(e.keyCode === 9 || next){
						// handle tabbing through problems, which keys off clues and requires different handling		
						activeClueIndex = activeClueIndex === clueLiEls.length-1 ? 0 : ++activeClueIndex;
					
						$('.clues-active').removeClass('.clues-active');
												
						next = $(clueLiEls[activeClueIndex]);
						currentOrientation = next.parent().prop('id');
						activePosition = $(next).data('position');
						activeEntry = $(next).data('entry');
												
						// skips over already-solved problems
						util.getSkips(activeClueIndex);
						activePosition = $(clueLiEls[activeClueIndex]).data('position');
						activeEntry = $(clueLiEls[activeClueIndex]).data('entry');
						
																								
					} else {
						activeClueIndex = activeClueIndex === clueLiEls.length-1 ? 0 : ++activeClueIndex;
					
						util.getActivePositionFromClassGroup(e.target);
						
						clue = $(clueLiEls + '[data-entry=' + activeEntry + ']');
						activeClueIndex = $(clueLiEls).index(clue);
						
						currentOrientation = clue.parent().prop('id');
						
					}
						
						util.highlightEntry();
						util.highlightClue();
						
						//$actives.eq(0).addClass('current');	
						//console.log('nav.updateByEntry() reports activePosition as: '+activePosition);	
				}
				
			}; // end nav object

			
			var util = {
				highlightEntry: function() {
					// this routine needs to be smarter because it doesn't need to fire every time, only
					// when activeEntry changes
					$actives = $('.active');
					$actives.removeClass('active');
					$actives = $('.entry-' + activeEntry + ' input').addClass('active');
					$actives.eq(0).focus();
					$actives.eq(0).select();
				},
				
				highlightClue: function() {
					$('.clues-active').removeClass('clues-active');
					var clue = $(clueLiEls + '[data-entry=' + activeEntry + ']');				
					clue.addClass('clues-active');
					
					if (mode === 'interacting') {
						activeClueIndex = $(clueLiEls).index(clue);
					};
				},
				
				// Gets a list of numbers of a given type from the given cell
				getClasses: function(light, type) {
					if (!light.length) return false;
					
					return $(light).prop('class').split(' ')
						.filter(str => str.includes(type))
						.map(str => str.replace(/\D/g, ''));
				},

				getActivePositionFromClassGroup: function(el){

						let entries = util.getClasses($(el).parent(), 'entry');

						if(entries.length > 1){
							// get orientation for each reported entry number
							let e1Ori = $(clueLiEls + '[data-entry=' + entries[0] + ']').parent().prop('id');
							let e2Ori = $(clueLiEls + '[data-entry=' + entries[1] + ']').parent().prop('id');

							// test if clicked input is first in series. If so, and it intersects with
							// entry of opposite orientation, switch to select this one instead
							let e1Cell = $('.entry-' + entries[0] + ' input').index(el);
							let e2Cell = $('.entry-' + entries[1] + ' input').index(el);

							// if(mode === "setting ui"){
							// 	currentOrientation = e1Cell === 0 ? e1Ori : e2Ori; // change orientation if cell clicked was first in a entry of opposite direction
							// }

							if(mode === "setting ui"){
								if (e1Cell === 0) {
									currentOrientation = e1Ori;
								} else if (e2Cell === 0) {
									currentOrientation = e2Ori;
								}
							}


							if(e1Ori === currentOrientation){
								activeEntry = entries[0];		
							} else if(e2Ori === currentOrientation){
								activeEntry = entries[1];
							}
						} else {
							activeEntry = entries[0];						
						}
						activePosition = puzz.data[activeEntry].position;
						
						console.log('getActivePositionFromClassGroup activePosition: '+activePosition);
						
				},
				
				checkSolved: function(valToCheck) {
					for (var i=0, s=solved.length; i < s; i++) {
						if(valToCheck === solved[i]){
							return true;
						}

					}
				},
				
				getSkips: function(position) {
					if ($(clueLiEls[position]).hasClass('clue-done')){
						activeClueIndex = position === clueLiEls.length-1 ? 0 : ++activeClueIndex;
						util.getSkips(activeClueIndex);						
					} else {
						return false;
					}
				}
				
			}; // end util object

				
			puzInit.init();
	
							
	}
	
})(jQuery);