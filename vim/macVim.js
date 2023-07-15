import { baseVim } from "./baseVim.js";
import { docs } from "../docs.js";
import { updateUIModeText, updateUISequenceText } from "./UI.js";

// Add on top of base vim to work on mac machines
let macVim = {
	__proto__: baseVim,
};


// Cannot be in baseVim for some reason
macVim.clearData = function () {
	macVim.num = "";
	macVim.currentSequence = "";
	updateUISequenceText("");
	docs.setCursorWidth();
	return;
}

// Move to the end of a real line
// Used by "A" and "$"
macVim.moveToEndOfLine = function () {
	let [startXCoord, startYCoord] = docs.getCoords();
	docs.pressKey(docs.codeFromKey("ArrowRight"), true);
	let [middleXCoord, middleYCoord] = docs.getCoords();
	if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
		// We are at the end of the file already, do nothing
	} else if (startYCoord === middleYCoord) {
		// We are the in the middle of a line somewhere
		docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
		docs.pressKey(docs.codeFromKey("ArrowDown"), true);
	} else {
		// We are on the end of a multiline or line
		docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
		let [finalXCoord, finalYCoord] = docs.getCoords();
		if (finalXCoord === startXCoord && finalYCoord === startYCoord) {
			// We were at the end of a life and are back there, do nothing else
		} else {
			// We were at the end of a multiline
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
		}
	}
};

macVim.moveToStartOfLine = function () {
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
};

