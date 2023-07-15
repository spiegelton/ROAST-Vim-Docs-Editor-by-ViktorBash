import { docs } from "../docs.js";
import { updateUIModeText, updateUISequenceText } from "./UI.js";

// baseVim is inherited by both macVim and windowsVim, and provides keyboard system agnostic functions/info

let baseVim = {
	// Main variables here
	mode: "insert", // Keep track of current mode, options: ["insert", "normal", "visual"]
	num: "", // Keep track of number keys pressed by the user if they want to repeat a command
	currentSequence: "", // Keep track of key sequences (ex: "gg")
	visualModeIsLinedBased: false, // Whether visual mode is line based (V) or regular (v), this is set before calling switchToVisualMode()
	// Basic commands have their keymaps here, instead of in the functions later on
	keyMaps: {
		Backspace: [["ArrowLeft"]],
		b: [["ArrowLeft", true]], // ctrl + <-
		B: [["ArrowLeft", true]], // ctrl + <-
		h: [["ArrowLeft"]],
		j: [["ArrowDown"]],
		k: [["ArrowUp"]],
		l: [["ArrowRight"]],
		gg: [["Home", true]],
		G: [["End", true]],
		u: [["Z", true]],
		U: [["Z", true]],
	},
	incompleteKeyMaps: ["g", "r", "d", "c", "y", "di", "ci"], // Stores the starting substrings of multiline commands, ex: 'diw' would have 'di' and 'd' in here
	// di for diw, ci for ciw
	differentVisualKeyMaps: { // Some of the commands for the same key are different in visual mode, and if so, they are stored here
		gg: [["Home", true, true]],
		G: [["End", true, true]],
		e: [["ArrowRight", true, true]], // ctrl + ->
		E: [["ArrowRight", true, true]], // ctrl + ->
	},
};

baseVim.switchToNormalMode = function () {
	baseVim.currentSequence = "";
	baseVim.mode = "normal";
	baseVim.num = "";
	updateUISequenceText("");
	updateUIModeText("-- NORMAL --");
	docs.setCursorWidth();
};

baseVim.switchToVisualMode = function (isLineBased = false) {
	baseVim.currentSequence = "";
	baseVim.mode = "visual";
	baseVim.num = "";
	updateUISequenceText("");
	if (!isLineBased) {
		updateUIModeText("-- VISUAL --");
	} else {
		updateUIModeText("-- VISUAL LINE --");
	}
	docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
	docs.setCursorWidth();
};

baseVim.switchToInsertMode = function () {
	baseVim.currentSequence = "";
	baseVim.mode = "insert";
	baseVim.num = "";
	updateUISequenceText("");
	updateUIModeText("-- INSERT --");
	docs.setCursorWidth(true);
};

/*
 * This function copies a whole line and keeps the cursor in the original position
*/
baseVim.copyWholeLine = async function () {
	let cursorLocations = docs.getCursorLocations();
	if (cursorLocations[0] && cursorLocations[3]) {
		// We are at the start of a line and at the end of the file, there's nothing
		// really to copy besides a blank line
		docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
		docs.contentDocument.execCommand("copy");
		docs.pressKey(docs.codeFromKey("ArrowRight"));
	} else {
		let [xCoord, yCoord] = docs.getCoords(); // This is how we will know our original location

		if (cursorLocations[0]) {
			// We are at the start of a line, so move to the right so that going up works properly
			docs.pressKey(docs.codeFromKey("ArrowRight"));
		}

		// Here we traverse up and select the whole section we were on and copy it
		docs.pressKey(docs.codeFromKey("ArrowUp"), true);
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
		docs.contentDocument.execCommand("copy");
		docs.pressKey(docs.codeFromKey("ArrowRight")); // We are at the end, now we have to get back to our original location

		let [newXCoord, newYCoord] = docs.getCoords();

		let startTime = Date.now();
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
			newXCoord = parseInt(newXCoord);
			newYCoord = parseInt(newYCoord);
		}
	}
	baseVim.num = "";
	baseVim.currentSequence = "";
	updateUISequenceText("");
	// Not updating cursor because we're at the same place
};

/*
* Paste whatever is in the clipboard at the appropriate place (lot of logic to move the cursor around)
* You don't just simply paste because for 'p', you paste after the cursor, so there's logic to deal
* with stuff like being at the end of a line or multiline
*/
baseVim.paste = async function (e) {
	// The main thing is to check that if we're at the end, are we at the end of a multiline or real line
	let [xCoord, yCoord] = docs.getCoords();
	docs.pressKey(docs.codeFromKey("ArrowLeft")); // We do this to check if we're at the start of a line
	let [leftXCoord, leftYCoord] = docs.getCoords();
	if (leftXCoord === xCoord && leftYCoord === yCoord) {
		// We are the start of a file
		let startYCoord = docs.getYCoord();
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let endYCoord = docs.getYCoord();
		if (startYCoord !== endYCoord) {
			// We are at the start of an empty line, so don't move right actually
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
	} else {
		docs.pressKey(docs.codeFromKey("ArrowRight")); // Undo our ArrowLeft because we're not at the start of the file
		let yCoord = docs.getYCoord();
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let newYCoord = docs.getYCoord();
		if (yCoord === newYCoord) {
			// Either we are in the middle of a line or at the end of a file, good to go
		} else {
			// We are at the end of a multiline (fake line) or a real line,
			// Even though we do the same thing for both scenarios, the below key movements are still necessary
			// to either put us at the right position for either scenario
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowRight"), true);
		}
	}

	// Now that we're in the right position, we can paste
	let startCursorPosition = docs.userCursor.style.transform;
	if (e.ctrlKey === false) {
		await docs.contentDocument.execCommand("paste");
		setTimeout(() => {
			let endCursorPosition = docs.userCursor.style.transform;
			// Only move back one arrow if we actually did paste something that wasn't just a blank string ""
			if (startCursorPosition !== endCursorPosition) {
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}, 1);
	} else {
		await docs.pasteClipboardPlainText().then(() => {
			setTimeout(() => {
				let endCursorPosition = docs.userCursor.style.transform;
				// Only move back one arrow if we actually did paste something that wasn't just a blank string ""
				if (startCursorPosition !== endCursorPosition) {
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
			}, 1);
		});
	}
};


/*
* Handles all keydown events in insert mode (basically only checks for escape/ctrl+c)
*/
baseVim.insert_keydown = function (e) {
	// Let all characters flow freely (except for escape)
	if (e.key === "Escape" || (e.key === "c" && e.ctrlKey === true)) {
		baseVim.switchToNormalMode();
		return true;
	}
};

export { baseVim };
