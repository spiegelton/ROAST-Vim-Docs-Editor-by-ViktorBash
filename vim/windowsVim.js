import { baseVim } from "./baseVim.js";
import { docs } from '../docs.js';
import { updateUIModeText, updateUISequenceText } from "./UI.js";

// Add on top of base vim to work on windows machines

let windowsVim = {
	__proto__: baseVim,
}

// TODO: Switch A and $ to use this function
// Move to the start of a line
windowsVim.moveToEndOfLine = function () {
	let [startXCoord, startYCoord] = docs.getCoords();
	docs.pressKey(docs.codeFromKey("ArrowRight")); 
	let [middleXCoord, middleYCoord] = docs.getCoords();
	if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
		// We are at the end of the file already, good to go
	}
	else if (startYCoord === middleYCoord) {
		// We're in the middle of a line
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowDown"), true);
		let [middleXCoord, middleYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		let [endXCoord, endYCoord] = docs.getCoords();
		if (endXCoord < middleXCoord) {
			console.log(endXCoord, middleXCoord);
			// This is the edge case if we're at the end of a file, undo our arrow left
			docs.pressKey(docs.codeFromKey("ArrowRight"));
		}
	}
	else {
		// We are on the end of a multiline or line
		docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
		let [endXCoord, endYCoord] = docs.getCoords();
		if (endXCoord === startXCoord && endYCoord === startYCoord) {
			// We are at the end of a line, do nothing
		} 
		else {
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
			let [middleXCoord, middleYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [endXCoord, endYCoord] = docs.getCoords();
			if (endXCoord < middleXCoord) {
				// This is the edge case if we're at the end of a file, undo our arrow left
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
		}


	}

	// docs.pressKey(docs.codeFromKey("ArrowDown"), true);
	// if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
	// 	// We are at the end of the file already, good to go
	// }
	// else {
	// 	docs.pressKey(docs.codeFromKey("ArrowLeft"));
	// 	let [endXCoord, endYCoord] = docs.getCoords();

	// 	if (endXCoord < middleXCoord ) { 
	// 		// This is the edge case if we're at the end of a file now, we undo our arrow left
	// 		docs.pressKey(docs.codeFromKey("ArrowRight"));
	// 	}
	// }

}

// Called in normal mode.
windowsVim.normal_keydown = function (e) {
	if (e.key.match(/F\d+/)) {
		// Let function keys (F1 to F12), go through normally
		return true;
	}

	e.preventDefault();
	e.stopPropagation();

	if (e.key === "Shift") {
		// Shift by itself does nothing
		return true;
	}

	if (e.key == "Escape") {
		// Remove any saved queries that the user had
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		return true;
	}

	// Paste (no support for numbers/pasting multiple times yet)
	if (e.key === "p" && windowsVim.currentSequence.length === 0) {
		windowsVim.paste(e);
		windowsVim.num = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	// Paste (no support for numbers/pasting multiple times yet)
	if (e.key === "P" && windowsVim.currentSequence.length === 0) {
		if (e.ctrlKey === false) {
			// Paste with formatting
			docs.contentDocument.execCommand("paste");
			setTimeout(() => {
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}, 1);
		} else {
			// Paste without formatting
			docs.pasteClipboardPlainText().then(() => {
				setTimeout(() => {
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}, 1);
			});
		}
		windowsVim.num = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "i" && windowsVim.currentSequence.length === 0) {
		windowsVim.switchToInsertMode();
		return true;
	}

	if (e.key === "v" && windowsVim.currentSequence.length === 0) {
		windowsVim.visualModeIsLinedBased = false;
		windowsVim.switchToVisualMode();
		return true;
	}

	if (e.key === "V" && windowsVim.currentSequence.length === 0) {
		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[0]) {
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
		}
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
		docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
		windowsVim.visualModeIsLinedBased = true;
		windowsVim.switchToVisualMode();
		return true;
	}

	if (e.key.match(/\d+/) && windowsVim.currentSequence.length === 0) {
		if (e.key === "0" && windowsVim.num.length !== 0) {
			// 0 is part of the number being typed (ex: "100")
			if (windowsVim.num.length < 3) {
				// We don't want to crash, so max you can type in is a 3 digit number (999)
				windowsVim.num += e.key;
			}
		} else if (e.key !== "0") {
			// We have any digit besides 0 being typed (ex: "1" or "11")
			if (windowsVim.num.length < 3) {
				windowsVim.num += e.key;
			}
		} else {
			// else, 0 is the actual command (ex: "0"), so continue to down below
			let cursorLocations = docs.getCursorLocations();
			if (cursorLocations[0] && cursorLocations[1]) {
				// Do nothing
			} else if (cursorLocations[0]) {
				docs.pressKey(docs.codeFromKey("ArrowRight")); // This helps immensely to gauge where we are
				docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			} else {
				docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			}
		}
		updateUISequenceText(windowsVim.num + windowsVim.currentSequence);
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "a" && windowsVim.currentSequence.length === 0) {
		let initialCoords = docs.userCursor.style.transform;
		let initialXIndex = initialCoords.indexOf("px");
		let initialYCoord = initialCoords.slice(
			initialXIndex + 4,
			initialCoords.length - 3
		);
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let newYCoord = docs.getYCoord();
		if (initialYCoord !== newYCoord) {
			// We're either on a new multiline or a real new line, check which scenario and adjust accordingly
			docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
			let finalCoords = docs.userCursor.style.transform;
			if (finalCoords === initialCoords) {
				// We've encountered a new line, we don't need to move the cursor anymore
			} else {
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
			}
		}

		windowsVim.switchToInsertMode();
		return true;
	}

	if (e.key === "A" && windowsVim.currentSequence.length === 0) {
		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[3]) {
			// If we're not at the end of the file, move down and left
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
			let newCursorLocations = docs.getCursorLocations();
			if (!newCursorLocations[3]) {
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}

		windowsVim.switchToInsertMode();
		return true;
	}

	if (e.key === "O" && windowsVim.currentSequence.length === 0) {
		let cursorLocations = docs.getCursorLocations();
		if (cursorLocations[2]) {
			// At start of file
			docs.pressKey(docs.codeFromKey("Enter"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		} else if (cursorLocations[3] && cursorLocations[0]) {
			// At end of file on an empty line
			docs.pressKey(docs.codeFromKey("Enter"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		} else if (cursorLocations[3]) {
			// At end of file on non-empty line
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			docs.pressKey(docs.codeFromKey("Enter"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		} // Past this point we are guaranteed to not be at the start or end of the file
		else if (cursorLocations[0] && cursorLocations[1]) {
			// We are on an empty line
			docs.pressKey(docs.codeFromKey("Enter"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		} else if (cursorLocations[0]) {
			docs.pressKey(docs.codeFromKey("ArrowRight")); // This helps immensely to gauge where we are
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			docs.pressKey(docs.codeFromKey("Enter"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		} else {
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			docs.pressKey(docs.codeFromKey("Enter"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}

		windowsVim.switchToInsertMode();
		return true;
	}

	if (e.key === "o" && windowsVim.currentSequence.length === 0) {
		// Move to the end of the line and press enter
		windowsVim.moveToEndOfLine();
		docs.pressKey(docs.codeFromKey("Enter"));
		windowsVim.switchToInsertMode();
		return true;
	}

	if (e.key === "I" && windowsVim.currentSequence.length === 0) {
		let oldCoords = docs.userCursor.style.transform;
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let newCoords = docs.userCursor.style.transform;
		if (oldCoords === newCoords) {
			// We are at the end of a file (which may be an empty line, so we have to test for that)
			let initialYCoord = docs.getYCoord();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let finalYCoord = docs.getYCoord();

			// We we are going to check Y-Values, if the y-value didn't change, hit arrow up
			// If the y value did change, hit arrow right
			if (initialYCoord === finalYCoord) {
				// Y Coord didn't change, so we should get to the start of a line with arrow up
				docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			} else {
				// Y Coord changed, so we were at the start of a line (so just go back)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
		} else {
			// We can just arrow up from here in all scenarios
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
		}
		windowsVim.switchToInsertMode();
		return true;
	}

	if (
		(e.key === "E" || e.key === "e") &&
		windowsVim.currentSequence.length === 0
	) {
		const numRepeats = parseInt(windowsVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let cursorPosition = docs.userCursor.style.transform;
			docs.pressKey(docs.codeFromKey("ArrowRight"), true);
			docs.pressKey(docs.codeFromKey("ArrowRight"), true);
			let cursorLocations = docs.getCursorLocations();
			if (cursorLocations[3]) {
				// We reached end of the file
				break;
			}

			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let newCursorPosition = docs.userCursor.style.transform;
			if (cursorPosition === newCursorPosition) {
				// We are stuck in a loop because of punctuation or something, move forward
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
		}
		windowsVim.num = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	if (
		(e.key === "w" || e.key === "W") &&
		windowsVim.currentSequence.length === 0
	) {
		const numRepeats = parseInt(windowsVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			docs.pressKey(docs.codeFromKey("ArrowRight"), true);
			let cursorPosition = docs.userCursor.style.transform;
			docs.pressKey(docs.codeFromKey("ArrowRight"), true);
			let newCursorPosition = docs.userCursor.style.transform;
			if (cursorPosition === newCursorPosition) {
				// We've reached end of the file
				break;
			}
			docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
		}
		windowsVim.num = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "$" && windowsVim.currentSequence.length === 0) {
		let cursorLocations = docs.getCursorLocations();
		docs.pressKey(docs.codeFromKey("ArrowDown"), true);
		if (!cursorLocations[3]) {
			// If we're not at the end of a file, move back left
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	if (e.key == "x" && windowsVim.currentSequence.length === 0) {
		// if we're at the end of a line, r should go on the current line
		// if we're at the end of a multiline (fake) line, r can move to next multiline
		let [xCoord, yCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft")); // We do this to check if we're at the start of a line
		let [leftXCoord, leftYCoord] = docs.getCoords();

		// IF: We are not at the start of the file, undo our arrow left with an arrow right
		if (xCoord !== leftXCoord || yCoord !== leftYCoord) {
			// We are not at the beginning of the file, so undo our arrow right
			docs.pressKey(docs.codeFromKey("ArrowRight"));
		}
		// IF: We are at the start of a line OR at the start of a file, we can just replace the character without worrying
		// about line ending stuff
		if (
			leftYCoord !== yCoord ||
			(leftYCoord === yCoord && leftXCoord === xCoord)
		) {
			// At the beginning of a line or multiline, no need for checking if we're at the end
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [rightXCoord, rightYCoord] = docs.getCoords();
			// let rightYCoord = docs.getYCoord();
			if (rightYCoord !== yCoord) {
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			} else if (rightXCoord === xCoord && rightYCoord === yCoord) {
				// We are at the end of the file on an empty line, do nothing
			} else {
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
		}

		// We are not at the start of a file or line, so we have to check if we're at the end of a line,
		// middle of a line, or end of a file
		else {
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [newXCoord, newYCoord] = docs.getCoords();
			if (xCoord === newXCoord && yCoord === newYCoord) {
				// We are at the end of the file, guaranteed to not be an empty line from above
				docs.pressKey(docs.codeFromKey("Backspace"));
			} else if (yCoord === newYCoord) {
				// We are in the middle of the line somewhere or something, standard procedure
				docs.pressKey(docs.codeFromKey("Backspace"));
			} else {
				// We've either passed a space or a return that has put us one multiline or line down
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				let [finalXCoord, finalYCoord] = docs.getCoords();
				if (finalXCoord === xCoord && finalYCoord === yCoord) {
					// We are dealing with a "Return" and actual new line
					docs.pressKey(docs.codeFromKey("Backspace"));
				} else {
					// We are dealing with a space and just a multiline
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
		}

		windowsVim.num = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	// ALL Support for d and c multiline commands here

	// D, d$, C, c$
	if (
		(e.key === "D" && windowsVim.currentSequence.length === 0) ||
		(e.key === "$" && windowsVim.currentSequence === "d") ||
		(e.key === "C" && windowsVim.currentSequence.length === 0) ||
		(e.key === "$" && windowsVim.currentSequence === "c")
	) {
		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[1]) {
			// If we're not at the end of the file, delete text
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
		}
		if (e.key === "C" || windowsVim.currentSequence === "c") {
			windowsVim.switchToInsertMode();
			return true;
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	// d0, c0
	if (
		(e.key === "0" && windowsVim.currentSequence === "d") ||
		(e.key === "0" && windowsVim.currentSequence === "c")
	) {
		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[0]) {
			// If we're not at the start of the line, delete text
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
		}
		if (windowsVim.currentSequence === "c") {
			windowsVim.switchToInsertMode();
			return true;
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	// dd
	if (e.key === "d" && windowsVim.currentSequence === "d") {
		// We are going to select text down, move right one arrow, select text up, and delete
		const numRepeats = parseInt(windowsVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let cursorLocations = docs.getCursorLocations();
			if (cursorLocations[3] && cursorLocations[0]) {
				// We are at the end of a file on an empty line
				docs.pressKey(docs.codeFromKey("Backspace"));
				break;
			}
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
			if (cursorLocations[3]) {
				// We are at the end of the file, so backspace again to remove the empty line we're on
				docs.pressKey(docs.codeFromKey("Backspace"));
				break; // With dd we finish if we reach the end of the
			}
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	// cc
	if (e.key === "c" && windowsVim.currentSequence === "c") {
		// We are going to select text down, move right one arrow, select text up, and delete
		const numRepeats = parseInt(windowsVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let cursorLocations = docs.getCursorLocations();
			if (cursorLocations[3] && cursorLocations[0]) {
				// We are at the end of a file on an empty line
				if (i !== numRepeats - 1) {
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
				break;
			}
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
			if (cursorLocations[3]) {
				// We are at the end of the file, so backspace again to remove the empty line we're on
				if (i !== numRepeats - 1) {
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
				break; // With dd we finish if we reach the end of the
			}
			if (i === numRepeats - 1) {
				docs.pressKey(docs.codeFromKey("Enter"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}

		windowsVim.switchToInsertMode();
		return true;
	}

	// diw, ciw
	if (
		(e.key === "w" && windowsVim.currentSequence === "di") ||
		(e.key === "w" && windowsVim.currentSequence === "ci")
	) {
		const numRepeats = parseInt(windowsVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let cursorLocations = docs.getCursorLocations();
			if (cursorLocations[0] && cursorLocations[1]) {
				// Do nothing, we're on an empty line
			} else if (cursorLocations[0]) {
				// We're at the start of a line, so select right and delete
				docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			} else if (cursorLocations[0]) {
				// We're at the end of a line, so select left and delete
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			} else {
				// We're in the middle somewhere, move right and then all the way to the start of the word
				// then all the way to the right with highlighting, then delete
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true, false);
				docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
		}
		if (windowsVim.currentSequence === "ci") {
			windowsVim.switchToInsertMode();
			return true;
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		return true;
	}

	// y$
	if (e.key === "$" && windowsVim.currentSequence === "y") {
		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[1]) {
			// IF we're not at the end of a line, select the text
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
			docs.contentDocument.execCommand("copy"); // TODO: Replace deprecated execCommand
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		// Don't need to set cursor width because we didn't move anywhere
		return true;
	}

	// y0
	if (e.key === "0" && windowsVim.currentSequence === "y") {
		let cursorLocations = docs.getCursorLocations();
		// Technically windowsVim will move up a line if you're at the start already, but that seems ugly, so we'll implement it
		// slightly different on purpose.
		if (cursorLocations[0]) {
			// If we're at the start, do nothing except copy blankness into the clipboard
			navigator.clipboard.writeText("");
		} else {
			// We are not at the start of a line, so select text normally
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		// Don't need to set cursor width because we didn't move anywhere
		return true;
	}

	// yy or Y
	if ((e.key === "y" && windowsVim.currentSequence === "y") || e.key === "Y") {
		windowsVim.copyWholeLine();
		return true;
	}

	windowsVim.currentSequence += e.key; // Add the current key to the sequence

	// If the current sequence is in the keyMaps, then execute the command
	if (windowsVim.currentSequence in windowsVim.keyMaps) {
		windowsVim.keyMaps[windowsVim.currentSequence].forEach(([key, ...args]) => {
			let numRepeats = parseInt(windowsVim.num) || 1;
			// For 'gg' and 'G', we only want to run it once no matter what
			if (windowsVim.currentSequence === "G" || windowsVim.currentSequence === "gg") {
				numRepeats = 1;
			}

			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey(key), ...args);
			}
		});
		windowsVim.num = "";
		windowsVim.currentSequence = "";
	}

	// r for replace command:
	if (
		windowsVim.currentSequence[0] === "r" &&
		windowsVim.currentSequence.length === 2
	) {
		// if we're at the end of a line, r should go on the current line
		// if we're at the end of a multiline (fake) line, r can move to next multiline
		const numRepeats = parseInt(windowsVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let [xCoord, yCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft")); // We do this to check if we're at the start of a line
			let [leftXCoord, leftYCoord] = docs.getCoords();

			// IF: We are not at the start of the file, undo our arrow left with an arrow right
			if (xCoord !== leftXCoord || yCoord !== leftYCoord) {
				// We are not at the beginning of the file, so undo our arrow right
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
			// IF: We are at the start of a line OR at the start of a file, we can just replace the character without worrying
			// about line ending stuff
			if (
				leftYCoord !== yCoord ||
				(leftYCoord === yCoord && leftXCoord === xCoord)
			) {
				// At the beginning of a line or multiline, no need for checking if we're at the end
				docs.pressKey(windowsVim.currentSequence.charCodeAt(1));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				let rightYCoord = docs.getYCoord();
				if (rightYCoord !== yCoord) {
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				} else {
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
				continue;
			}

			// We are not at the start of a file or line, so we have to check if we're at the end of a line,
			// middle of a line, or end of a file

			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [newXCoord, newYCoord] = docs.getCoords();
			if (xCoord === newXCoord && yCoord === newYCoord) {
				// We are at the end of the file, just add our word and chill
				docs.pressKey(windowsVim.currentSequence.charCodeAt(1));
			} else if (yCoord === newYCoord) {
				// We are in the middle of the line somewhere or something, standard procedure
				docs.pressKey(docs.codeFromKey("Backspace"));
				docs.pressKey(windowsVim.currentSequence.charCodeAt(1));
			} else {
				// We've either passed a space or a return that has put us one multiline or line down
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				let [finalXCoord, finalYCoord] = docs.getCoords();
				if (finalXCoord === xCoord && finalYCoord === yCoord) {
					// We are dealing with a "Return" and actual new line
					docs.pressKey(windowsVim.currentSequence.charCodeAt(1));
				} else {
					// We are dealing with a space and just a multiline
					docs.pressKey(docs.codeFromKey("Backspace"));
					docs.pressKey(windowsVim.currentSequence.charCodeAt(1));
				}
			}
		}
		windowsVim.num = "";
		windowsVim.currentSequence = "";
	}

	if (
		windowsVim.currentSequence.length !== 0 &&
		!windowsVim.incompleteKeyMaps.includes(windowsVim.currentSequence)
	) {
		// This means that the current sequence is invalid, so we have to reset it
		windowsVim.num = "";
		windowsVim.currentSequence = "";
	}

	updateUISequenceText(windowsVim.num + windowsVim.currentSequence);
	docs.setCursorWidth();
	return true;
};

// Called in visual mode.
windowsVim.visual_keydown = function (e) {
	if (e.key.match(/F\d+/)) {
		// Pass through any function keys.
		return true;
	}

	e.preventDefault();
	e.stopPropagation();

	if (e.key === "Shift") {
		// Shift by itself does nothing
		return true;
	}

	if (e.key == "Escape") {
		// Escape visual mode.
		docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
		// go to the right side when the left side could be a solution as well
		windowsVim.switchToNormalMode();
		return true;
	}

	if (e.key === "p" && windowsVim.currentSequence.length === 0) {
		// We have to first delete the highlighted text, then paste in the clipboard
		docs.pressKey(docs.codeFromKey("Backspace"));
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		docs.pasteClipboard();
		windowsVim.switchToNormalMode();
		return true;
	}

	if (e.key === "P" && windowsVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("Backspace"));
		docs.pasteClipboard();
		windowsVim.switchToNormalMode();
		return true;
	}

	if (e.key === "I" && windowsVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		windowsVim.switchToInsertMode();
		return true;
	}

	if (
		(e.key === "v" || e.key === "V") &&
		windowsVim.currentSequence.length === 0
	) {
		docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
		windowsVim.switchToNormalMode();
		return true;
	}

	if (e.key.match(/\d+/) && windowsVim.currentSequence.length === 0) {
		if (e.key === "0" && windowsVim.num.length !== 0) {
			// 0 is part of the number being typed (ex: "100")
			if (windowsVim.num.length < 3) {
				// We don't want to crash, so max you can type in is a 3 digit number (999)
				windowsVim.num += e.key;
			}
		} else if (e.key !== "0") {
			// We have any digit besides 0 being typed (ex: "1" or "11")
			if (windowsVim.num.length < 3) {
				windowsVim.num += e.key;
			}
		} else {
			docs.pressKey(docs.codeFromKey("Home"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
		}
		updateUISequenceText(windowsVim.num + windowsVim.currentSequence);
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "A" && windowsVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		if (windowsVim.visualModeIsLinedBased) {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[3]) {
				// If we're not at the end of a file, move left
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}
		windowsVim.switchToInsertMode();
		return true;
	}

	if (e.key === "$" && windowsVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
		docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
		windowsVim.num = "";
		windowsVim.currentSequence = "";
		updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "x" && windowsVim.currentSequence.length === 0) {
		docs.contentDocument.execCommand("cut");
		windowsVim.switchToNormalMode();
		return true;
	}

	if (e.key === "d" && windowsVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("Backspace"));
		windowsVim.switchToNormalMode();
		return true;
	}

	if (e.key === "c" && windowsVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("Backspace"));
		windowsVim.switchToInsertMode();
		return true;
	}

	if (
		(e.key === "D" || e.key === "C") &&
		windowsVim.currentSequence.length === 0
	) {
		// Delete the whole line(s) that we partially selected
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
		docs.pressKey(docs.codeFromKey("Backspace"));
		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[0]) {
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
		}
		if (e.key === "C") {
			windowsVim.switchToInsertMode();
			return true;
		}
		windowsVim.num = "";
		windowsVim.updateUISequenceText("");
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "Y" && windowsVim.currentSequence.length === 0) {
		windowsVim.copyWholeLineVisualMode();
		return true;
	}

	if (e.key === "y" && windowsVim.currentSequence.length === 0) {
		docs.contentDocument.execCommand("copy");
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		windowsVim.switchToNormalMode();
		return true;
	}

	// Now we do checks that only apply to line-based visual mode, where we do not follow the norm
	if (windowsVim.visualModeIsLinedBased) {
		// Left and right traversal now do nothing
		let doNothingKeys = ["h", "l", "b", "B", "e", "E", "w", "W"];
		if (doNothingKeys.includes(e.key) && windowsVim.currentSequence.length === 0) {
			windowsVim.num = "";
			updateUISequenceText("");
			return true;
		}

		if (e.key === "k" && windowsVim.currentSequence.length === 0) {
			const numRepeats = parseInt(windowsVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			}
			windowsVim.num = "";
			updateUISequenceText("");
			return true;
		}

		if (e.key === "j" && windowsVim.currentSequence.length === 0 && !docs.isMac) {
			const numRepeats = parseInt(windowsVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			}
			windowsVim.num = "";
			updateUISequenceText("");
			return true;
		}
		if (e.key === "j" && windowsVim.currentSequence.length === 0 && docs.isMac) {
			// We need to handle j differently on Mac because of Apple's weird behavior around empty lines
			const numRepeats = parseInt(windowsVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
			}
			windowsVim.num = "";
			updateUISequenceText("");
			return true;
		}
	}

	windowsVim.currentSequence += e.key;

	if (windowsVim.currentSequence in windowsVim.differentVisualKeyMaps) {
		windowsVim.differentVisualKeyMaps[windowsVim.currentSequence].forEach(
			([key, ...args]) => {
				const numRepeats = parseInt(windowsVim.num) || 1;
				for (let i = 0; i < numRepeats; i++) {
					if (key.indexOf("Arrow") == 0) {
						// get the special keys pressed and default to false
						const keyArgs = [...args, false, false].slice(0, 2);
						keyArgs[1] = true;
						docs.pressKey(docs.codeFromKey(key), ...keyArgs);
					} else {
						docs.pressKey(docs.codeFromKey(key), ...args);
					}
				}
			}
		);
		windowsVim.num = "";
		windowsVim.currentSequence = "";
	} else if (windowsVim.currentSequence in windowsVim.keyMaps) {
		windowsVim.keyMaps[windowsVim.currentSequence].forEach(([key, ...args]) => {
			const numRepeats = parseInt(windowsVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				// get the special keys pressed and default to false
				const keyArgs = [...args, false, false].slice(0, 2);
				keyArgs[1] = true;
				docs.pressKey(docs.codeFromKey(key), ...keyArgs);
			}
		});
		windowsVim.num = "";
		windowsVim.currentSequence = "";
	}

	if (
		windowsVim.currentSequence.length !== 0 &&
		!windowsVim.incompleteKeyMaps.includes(windowsVim.currentSequence)
	) {
		// This means that the current sequence is invalid, so we have to reset it
		windowsVim.num = "";
		windowsVim.currentSequence = "";
	}
	return true;
};


export { windowsVim }