// Called in normal mode.
macVim.normal_keydown = function (e) {
	if (e.key.match(/F\d+/)) {
		// Let function keys (F1 to F12), go through normally
		return true;
	}

	e.preventDefault();
	e.stopPropagation();

	if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
		// Shift by itself does nothing
		return true;
	}

	if (e.key === "Escape" || (e.key === "c" && e.ctrlKey === true)) {
		// Remove any saved queries that the user had
		macVim.clearData();
		return true;
	}

	if (e.key === "d" && e.ctrlKey === true && macVim.currentSequence.length === 0) {
		// Page down
		docs.pressKey(docs.codeFromKey("PageDown"));
		macVim.clearData();
		return true;
	}
	if (e.key === "u" && e.ctrlKey === true && macVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("PageUp"));
		macVim.clearData();
		return true;
	}

	if (e.key === "r" && e.ctrlKey === true && macVim.currentSequence.length === 0) {
		// Redo
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			docs.pressKey(docs.codeFromKey("Y"), true);
		}
		macVim.clearData();
		return true;
	}

	// Paste (no support for numbers/pasting multiple times yet)
	if (e.key === "p" && macVim.currentSequence.length === 0) {
		macVim.paste(e);
		macVim.clearData();
		return true;
	}

	// Paste (no support for numbers/pasting multiple times yet)
	if (e.key === "P" && macVim.currentSequence.length === 0) {
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
		macVim.clearData();
		return true;
	}

	if (e.key === "i" && macVim.currentSequence.length === 0) {
		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if (e.key === "v" && macVim.currentSequence.length === 0) {
		macVim.clearData();
		macVim.visualModeIsLinedBased = false;
		macVim.switchToVisualMode(macVim.visualModeIsLinedBased);
		return true;
	}

	if (e.key === "V" && macVim.currentSequence.length === 0) {
		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[0]) {
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
		}
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
		docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);

		macVim.clearData();
		macVim.visualModeIsLinedBased = true;
		macVim.switchToVisualMode(macVim.visualModeIsLinedBased);
		return true;
	}

	if (e.key.match(/\d+/) && macVim.currentSequence.length === 0) {
		if (e.key === "0" && macVim.num.length !== 0) {
			// 0 is part of the number being typed (ex: "100")
			if (macVim.num.length < 3) {
				// We don't want to crash, so max you can type in is a 3 digit number (999)
				macVim.num += e.key;
			}
		} else if (e.key !== "0") {
			// We have any digit besides 0 being typed (ex: "1" or "11")
			if (macVim.num.length < 3) {
				macVim.num += e.key;
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
		updateUISequenceText(macVim.num + macVim.currentSequence);
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "a" && macVim.currentSequence.length === 0) {
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
			// We are at the end of the file already, do nothing
		} else if (startYCoord === middleYCoord) {
			// We are the in the middle of a line somewhere, do nothing
		} else {
			// We are on the end of a multiline or line
			docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
			let [finalXCoord, finalYCoord] = docs.getCoords();
			if (finalXCoord === startXCoord && finalYCoord === startYCoord) {
				// We were at the end of a line and are back there, do nothing else
			} else {
				// We were at the end of a multiline
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
		}

		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if (e.key === "A" && macVim.currentSequence.length === 0) {
		macVim.moveToEndOfLine();
		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if (e.key === "O" && macVim.currentSequence.length === 0) {
		macVim.moveToStartOfLine();
		docs.pressKey(docs.codeFromKey("Enter"));
		docs.pressKey(docs.codeFromKey("ArrowLeft"));

		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if (e.key === "o" && macVim.currentSequence.length === 0) {
		// Get to the bottom of the current line, then press enter
		macVim.moveToEndOfLine();
		docs.pressKey(docs.codeFromKey("Enter"));

		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if (e.key === "I" && macVim.currentSequence.length === 0) {
		macVim.moveToStartOfLine();

		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if ((e.key === "E" || e.key === "e") && macVim.currentSequence.length === 0) {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [startXCoord, startYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"), true);
			let [endXCoord, endYCoord] = docs.getCoords();
			if (startXCoord === endXCoord && startYCoord === endYCoord) {
				// End of file reached, do nothing
			}
			else {
				// Keep going like regular
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}
		macVim.clearData();
		return true;
	}

	if ((e.key === "w" || e.key === "W") && macVim.currentSequence.length === 0) {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			docs.pressKey(docs.codeFromKey("ArrowRight"), true);
			docs.pressKey(docs.codeFromKey("ArrowRight"));
		}
		macVim.clearData();
		return true;
	}

	if (e.key === "$" && macVim.currentSequence.length === 0) {
		macVim.moveToEndOfLine();
		macVim.clearData();
		return true;
	}

	if (e.key == "x" && macVim.currentSequence.length === 0) {
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
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [finalXCoord, finalYCoord] = docs.getCoords();
				if (finalXCoord === xCoord && finalYCoord === yCoord) {
					// We are dealing with a "Return" and actual new line
					docs.pressKey(docs.codeFromKey("Backspace"));
				} else {
					// We are dealing with a space and just a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
		}
		macVim.clearData();
		return true;
	}

	// ALL Support for d and c multiline commands here

	// D, d$, C, c$
	if (
		(e.key === "D" && macVim.currentSequence.length === 0) ||
		(e.key === "$" && macVim.currentSequence === "d") ||
		(e.key === "C" && macVim.currentSequence.length === 0) ||
		(e.key === "$" && macVim.currentSequence === "c")
	) {
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
			// We are at the end of the file already, do nothing
		} else if (startYCoord === middleYCoord) {
			// We're in the middle of a line
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
		} else {
			// We are on the end of a multiline or line
			docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
			let [endXCoord, endYCoord] = docs.getCoords();
			if (endXCoord === startXCoord && endYCoord === startYCoord) {
				// We are at the end of a line, do nothing
			} else {
				// We are on a multiline

				// Get back to original position
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);

				// Highlight
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
		}

		if (e.key === "C" || macVim.currentSequence === "c") {
			macVim.num = "";
			macVim.currentSequence = "";
			macVim.switchToInsertMode();
			return true;
		}

		macVim.clearData();
		return true;
	}

	// d0, c0
	if (
		(e.key === "0" && macVim.currentSequence === "d") ||
		(e.key === "0" && macVim.currentSequence === "c")
	) {
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord == middleXCoord && startYCoord == middleYCoord) {
			// At start of file, do nothing
		}
		else if (startYCoord === middleYCoord) {
			// In the middle of a line
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
		}
		else {
			// At the start of a line or multiline, figure out which one and then act accordingly
			let [tempXCoord, tempYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [finalXCoord, finalYCoord] = docs.getCoords();
			if (tempYCoord === finalYCoord && tempXCoord === finalXCoord) {
				// The line above us was the start of the file on an empty line, so just go back (we only do
				// one because the last ArrowLeft didn't do anything)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
			else if (tempYCoord !== finalYCoord) {
				// The line above us is empty, so just get back (we were at the start of a line)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
			else {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [finalXCoord, finalYCoord] = docs.getCoords();
				if (finalXCoord === middleXCoord && finalYCoord === middleYCoord) {
					// We were at the start of an enter, just go back
					docs.pressKey(docs.codeFromKey("ArrowRight"));
				}
				else {
					// We were at the start of a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
		}

		if (macVim.currentSequence === "c") {
			macVim.num = "";
			macVim.currentSequence = "";
			macVim.switchToInsertMode();
		}
		else {
			macVim.clearData();
		}

		return true;
	}

	// dd
	if (e.key === "d" && macVim.currentSequence === "d") {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			macVim.moveToEndOfLine();
			let [startXCoord, startYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [midXCoord, midYCoord] = docs.getCoords();
			if (startXCoord === midXCoord && startYCoord === midYCoord) {
				// At the start of the file
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			else if (startYCoord === midYCoord) {
				// In the middle of a line or something
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			else {
				// We are on an empty line
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
		}
		macVim.clearData();
		return true;
	}

	// cc
	if (e.key === "c" && macVim.currentSequence === "c") {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			macVim.moveToEndOfLine();
			let [startXCoord, startYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [midXCoord, midYCoord] = docs.getCoords();
			if (startXCoord === midXCoord && startYCoord === midYCoord) {
				// At the start of the file
				if (i !== numRepeats - 1) {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
			else if (startYCoord === midYCoord) {
				// In the middle of a line or something
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
				if (i !== numRepeats - 1) {
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
			else {
				// We are on an empty line
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				if (i !== numRepeats - 1) {
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
		}
		macVim.clearData();
		macVim.switchToInsertMode();
		return true;

	}

	// diw, ciw
	if (
		(e.key === "w" && macVim.currentSequence === "di") ||
		(e.key === "w" && macVim.currentSequence === "ci")
	) {
		const numRepeats = parseInt(macVim.num) || 1;
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

		if (macVim.currentSequence === "ci") {
			macVim.currentSequence = "";
			macVim.num = "";
			macVim.switchToInsertMode();
		}
		else {
			macVim.clearData();
		}
		return true;
	}

	// y$
	if (e.key === "$" && macVim.currentSequence === "y") {
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
			// We are at the end of the file already, do nothing
			navigator.clipboard.writeText("");
		} else if (startYCoord === middleYCoord) {
			// We're in the middle of a line
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		} else {
			// We are on the end of a multiline or line
			docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
			let [endXCoord, endYCoord] = docs.getCoords();
			if (endXCoord === startXCoord && endYCoord === startYCoord) {
				// We are at the end of a line, do nothing
				navigator.clipboard.writeText("");
			} else {
				// We are on a multiline

				// Get back to original position
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);

				// Highlight, copy, deselect
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.contentDocument.execCommand("copy");
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}

		macVim.clearData();
		return true;
	}

	// y0
	if (e.key === "0" && macVim.currentSequence === "y") {
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord == middleXCoord && startYCoord == middleYCoord) {
			// At start of file, do nothing
			navigator.clipboard.writeText("");
		}
		else if (startYCoord === middleYCoord) {
			// In the middle of a line
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		else {
			// At the start of a line or multiline, figure out which one and then act accordingly
			let [tempXCoord, tempYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [finalXCoord, finalYCoord] = docs.getCoords();
			if (tempYCoord === finalYCoord && tempXCoord === finalXCoord) {
				// The line above us was the start of the file on an empty line, so just go back (we only do
				// one because the last ArrowLeft didn't do anything)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				navigator.clipboard.writeText("");
			}
			else if (tempYCoord !== finalYCoord) {
				// The line above us is empty, so just get back (we were at the start of a line)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				navigator.clipboard.writeText("");
			}
			else {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [finalXCoord, finalYCoord] = docs.getCoords();
				if (finalXCoord === middleXCoord && finalYCoord === middleYCoord) {
					// We were at the start of an enter, just go back
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					navigator.clipboard.writeText("");
				}
				else {
					// We were at the start of a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
					docs.contentDocument.execCommand("copy");
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
			}
		}

		macVim.clearData();
		return true;
	}

	// yy or Y
	if ((e.key === "y" && macVim.currentSequence === "y") || (e.key === "Y" && macVim.currentSequence === "")) {
		// Unlike y0 or y$ on an empty line we want to copy the empty line/enter if we're on one
		let [xCoord, yCoord] = docs.getCoords(); // Handy later for getting back to original position
		macVim.moveToEndOfLine();
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		let [midXCoord, midYCoord] = docs.getCoords();
		if (startXCoord === midXCoord && startYCoord === midYCoord) {
			// At the start of the file
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		else if (startYCoord === midYCoord) {
			// Not on start of line
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));

		}
		else {
			// We are on an empty line
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}

		// Now we need to find where we were and go back there potentially
		let startTime = Date.now();
		let [newXCoord, newYCoord] = docs.getCoords();
		while (newXCoord !== xCoord || newYCoord !== yCoord) {
			let curTime = Date.now();

			if (curTime - startTime > 1500) {
				// This is a safeguard to prevent freezing. If traversing back takes more than 1500 milliseconds,
				// (1.5 seconds), we break out
				break;
			}
			if (newYCoord < yCoord) {
				docs.pressKey(docs.codeFromKey("ArrowDown"));
			} else if (newYCoord > yCoord) {
				docs.pressKey(docs.codeFromKey("ArrowUp"));
			}

			if (newXCoord < xCoord) {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			} else if (newXCoord > xCoord) {
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}

			[newXCoord, newYCoord] = docs.getCoords();
		}

		macVim.clearData();
		return true;

	}

	macVim.currentSequence += e.key; // Add the current key to the sequence

	// If the current sequence is in the keyMaps, then execute the command
	if (macVim.currentSequence in macVim.keyMaps) {
		macVim.keyMaps[macVim.currentSequence].forEach(([key, ...args]) => {
			let numRepeats = parseInt(macVim.num) || 1;

			// For 'gg' and 'G', we only want to run it once no matter what
			if (macVim.currentSequence === "G" || macVim.currentSequence === "gg") {
				numRepeats = 1;
			}

			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey(key), ...args);
			}
		});
		macVim.clearData();
		return;
	}

	// r for replace command:
	if (
		macVim.currentSequence[0] === "r" &&
		macVim.currentSequence.length === 2
	) {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
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
					// Empty line
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
					docs.pressKey(macVim.currentSequence.charCodeAt(1));
				} else if (rightXCoord === xCoord && rightYCoord === yCoord) {
					// We are at the end of the file on an empty line
					docs.pressKey(macVim.currentSequence.charCodeAt(1));
				} else {
					docs.pressKey(docs.codeFromKey("Backspace"));
					docs.pressKey(macVim.currentSequence.charCodeAt(1));
				}
			}
			// We are not at the start of a file or line, so we have to check if we're at the end of a line,
			// middle of a line, or end of a file
			else {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				let [newXCoord, newYCoord] = docs.getCoords();
				if (xCoord === newXCoord && yCoord === newYCoord) {
					// We are at the end of the file, guaranteed to not be an empty line from above
					// Don't backspace
					docs.pressKey(macVim.currentSequence.charCodeAt(1));
				} else if (yCoord === newYCoord) {
					// We are in the middle of the line somewhere or something, standard procedure
					docs.pressKey(docs.codeFromKey("Backspace"));
					docs.pressKey(macVim.currentSequence.charCodeAt(1));
				} else {
					// We've either passed a space or a return that has put us one multiline or line down
					docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
					let [finalXCoord, finalYCoord] = docs.getCoords();
					if (finalXCoord === xCoord && finalYCoord === yCoord) {
						// We are dealing with a "Return" and actual new line
						// Don't hit backspace since we're at the end of the line
						docs.pressKey(macVim.currentSequence.charCodeAt(1));
					} else {
						// We are dealing with a space and just a multiline
						docs.pressKey(docs.codeFromKey("ArrowRight"), true);
						docs.pressKey(docs.codeFromKey("ArrowRight"));
						docs.pressKey(docs.codeFromKey("Backspace"));
						docs.pressKey(macVim.currentSequence.charCodeAt(1));
					}
				}
			}
		}

		macVim.clearData();
		return true;
	}

	if (
		macVim.currentSequence.length !== 0 &&
		!macVim.incompleteKeyMaps.includes(macVim.currentSequence)
	) {
		// This means that the current sequence is invalid, so we have to reset it
		macVim.clearData();
		return true;

	}

	// Basically catch here anything that is a valid keymap but is not fully finished typing yet (ex: "g", but not "gg" yet)
	updateUISequenceText(macVim.num + macVim.currentSequence);
	docs.setCursorWidth();
	return true;
};

// Called in visual mode.
macVim.visual_keydown = function (e) {
	if (e.key.match(/F\d+/)) {
		// Pass through any function keys.
		return true;
	}

	e.preventDefault();
	e.stopPropagation();

	if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
		// Shift by itself does nothing
		return true;
	}

	if ((e.key === "Escape") || (e.key === "c" && e.ctrlKey === true)) {
		// Escape visual mode.
		docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
		// go to the right side when the left side could be a solution as well
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if ((e.key === "U" || e.key === "u") && macVim.currentSequence.length === 0 && !e.ctrlKey) {
		// Escape visual mode.
		docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
		// go to the right side when the left side could be a solution as well
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if (e.key === "r" && e.ctrlKey === true && macVim.currentSequence.length === 0) {
		// Escape visual mode.
		docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
		// go to the right side when the left side could be a solution as well
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if (e.key === "p" && macVim.currentSequence.length === 0) {
		// We have to first delete the highlighted text, then paste in the clipboard
		docs.pressKey(docs.codeFromKey("Backspace"));
		macVim.paste(e);
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if (e.key === "P" && macVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("Backspace"));
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
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if (e.key === "I" && macVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if ((e.key === "v" || e.key === "V") && macVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if (e.key.match(/\d+/) && macVim.currentSequence.length === 0) {
		if (e.key === "0" && macVim.num.length !== 0) {
			// 0 is part of the number being typed (ex: "100")
			if (macVim.num.length < 3) {
				// We don't want to crash, so max you can type in is a 3 digit number (999)
				macVim.num += e.key;
			}
		} else if (e.key !== "0") {
			// We have any digit besides 0 being typed (ex: "1" or "11")
			if (macVim.num.length < 3) {
				macVim.num += e.key;
			}
		} else {
			docs.pressKey(docs.codeFromKey("Home"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
		}
		updateUISequenceText(macVim.num + macVim.currentSequence);
		docs.setCursorWidth();
		return true;
	}

	if (e.key === "A" && macVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		if (macVim.visualModeIsLinedBased) {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[3]) {
				// If we're not at the end of a file, move left
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}
		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if (e.key === "$" && macVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
		docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
		macVim.clearData();
		return true;
	}

	if (e.key === "x" && macVim.currentSequence.length === 0) {
		docs.contentDocument.execCommand("cut");
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if (e.key === "d" && macVim.currentSequence.length === 0 && !e.ctrlKey) {
		docs.pressKey(docs.codeFromKey("Backspace"));
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	if (e.key === "c" && macVim.currentSequence.length === 0) {
		docs.pressKey(docs.codeFromKey("Backspace"));
		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if ((e.key === "D" || e.key === "C") && macVim.currentSequence.length === 0) {
		// Delete the whole line(s) that we partially selected
		docs.pressKey(docs.codeFromKey("Backspace"));

		// Now we need to just need to basically do the same logic as "dd" or "cc"
		if (e.key === "D") {
			macVim.moveToEndOfLine();
			let [startXCoord, startYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [midXCoord, midYCoord] = docs.getCoords();
			if (startXCoord === midXCoord && startYCoord === midYCoord) {
				// At the start of the file
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			else if (startYCoord === midYCoord) {
				// In the middle of a line or something
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			else {
				// We are on an empty line
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
			}

			macVim.clearData();
			macVim.switchToNormalMode();
			return true;
		}
		else if (e.key === "C") {
			macVim.moveToEndOfLine();
			let [startXCoord, startYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [midXCoord, midYCoord] = docs.getCoords();
			if (startXCoord === midXCoord && startYCoord === midYCoord) {
				// Do nothing
			}
			else if (startYCoord === midYCoord) {
				// In the middle of a line or something
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			else {
				// We are on an empty line
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}

			macVim.clearData();
			macVim.switchToInsertMode();
			return true;
		}

		macVim.clearData();
		return true;
	}

	if (e.key === "y" && macVim.currentSequence.length === 0) {
		docs.contentDocument.execCommand("copy");
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		macVim.clearData();
		macVim.switchToNormalMode();
		return true;
	}

	// Now we do checks that only apply to line-based visual mode, where we do not follow the norm
	if (macVim.visualModeIsLinedBased) {
		// Left and right traversal now do nothing
		let doNothingKeys = ["h", "l", "b", "B", "e", "E", "w", "W"];
		if (doNothingKeys.includes(e.key) && macVim.currentSequence.length === 0) {
			macVim.clearData();
			return true;
		}

		if (e.key === "k" && macVim.currentSequence.length === 0) {
			const numRepeats = parseInt(macVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			}
			macVim.clearData();
			return true;
		}

		if (e.key === "j" && macVim.currentSequence.length === 0) {
			// We need to handle j differently on Mac because of Apple's weird behavior around empty lines
			const numRepeats = parseInt(macVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
			}
			macVim.clearData();
			return true;
		}

		if (e.key === "d" && e.ctrlKey === true && macVim.currentSequence.length === 0) {
			// Ctrl-d is page down
			docs.pressKey(docs.codeFromKey("PageDown"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			macVim.clearData();
			return true;
		}
		if (e.key === "u" && e.ctrlKey === true && macVim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("PageUp"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			macVim.clearData();
			return true;
		}
	}
	
	// Page up/down if we are not line based visual mode
	if (e.key === "d" && e.ctrlKey == true && macVim.currentSequence.length === 0) {
		// Page down
		docs.pressKey(docs.codeFromKey("PageDown"), false, true);
	}

	if (e.key === "u" && e.ctrlKey == true && macVim.currentSequence.length === 0) {
		// Page up
		docs.pressKey(docs.codeFromKey("PageUp"), false, true);
	}

	if ((e.key === "w" || e.key === "W") && macVim.currentSequence.length === 0) {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
		}
		macVim.clearData();
		return true;
	}

	if (e.key === "r" && macVim.length === 0) {
		// Invalid
		macVim.clearData();
		return true;
	}

	macVim.currentSequence += e.key;

	if (macVim.currentSequence in macVim.differentVisualKeyMaps) {
		macVim.differentVisualKeyMaps[macVim.currentSequence].forEach(
			([key, ...args]) => {
				const numRepeats = parseInt(macVim.num) || 1;
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
		macVim.clearData();
		return true;
	} else if (macVim.currentSequence in macVim.keyMaps) {
		macVim.keyMaps[macVim.currentSequence].forEach(([key, ...args]) => {
			const numRepeats = parseInt(macVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				// get the special keys pressed and default to false
				const keyArgs = [...args, false, false].slice(0, 2);
				keyArgs[1] = true;
				docs.pressKey(docs.codeFromKey(key), ...keyArgs);
			}
		});
		macVim.clearData();
		return true;
	}

	if (
		macVim.currentSequence.length !== 0 &&
		!macVim.incompleteKeyMaps.includes(macVim.currentSequence)
	) {
		// This means that the current sequence is invalid, so we have to reset it
		macVim.num = "";
		macVim.currentSequence = "";
	}

	updateUISequenceText(macVim.num + macVim.currentSequence);
	return true;
};

export { macVim };
