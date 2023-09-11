import { baseVim } from "./baseVim.js";
import { docs } from "../docs.js";
import { updateUIModeText, updateUISequenceText } from "./UI.js";

// Add on top of base vim to work on mac machines
let macVim = {
	__proto__: baseVim,
};

// On Mac just ArrowDown + ctrl won't actually bring you down a line after you have a line highlighted
macVim.differentVisualKeyMaps["}"] = [["ArrowRight", true, true], ["ArrowDown", true, true]];

// List of shortcuts for visual mode that we will let pass through (ex: Command + B to bold)
// NOTE: The letters have to be lowercase, even if shift=True is part of the combination for some reason
macVim.visualShortcuts = [
	// e.key, e.altKey, e.ctrlKey, e.metaKey, e.shiftKey
	["b", false, false, true, false], // Bold (Command + B)
	["i", false, false, true, false], // Italic (Command + I)
	["X", false, false, true, true], // Strikethrough (Command + Shift + X)
    ["f", false, false, true, false], // Search (Command + F)
    ["l", false, false, true, true], //  Left-align text (Command + Shift + L)
    ["r", false, false, true, true], // Right-align text (Command + Shift + R)
    ["e", false, false, true, true], // Center-align text (Command + Shift + E)
    ["j", false, false, true, true], // Justify text (Command + Shift + J)
	["a", false, false, true, false], // Select all (Command + A)
]

