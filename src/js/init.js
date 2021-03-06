
function initializePuzzle (inputArray) {
	jQuery(function ($) {
		// Adjustable size limits
		const VERTICAL_BOXES = 10;
		const HORIZONTAL_BOXES = 10;

		// Use xWord to generate a layout
		var {words, grid} = xWords.Create(VERTICAL_BOXES, HORIZONTAL_BOXES, inputArray);
		// console.log(grid);

		// Transform the layout generated by xWord into the appropriate format
		var puzzleData = words.map(word => {
			return {
				answer: word.word,
				clue: word.clue,
				orientation: word.chosenPosition.direction == 1 ? 'across' : 'down',
				startx: word.chosenPosition.x + 1,
				starty: word.chosenPosition.y + 1
			}
		});
		
		let positionValue = 1;
		// Starting at the top left, number the words starting in each square in sequence.
		// If two words start in the same square (across and down), they share a number.
		for(let i = 1; i <= VERTICAL_BOXES; i++) {
			for(let j = 1; j <= HORIZONTAL_BOXES; j++) {
				let wordsStartingHere = puzzleData.filter(word => word.startx === j && word.starty === i);
				if (wordsStartingHere.length) {
					wordsStartingHere.forEach(word => {
						word.position = positionValue;
						//console.log(`${i}, ${j}: ${positionValue}: ${word.answer}`);
					});
					// Increment positionValue for each square with at least 1 word starting in it
					positionValue++;
				}
			}
		}
		console.log('words:');
		console.log(words);
		console.log('puzzleData:');
		console.log(puzzleData);
	
		// We listen to the resize event
		window.addEventListener('resize', _.debounce(setHeight, 250));
		setHeight();

		// Finally clear any old data and render the crossword puzzle
		$('#puzzle-clues').remove();
		$('#puzzle-wrapper').empty().crossword(puzzleData);

		function setHeight(){
			let vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
		}
	});
};