macVim.normalShortcuts = [
	// e.key, e.altKey, e.ctrlKey, e.metaKey, e.shiftKey
    ["f", false, false, true, false], // Search (Command + F)
    ["l", false, false, true, true], //  Left-align text (Command + Shift + L)
    ["r", false, false, true, true], // Right-align text (Command + Shift + R)
    ["e", false, false, true, true], // Center-align text (Command + Shift + E)
    ["j", false, false, true, true], // Justify text (Command + Shift + J)
	["a", false, false, true, false], // Select all (Command + A)
]


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
	docs.pressKey(docs.codeFromKey("ArrowLeft"));
	let [midXCoord, midYCoord] = docs.getCoords();
	if (startXCoord === midXCoord && startYCoord === midYCoord) {
		// At start of file, test to ensure it's not an empty line
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let [endXCoord, endYCoord] = docs.getCoords();

		if (endYCoord !== midYCoord) {
			// On an empty line, just go back to it
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		else {
			// Not an empty line, safe to control + arrow
			docs.pressKey(docs.codeFromKey("ArrowLeft")); // Go back
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
		}
	}
	else {
		docs.pressKey(docs.codeFromKey("ArrowDown"), true);
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

	let checkIfNativeShortcut = [e.key, e.altKey, e.ctrlKey, e.metaKey, e.shiftKey];

	// Check if the native shortcut is in the normalShortcuts
	for (let i = 0; i < macVim.normalShortcuts.length; i++) {
		let equal = true;
		for (let j = 0; j < macVim.normalShortcuts[i].length; j++) {
			if (macVim.normalShortcuts[i][j] !== checkIfNativeShortcut[j]) {
				equal = false;
				break;
			}
		}
		if (equal) {
			if (e.key === "a" && e.metaKey === true) {
				// Select all text --> Switch to visual mode
				macVim.visualModeIsLinedBased = false;
				macVim.switchToVisualMode();
			}
			macVim.clearData();
			return true;
		}
	}

	e.preventDefault();
	e.stopPropagation();

	if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
		// Shift by itself does nothing
		return true;
	}

    if (e.key === "ArrowLeft" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
        }
        macVim.clearData();
        return true;
    }

    if (e.key === "ArrowRight" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowRight"), true);
        }
        macVim.clearData();
        return true;
    }

    if (e.key === "ArrowUp" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
        }
        macVim.clearData();
        return true;
    }

    if (e.key === "ArrowDown" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowDown"), true);
        }
        macVim.clearData();
        return true;
    }

	if (e.key === "Escape" || (e.key === "c" && e.ctrlKey === true)) {
		// Remove any saved queries that the user had
		macVim.clearData();
		return true;
	}

    // Search
    if (e.key === "/" && macVim.currentSequence.length === 0) {
	    docs.pressKey(docs.codeFromKey("f"), true);
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
			macVim.moveToStartOfLine();
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
		const numRepeats = parseInt(macVim.num) || 1;
		macVim.moveToStartOfLine();

		for (let i = 0; i < numRepeats; i++) {
			docs.pressKey(docs.codeFromKey("Enter"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}

		macVim.clearData();
		macVim.switchToInsertMode();
		return true;
	}

	if (e.key === "o" && macVim.currentSequence.length === 0) {
		// Get to the bottom of the current line, then press enter
		const numRepeats = parseInt(macVim.num) || 1;
		macVim.moveToEndOfLine();

		for (let i = 0; i < numRepeats; i++) {
			docs.pressKey(docs.codeFromKey("Enter"));
		}

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

	// "x" and "s"
	if ((e.key == "x" && macVim.currentSequence.length === 0) || (e.key === "s" && macVim.currentSequence.length === 0)) {
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
	}

		if (e.key === "x") {
			macVim.clearData();
		}
		else {
			macVim.currentSequence = "";
			macVim.num = "";
			macVim.switchToInsertMode();
		}
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

    // "dw", "dW"
    if ((e.key === "w" || e.key === "W") && macVim.currentSequence === "d") {
        // 2 potential choices/scenarios:

        // 1:
        // Determine if we are at the end of a line
        // If we are at the end of a line, delete one character (or none if we are on an empty line)

        // 2: 
        // If we are not at the end of a line, proceed normally (highlight to the right, then hit delete)
        // After: If we are not at the end of a line, arrow left back one to be on the right character

		let numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let [initialXCoord, initialYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [middleXCoord, middleYCoord] = docs.getCoords();
			if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
				// We are at the end of the file (and line subsequently)
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			else if (initialYCoord !== middleYCoord) {
				// Determine if we are at the end of a line or a multiline
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
					// We are at the end of a real line

					// Just delete the last character then
					docs.pressKey(docs.codeFromKey("Backspace"));
					let [afterBackspaceXCoord, afterBackspaceYCoord] = docs.getCoords();
					if (afterBackspaceXCoord === initialXCoord && afterBackspaceYCoord === initialYCoord) {
						// We just hit backspace, but we didn't move anywhere --> We are at the start of the file on an empty line
						// Let's actually delete that empty line then by moving forward and deleting
						docs.pressKey(docs.codeFromKey("ArrowRight"));
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
					else if (afterBackspaceYCoord !== initialYCoord) {
						// We deleted an empty line --> Move the cursor down to the right position
						docs.pressKey(docs.codeFromKey("ArrowRight"));
					}
				}
				else {
					docs.pressKey(docs.codeFromKey("ArrowRight"), true); // Get back to original position
					// We are at the end of a multiline

					// Delete (just the space)
					docs.pressKey(docs.codeFromKey("Delete"));
				}
			}
			else {
				// On a multiline
				docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

				docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                let textNotSelected = docs.contentDocument.getSelection(0).getRangeAt(0).startOffset;
				if (textNotSelected) {
					// Proceed normally, no chance it's a space
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
				else {
					// Text is highlighted
					// Need to check again
					docs.pressKey(docs.codeFromKey("ArrowRight")); // Text is not highlighted after this
					let [xPos, yPos] = docs.getCoords();
					if (xPos === middleXCoord && yPos === middleYCoord) {
						// If we moved only one place to the right --> On a space
						// We are on a space
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
					else {
						// Normal procedure
						docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
				}
			}
		}

		macVim.clearData();
		return true;
    }

	// "cw", "cW"
    if ((e.key === "w" || e.key === "W") && macVim.currentSequence === "c") {
        // 2 potential choices/scenarios:

        // 1:
        // Determine if we are at the end of a line
        // If we are at the end of a line, delete one character (or none if we are on an empty line)

        // 2:
        // If we are not at the end of a line, proceed normally (highlight to the right, then hit delete)
        // After: If we are not at the end of a line, arrow left back one to be on the right character

		let numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let [initialXCoord, initialYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [middleXCoord, middleYCoord] = docs.getCoords();
			if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
				// We are at the end of the file (and line subsequently)
				// Now we check if we're on an empty line (if we are, we don't backspace anything)

				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				let [endXCoord, endYCoord] = docs.getCoords();

				if (endYCoord !== initialYCoord) {
					// We were on an empty line at the end, just go back and be done (do nothing)
					docs.pressKey(docs.codeFromKey("ArrowRight"));
				}
				else {
					// There is stuff on the line so we have to go back and delete it actually
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
			else if (initialYCoord !== middleYCoord) {
				// Determine if we are at the end of a line or a multiline
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
					// We are at the end of a real line

					// Just delete the last character then

					// Now we check if the line is empty
					// If it is: Do nothing
					// If there is something: Delete it
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
					let [finalXCoord, finalYCoord] = docs.getCoords();
					if (finalYCoord !== initialYCoord) {
						// Was an empty line, go back and do nothing
						docs.pressKey(docs.codeFromKey("ArrowRight"));
					}
					else if (finalYCoord === initialYCoord && finalXCoord === initialXCoord) {
						// At the start of the file on an empty line, do nothing
					}
					else {
						// Line had something on it, delete it
						docs.pressKey(docs.codeFromKey("ArrowRight"));
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
				}
				else {
					docs.pressKey(docs.codeFromKey("ArrowRight"), true); // Get back to original position
					// We are at the end of a multiline, so just delete the space
					docs.pressKey(docs.codeFromKey("Delete"))

				}
			}
			else {
				// On a multiline, highlight and delete
				docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

				docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
				let textNotSelected = docs.contentDocument.getSelection(0).getRangeAt(0).startOffset;
				if (textNotSelected) {
					// Proceed normally, no chance it's a space
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
				else {
					// Text is highlighted
					// Need to check again
					docs.pressKey(docs.codeFromKey("ArrowRight")); // Text is not highlighted after this
					let [xPos, yPos] = docs.getCoords();
					if (xPos === middleXCoord && yPos === middleYCoord) {
						// If we moved only one place to the right --> On a space
						// We are on a space
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
					else {
						// Normal procedure
						docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
				}
			}
		}

		macVim.currentSequence = "";
		macVim.num = "";
		macVim.switchToInsertMode();
		return true;
    }
		

	// dd 
	if (e.key === "d" && macVim.currentSequence === "d") {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			macVim.moveToEndOfLine();
			let [startXCoord, startYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [endXCoord, endYCoord] = docs.getCoords();
			let atEndOfFile = false;
			if (startXCoord === endXCoord && startYCoord === endYCoord) {
				atEndOfFile = true;
			}
			else {
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
			
			// The magic sauce
			docs.pressSpecialKey(" ");
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));

			if (atEndOfFile) {
				docs.pressKey(docs.codeFromKey("Backspace"));
				macVim.moveToStartOfLine();
			}
			else {
				docs.pressKey(docs.codeFromKey("Delete"));
			}

		}
		macVim.clearData();
		return true;
	}

	// cc 
	if ((e.key === "c" && macVim.currentSequence === "c") || (e.key === "S" && macVim.currentSequence.length === 0)) {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			macVim.moveToEndOfLine();
			let [startXCoord, startYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [endXCoord, endYCoord] = docs.getCoords();
			let atEndOfFile = false;
			if (startXCoord === endXCoord && startYCoord === endYCoord) {
				atEndOfFile = true;
			}
			else {
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
			
			// The magic sauce
			docs.pressSpecialKey(" ");
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));

			if (i < numRepeats - 1) {
				// Actually delete the empty line now if we're not on the last iteration
				if (atEndOfFile) {
					docs.pressKey(docs.codeFromKey("Backspace"));
					macVim.moveToStartOfLine();
				}
				else {
					docs.pressKey(docs.codeFromKey("Delete"));
				}
				}

		}

		macVim.currentSequence = "";
		macVim.num = "";
		macVim.switchToInsertMode();
		return true;

	}

	// diw, ciw (don't delete spaces + other differences)
	if (e.key === "w" && (macVim.currentSequence === "di" || macVim.currentSequence === "ci")) {
		let numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let atEndOfLine = false;
			let [initialXCoord, initialYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [middleXCoord, middleYCoord] = docs.getCoords();
			if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
				// End of file
				atEndOfLine = true;
			}
			else if (initialYCoord === middleYCoord) {
				// Middle of line
				docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

				// Get into position
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true)
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === middleXCoord && endYCoord === middleYCoord) {
					// This means we were on a space --> delete
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
				else {
					// We were on a character --> delete
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressSpecialKey(" ");
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
			else {
				// We are at the end of a line or multiline, we need to check which one
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
					// At the end of a line
					atEndOfLine = true;
				}
				else {
					// At the end of a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("Delete"));
				}
			}

			if (atEndOfLine) {
				let [startXCoord, startYCoord] = docs.getCoords();
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endYCoord !== startYCoord) {
					// Empty line, do nothing (just go back)
					docs.pressKey(docs.codeFromKey("ArrowRight"));
				}
				else if (endYCoord === startYCoord && endXCoord === startXCoord) {
					// At start of file on an empty line, do nothing
				}
				else {
					// The line has stuff on it (regular case)
					docs.pressKey(docs.codeFromKey("ArrowRight")); // Get back to where we were

					// Delete stuff at the end of the line
					docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					let textNotSelected = docs.contentDocument.getSelection(0).getRangeAt(0).startOffset;
					if (textNotSelected) {
						// No trailing spaces to worry about or anything
						docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
					else {
						// Trailing spaces are currently highlighted, which we will destroy
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
				}
				
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

	// daw, caw
	if (
		(e.key === "w" && macVim.currentSequence === "da") ||
		(e.key === "w" && macVim.currentSequence === "ca")
	) {
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let atEndOfLine = false;
			let [initialXCoord, initialYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [middleXCoord, middleYCoord] = docs.getCoords();
			if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
				// At end of file
				atEndOfLine = true;
			}
			else if (initialYCoord === middleYCoord) {
				// In the middle of a line
				docs.pressKey(docs.codeFromKey("ArrowLeft"));

				// Get into position
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true)
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === middleXCoord && endYCoord === middleYCoord) {
					// This means we were on a space --> delete
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
				else {
					// We were on a character --> delete
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}

			}
			else {
				// We are at the end of a line or multiline, we need to check which one
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
					// At the end of a line
					atEndOfLine = true;
				}
				else {
					// At the end of a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}

			if (atEndOfLine) {
				let [startXCoord, startYCoord] = docs.getCoords();
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endYCoord !== startYCoord) {
					// Empty line
					docs.pressKey(docs.codeFromKey("Delete"));
					docs.pressKey(docs.codeFromKey("ArrowRight"));
				}
				else if (endYCoord === startYCoord && endXCoord === startXCoord) {
					// At start of file on an empty line
					docs.pressKey(docs.codeFromKey("Delete"));
				}
				else {
					docs.pressKey(docs.codeFromKey("ArrowRight")); // Get back to where we were

					// Delete stuff at the end of the line
					docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					let textNotSelected = docs.contentDocument.getSelection(0).getRangeAt(0).startOffset;
					if (textNotSelected) {
						// No trailing spaces to worry about or anything
						docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
						docs.pressKey(docs.codeFromKey("Backspace"));

						let [startXPosCoord, startYPosCoord] = docs.getCoords();
						docs.pressKey(docs.codeFromKey("Backspace"));
						let [endPosXCoord, endPosYCoord] = docs.getCoords();
						if (startYPosCoord !== endPosYCoord) {
							docs.pressKey(docs.codeFromKey("Z"), true);
							docs.pressKey(docs.codeFromKey("Backspace"));
						}
					}
					else {
						// Trailing spaces are currently highlighted, which we will destroy
						docs.pressKey(docs.codeFromKey("Backspace"));
						docs.pressKey(docs.codeFromKey("Delete")); // **Different than Windows** Like actual vim, we now have to bring the previous line up

						// Delete the next word on the next line as well (one arrow right for the enter, one for the actual word)
						docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
						docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
				}
			}
		}

		if (macVim.currentSequence === "ca") {
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
		(macVim.currentSequence[0] === "r" &&
		macVim.currentSequence.length === 2) || (macVim.currentSequence === "rTab")
	) {
		let keyCharacter = macVim.currentSequence.slice(1);

		let keyFunc = docs.pressKey
		let keyFuncInput = macVim.currentSequence.charCodeAt(1);

        if ("-,. '!#$%&*()+\“-".indexOf(keyCharacter) > -1 || keyCharacter === "Tab" || keyCharacter === "\"") {
            // Instead of using the regular press Key, we need to handle edge cases of special keys
            keyFunc = docs.pressSpecialKey;
            keyFuncInput = keyCharacter; // We will pass in the actual char/string instead of the numeric code
        }

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
					keyFunc(keyFuncInput);
				} else if (rightXCoord === xCoord && rightYCoord === yCoord) {
					// We are at the end of the file on an empty line
					keyFunc(keyFuncInput);
				} else {
					docs.pressKey(docs.codeFromKey("Backspace"));
					keyFunc(keyFuncInput);
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
					keyFunc(keyFuncInput);
				} else if (yCoord === newYCoord) {
					// We are in the middle of the line somewhere or something, standard procedure
					docs.pressKey(docs.codeFromKey("Backspace"));
					keyFunc(keyFuncInput);
				} else {
					// We've either passed a space or a return that has put us one multiline or line down
					docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
					let [finalXCoord, finalYCoord] = docs.getCoords();
					if (finalXCoord === xCoord && finalYCoord === yCoord) {
						// We are dealing with a "Return" and actual new line
						// Don't hit backspace since we're at the end of the line
						keyFunc(keyFuncInput);
					} else {
						// We are dealing with a space and just a multiline
						docs.pressKey(docs.codeFromKey("ArrowRight"), true);
						docs.pressKey(docs.codeFromKey("ArrowRight"));
						docs.pressKey(docs.codeFromKey("Backspace"));
						keyFunc(keyFuncInput);
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

	// Check if the key is a Google Docs native shortcut
	let checkIfNativeShortcut = [e.key, e.altKey, e.ctrlKey, e.metaKey, e.shiftKey];

	// Check if the native shortcut is in the macVim.visualShortcuts
	for (let i = 0; i < macVim.visualShortcuts.length; i++) {
		let equal = true;
		for (let j = 0; j < macVim.visualShortcuts[i].length; j++) {
			if (macVim.visualShortcuts[i][j] !== checkIfNativeShortcut[j]) {
				equal = false;
				break;
			}
		}
		if (equal) {
			macVim.clearData();
			return true;
		}
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

    // Search
    if (e.key === "/" && macVim.currentSequence.length === 0) {
	    docs.pressKey(docs.codeFromKey("f"), true);
        macVim.clearData();
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
		docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
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
		let doNothingKeys = ["h", "l", "b", "B", "e", "E", "w", "W", "ArrowLeft", "ArrowRight"];
		if (doNothingKeys.includes(e.key) && macVim.currentSequence.length === 0) {
			macVim.clearData();
			return true;
		}

		if ((e.key === "k" && macVim.currentSequence.length === 0) || (e.key === "ArrowUp" && macVim.currentSequence.length === 0)) {
			const numRepeats = parseInt(macVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			}
			macVim.clearData();
			return true;
		}

		if ((e.key === "j" && macVim.currentSequence.length === 0) || (e.key === "ArrowDown" && macVim.currentSequence.length === 0)) {
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

    if (e.key === "ArrowLeft" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
        }
        macVim.clearData();
        return true;
    }

    if (e.key === "ArrowRight" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
        }
        macVim.clearData();
        return true;
    }

    if (e.key === "ArrowUp" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
        }
        macVim.clearData();
        return true;
    }

    if (e.key === "ArrowDown" && e.altKey === true && macVim.currentSequence.length === 0) {
        const numRepeats = parseInt(macVim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
        }
        macVim.clearData();
        return true;
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
