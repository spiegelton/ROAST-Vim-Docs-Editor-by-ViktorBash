import { docs } from "./docs.js";
let extpay = ExtPay("vim-for-docs");

// Get the user and only run Vim if they have paid (being on the free trial counts as paying)
let user = await extpay.getUser().catch((err) => {
	console.error("Vim for Docs Error: Network error, no connection");
});

const UIDocHead = document.querySelector("#kix-appview");
const UISequenceContainer = document.createElement("div");
UISequenceContainer.style.position = "absolute";
UISequenceContainer.style.right = "30px";
UISequenceContainer.style.bottom = "0px";
UISequenceContainer.style.width = "50px";
UISequenceContainer.style.height = "30px";
UISequenceContainer.style.color = "black";
UISequenceContainer.style.borderRadius = "3px";
UISequenceContainer.style.fontFamily = "Google Sans, Roboto, sans-serif";
UISequenceContainer.style.fontSize = "16px";
UISequenceContainer.innerHTML = "<span></span>";
UIDocHead.appendChild(UISequenceContainer);

const updateUISequenceText = function (text) {
	UISequenceContainer.innerHTML = "<span>" + text + "</span>";
};

const UIModeContainer = document.createElement("div");
UIModeContainer.style.position = "absolute";
UIModeContainer.style.left = "30px";
UIModeContainer.style.bottom = "0px";
UIModeContainer.style.width = "180px";
UIModeContainer.style.height = "30px";
UIModeContainer.style.color = "black";
UIModeContainer.style.borderRadius = "3px";
UIModeContainer.style.fontFamily = "Google Sans, Roboto, sans-serif";
UIModeContainer.style.fontSize = "16px";
UIModeContainer.innerHTML = "<span>-- INSERT --</span>";
UIDocHead.appendChild(UIModeContainer);

const updateUIModeText = function (text) {
	UIModeContainer.innerHTML = "<span>" + text + "</span>";
};

if (user.paid) {
	runVim();
} else if (user.subscriptionStatus === "past_due") {
	updateUIModeText("-- PAST DUE --");
} else if (user.subscriptionStatus === "unpaid") {
	updateUIModeText("-- UNPAID --");
} else if (user.subscriptionStatus === "canceled") {
	updateUIModeText("-- CANCELLED --");
} else {
	// Check if user started or went past their free trial
	const now = new Date();
	const sevenDays = 1000 * 60 * 60 * 24 * 7; // 7 day in milliseconds
	if (user.trialStartedAt === null) {
		// User has not yet started their free trial, so prompt them to do so
		extpay.openTrialPage();
		updateUIModeText("-- ACTIVATE TRIAL --");
	} else if (user.trialStartedAt && now - user.trialStartedAt < sevenDays) {
		// User is still in their free trial
		runVim();
	} else {
		// User's free trial ran out and they still haven't paid
		updateUIModeText("-- TRIAL EXPIRED --");
	}
}

function runVim() {
	let vim = {
		mode: "insert", // Keep track of current mode, options: ["insert", "normal", "visual"]
		num: "", // Keep track of number keys pressed by the user
		currentSequence: "", // Keep track of key sequences (ex: "gg")
		visualModeIsLinedBased: false, // Whether visual mode is line based (V) or regular (v)
		keyMaps: {
			Backspace: [["ArrowLeft"]],
			b: [["ArrowLeft", true]], // ctrl + <-
			B: [["ArrowLeft", true]], // ctrl + <-
			w: [
				// w and W only for visual mode used, TODO: fix in visual mode
				["ArrowRight", true],
				["ArrowRight", true],
				["ArrowLeft", true],
			], // w is same behavior as eeb
			W: [
				["ArrowRight", true],
				["ArrowRight", true],
				["ArrowLeft", true],
			], // w is same behavior as eeb
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
		differentVisualKeyMaps: {
			u: [],
			U: [],
			gg: [["Home", true, true]],
			G: [["End", true, true]],
			e: [["ArrowRight", true, true]], // ctrl + ->
			E: [["ArrowRight", true, true]], // ctrl + ->
		},
	};

	vim.switchToNormalMode = function () {
		vim.currentSequence = "";
		vim.mode = "normal";
		vim.num = "";
		updateUISequenceText("");
		updateUIModeText("-- NORMAL --");
		docs.setCursorWidth();
	};

	vim.switchToVisualMode = function () {
		vim.currentSequence = "";
		vim.mode = "visual";
		vim.num = "";
		updateUISequenceText("");
		if (!vim.visualModeIsLinedBased) {
			updateUIModeText("-- VISUAL --");
		} else {
			updateUIModeText("-- VISUAL LINE --");
		}
		docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
		docs.setCursorWidth();
	};

	vim.switchToInsertMode = function () {
		vim.currentSequence = "";
		vim.mode = "insert";
		vim.num = "";
		updateUISequenceText("");
		updateUIModeText("-- INSERT --");
		docs.setCursorWidth(true);
	};

	vim.copyWholeLine = async function () {
		let cursorLocations = docs.getCursorLocations();
		if (cursorLocations[0] && cursorLocations[3]) {
			// We are at the start of a line and at the end of the file, there's nothing
			// really to copy besides a blank line
			docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowRight"));
		} else {
			let [xCoord, yCoord] = docs.getCoords(); // This is how we will know our original location
			xCoord = parseInt(xCoord);
			yCoord = parseInt(yCoord);

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
			newXCoord = parseInt(newXCoord);
			newYCoord = parseInt(newYCoord);

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
		vim.num = "";
		vim.currentSequence = "";
		updateUISequenceText("");
		// Not updating cursor because we're at the same place
	};

	vim.copyWholeLineVisualMode = async function () {
		docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
		docs.contentDocument.execCommand("copy");
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		let copiedText = await navigator.clipboard.readText();

		let cursorLocations = docs.getCursorLocations();
		if (!cursorLocations[0]) {
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			copiedText = (await navigator.clipboard.readText()) + copiedText;
		}
		navigator.clipboard.writeText(copiedText);
		vim.switchToNormalMode();
		return true;
	};

	vim.paste = async function (e) {
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

	}

	// Called in normal mode.
	vim.normal_keydown = function (e) {
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
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			return true;
		}

		// Paste (no support for numbers/pasting multiple times yet)
		if (e.key === "p" && vim.currentSequence.length === 0) {
			vim.paste(e);
			vim.num = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		// Paste (no support for numbers/pasting multiple times yet)
		if (e.key === "P" && vim.currentSequence.length === 0) {
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
			vim.num = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		if (e.key === "i" && vim.currentSequence.length === 0) {
			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "v" && vim.currentSequence.length === 0) {
			vim.visualModeIsLinedBased = false;
			vim.switchToVisualMode();
			return true;
		}

		if (e.key === "V" && vim.currentSequence.length === 0) {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[0]) {
				docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			}
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
			vim.visualModeIsLinedBased = true;
			vim.switchToVisualMode();
			return true;
		}

		if (e.key.match(/\d+/) && vim.currentSequence.length === 0) {
			if (e.key === "0" && vim.num.length !== 0) {
				// 0 is part of the number being typed (ex: "100")
				if (vim.num.length < 3) {
					// We don't want to crash, so max you can type in is a 3 digit number (999)
					vim.num += e.key;
				}
			} else if (e.key !== "0") {
				// We have any digit besides 0 being typed (ex: "1" or "11")
				if (vim.num.length < 3) {
					vim.num += e.key;
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
			updateUISequenceText(vim.num + vim.currentSequence);
			docs.setCursorWidth();
			return true;
		}

		if (e.key === "a" && vim.currentSequence.length === 0) {
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

			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "A" && vim.currentSequence.length === 0) {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[3]) {
				// If we're not at the end of the file, move down and left
				docs.pressKey(docs.codeFromKey("ArrowDown"), true);
				let newCursorLocations = docs.getCursorLocations();
				if (!newCursorLocations[3]) {
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
			}

			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "O" && vim.currentSequence.length === 0) {
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

			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "o" && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[3]) {
				// If after going down we are not at the end of the file, go back 1
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
			// Hit enter for the new line
			docs.pressKey(docs.codeFromKey("Enter"));
			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "I" && vim.currentSequence.length === 0) {
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
			vim.switchToInsertMode();
			return true;
		}

		if ((e.key === "E" || e.key === "e") && vim.currentSequence.length === 0) {
			const numRepeats = parseInt(vim.num) || 1;
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
			vim.num = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		if ((e.key === "w" || e.key === "W") && vim.currentSequence.length === 0) {
			const numRepeats = parseInt(vim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				let cursorPosition = docs.userCursor.style.transform;
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				let newCursorPosition = docs.userCursor.style.transform;
				console.log(cursorPosition, newCursorPosition);
				if (cursorPosition === newCursorPosition) {
					// We've reached end of the file
					break;
				}
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
			}
			vim.num = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		if (e.key === "$" && vim.currentSequence.length === 0) {
			let cursorLocations = docs.getCursorLocations();
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
			if (!cursorLocations[3]) {
				// If we're not at the end of a file, move back left
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		if (e.key == "x" && vim.currentSequence.length === 0) {
			const numRepeats = parseInt(vim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				let cursorLocations = docs.getCursorLocations();

				if (cursorLocations[0] && cursorLocations[1]) {
					// On an empty space, we can break out and end now because 'x' does nothing on an empty line
					break;
				} else if (cursorLocations[1]) {
					// On the end of a non-empty line
					docs.pressKey(docs.codeFromKey("Backspace"));
				} else {
					// On a regular (not edge case) character/place
					docs.pressKey(docs.codeFromKey("Delete"));
				}
			}

			vim.num = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		// ALL Support for d and c multiline commands here

		// D, d$, C, c$
		if (
			(e.key === "D" && vim.currentSequence.length === 0) ||
			(e.key === "$" && vim.currentSequence === "d") ||
			(e.key === "C" && vim.currentSequence.length === 0) ||
			(e.key === "$" && vim.currentSequence === "c")
		) {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[1]) {
				// If we're not at the end of the file, delete text
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			if (e.key === "C" || vim.currentSequence === "c") {
				vim.switchToInsertMode();
				return true;
			}
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		// d0, c0
		if (
			(e.key === "0" && vim.currentSequence === "d") ||
			(e.key === "0" && vim.currentSequence === "c")
		) {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[0]) {
				// If we're not at the start of the line, delete text
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			if (vim.currentSequence === "c") {
				vim.switchToInsertMode();
				return true;
			}
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		// dd
		if (e.key === "d" && vim.currentSequence === "d") {
			// We are going to select text down, move right one arrow, select text up, and delete
			const numRepeats = parseInt(vim.num) || 1;
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
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		// cc
		if (e.key === "c" && vim.currentSequence === "c") {
			const numRepeats = parseInt(vim.num) || 1;
			if (numRepeats === 1) {
				// Handle case for 1
				let cursorLocations = docs.getCursorLocations();
				if (cursorLocations[0] && cursorLocations[1]) {
					vim.switchToInsertMode();
					return true;
				}

				if (!cursorLocations[0]) {
					docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
				vim.switchToInsertMode();
				return true;
			} else {
				for (let i = 0; i < numRepeats; i++) {
					let cursorLocations = docs.getCursorLocations();

					if (cursorLocations[3] && cursorLocations[0]) {
						// We are at the end of a file on an empty line, so we're done completely
						vim.switchToInsertMode();
						return true;
					}
					if (!cursorLocations[0]) {
						docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
						docs.pressKey(docs.codeFromKey("ArrowLeft"));
					}
					docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
					docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
					cursorLocations = docs.getCursorLocations();
					if (i === numRepeats - 1 || cursorLocations[3]) {
						// We either reached the end of file or end of sequence,
						// Don't backspace for the last line we delete, we have to stay on it
						vim.switchToInsertMode();
						return true;
					}
					docs.pressKey(docs.codeFromKey("Backspace"));
					docs.pressKey(docs.codeFromKey("ArrowRight"));
				}
			}
		}

		// diw, ciw
		if (
			(e.key === "w" && vim.currentSequence === "di") ||
			(e.key === "w" && vim.currentSequence === "ci")
		) {
			const numRepeats = parseInt(vim.num) || 1;
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
			if (vim.currentSequence === "ci") {
				vim.switchToInsertMode();
				return true;
			}
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			return true;
		}

		// y$
		if (e.key === "$" && vim.currentSequence === "y") {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[1]) {
				// IF we're not at the end of a line, select the text
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
				docs.contentDocument.execCommand("copy"); // TODO: Replace deprecated execCommand
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			// Don't need to set cursor width because we didn't move anywhere
			return true;
		}

		// y0
		if (e.key === "0" && vim.currentSequence === "y") {
			let cursorLocations = docs.getCursorLocations();
			// Technically vim will move up a line if you're at the start already, but that seems ugly, so we'll implement it
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
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			// Don't need to set cursor width because we didn't move anywhere
			return true;
		}

		// yy or Y
		if ((e.key === "y" && vim.currentSequence === "y") || e.key === "Y") {
			vim.copyWholeLine();
			return true;
		}

		vim.currentSequence += e.key; // Add the current key to the sequence

		// If the current sequence is in the keyMaps, then execute the command
		if (vim.currentSequence in vim.keyMaps) {
			vim.keyMaps[vim.currentSequence].forEach(([key, ...args]) => {
				const numRepeats = parseInt(vim.num) || 1;
				for (let i = 0; i < numRepeats; i++) {
					docs.pressKey(docs.codeFromKey(key), ...args);
				}
			});
			vim.num = "";
			vim.currentSequence = "";
		}

		// r for replace command:
		if (vim.currentSequence[0] === "r" && vim.currentSequence.length === 2) {
			// if we're at the end of a line, r should go on the current line
			// if we're at the end of a multiline (fake) line, r can move to next multiline
			const numRepeats = parseInt(vim.num) || 1;
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
					docs.pressKey(vim.currentSequence.charCodeAt(1));
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
					docs.pressKey(vim.currentSequence.charCodeAt(1));
				} else if (yCoord === newYCoord) {
					// We are in the middle of the line somewhere or something, standard procedure
					docs.pressKey(docs.codeFromKey("Backspace"));
					docs.pressKey(vim.currentSequence.charCodeAt(1));
				} else {
					// We've either passed a space or a return that has put us one multiline or line down
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					let [finalXCoord, finalYCoord] = docs.getCoords();
					if (finalXCoord === xCoord && finalYCoord === yCoord) {
						// We are dealing with a "Return" and actual new line
						docs.pressKey(vim.currentSequence.charCodeAt(1));
					} else {
						// We are dealing with a space and just a multiline
						docs.pressKey(docs.codeFromKey("Backspace"));
						docs.pressKey(vim.currentSequence.charCodeAt(1));
					}
				}
			}
			vim.num = "";
			vim.currentSequence = "";
		}

		if (
			vim.currentSequence.length !== 0 &&
			!vim.incompleteKeyMaps.includes(vim.currentSequence)
		) {
			// This means that the current sequence is invalid, so we have to reset it
			vim.num = "";
			vim.currentSequence = "";
		}

		updateUISequenceText(vim.num + vim.currentSequence);
		docs.setCursorWidth();
		return true;
	};

	// Called in visual mode.
	vim.visual_keydown = function (e) {
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
			vim.switchToNormalMode();
			return true;
		}

		if (e.key === "p" && vim.currentSequence.length === 0) {
			// We have to first delete the highlighted text, then paste in the clipboard
			docs.pressKey(docs.codeFromKey("Backspace"));
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pasteClipboard();
			vim.switchToNormalMode();
			return true;
		}

		if (e.key === "P" && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("Backspace"));
			docs.pasteClipboard();
			vim.switchToNormalMode();
			return true;
		}

		if (e.key === "I" && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			vim.switchToInsertMode();
			return true;
		}

		if ((e.key === "v" || e.key === "V") && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
			vim.switchToNormalMode();
			return true;
		}

		if (e.key.match(/\d+/) && vim.currentSequence.length === 0) {
			if (e.key === "0" && vim.num.length !== 0) {
				// 0 is part of the number being typed (ex: "100")
				if (vim.num.length < 3) {
					// We don't want to crash, so max you can type in is a 3 digit number (999)
					vim.num += e.key;
				}
			} else if (e.key !== "0") {
				// We have any digit besides 0 being typed (ex: "1" or "11")
				if (vim.num.length < 3) {
					vim.num += e.key;
				}
			} else {
				docs.pressKey(docs.codeFromKey("Home"), false, true);
				docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			}
			updateUISequenceText(vim.num + vim.currentSequence);
			docs.setCursorWidth();
			return true;
		}

		if (e.key === "A" && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			if (vim.visualModeIsLinedBased) {
				let cursorLocations = docs.getCursorLocations();
				if (!cursorLocations[3]) {
					// If we're not at the end of a file, move left
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
			}
			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "$" && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
			vim.num = "";
			vim.currentSequence = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		if (e.key === "x" && vim.currentSequence.length === 0) {
			docs.contentDocument.execCommand("cut");
			vim.switchToNormalMode();
			return true;
		}

		if (e.key === "d" && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("Backspace"));
			vim.switchToNormalMode();
			return true;
		}

		if (e.key === "c" && vim.currentSequence.length === 0) {
			docs.pressKey(docs.codeFromKey("Backspace"));
			vim.switchToInsertMode();
			return true;
		}

		if ((e.key === "D" || e.key === "C") && vim.currentSequence.length === 0) {
			// Delete the whole line(s) that we partially selected
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[0]) {
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
				docs.pressKey(docs.codeFromKey("Backspace"));
			}
			if (e.key === "C") {
				vim.switchToInsertMode();
				return true;
			}
			vim.num = "";
			vim.updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		if (e.key === "Y" && vim.currentSequence.length === 0) {
			vim.copyWholeLineVisualMode();
			return true;
		}

		if (e.key === "y" && vim.currentSequence.length === 0) {
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			vim.switchToNormalMode();
			return true;
		}

		// Now we do checks that only apply to line-based visual mode, where we do not follow the norm
		if (vim.visualModeIsLinedBased) {
			// Left and right traversal now do nothing
			let doNothingKeys = ["h", "l", "b", "B", "e", "E", "w", "W"];
			if (doNothingKeys.includes(e.key) && vim.currentSequence.length === 0) {
				vim.num = "";
				updateUISequenceText("");
				return true;
			}

			if (e.key === "k" && vim.currentSequence.length === 0) {
				const numRepeats = parseInt(vim.num) || 1;
				for (let i = 0; i < numRepeats; i++) {
					docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
				}
				vim.num = "";
				updateUISequenceText("");
				return true;
			}

			if (e.key === "j" && vim.currentSequence.length === 0 && !docs.isMac) {
				const numRepeats = parseInt(vim.num) || 1;
				for (let i = 0; i < numRepeats; i++) {
					docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				}
				vim.num = "";
				updateUISequenceText("");
				return true;
			}
			if (e.key === "j" && vim.currentSequence.length === 0 && docs.isMac) {
				// We need to handle j differently on Mac because of Apple's weird behavior around empty lines
				const numRepeats = parseInt(vim.num) || 1;
				for (let i = 0; i < numRepeats; i++) {
					docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
					docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
				}
				vim.num = "";
				updateUISequenceText("");
				return true;
			}
		}

		vim.currentSequence += e.key;

		if (vim.currentSequence in vim.differentVisualKeyMaps) {
			vim.differentVisualKeyMaps[vim.currentSequence].forEach(
				([key, ...args]) => {
					const numRepeats = parseInt(vim.num) || 1;
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
			vim.num = "";
			vim.currentSequence = "";
		} else if (vim.currentSequence in vim.keyMaps) {
			vim.keyMaps[vim.currentSequence].forEach(([key, ...args]) => {
				const numRepeats = parseInt(vim.num) || 1;
				for (let i = 0; i < numRepeats; i++) {
					// get the special keys pressed and default to false
					const keyArgs = [...args, false, false].slice(0, 2);
					keyArgs[1] = true;
					docs.pressKey(docs.codeFromKey(key), ...keyArgs);
				}
			});
			vim.num = "";
			vim.currentSequence = "";
		}

		if (
			vim.currentSequence.length !== 0 &&
			!vim.incompleteKeyMaps.includes(vim.currentSequence)
		) {
			// This means that the current sequence is invalid, so we have to reset it
			vim.num = "";
			vim.currentSequence = "";
		}
		return true;
	};

	// Called in insert mode.
	vim.insert_keydown = function (e) {
		// Let all characters flow freely (except for escape)
		if (e.key == "Escape") {
			vim.switchToNormalMode();
			return true;
		}
	};

	docs.keydown = function (e) {
		if (vim.mode == "insert") {
			return vim.insert_keydown(e);
		}
		if (vim.mode == "normal") {
			return vim.normal_keydown(e);
		}
		if (vim.mode == "visual") {
			return vim.visual_keydown(e);
		}
	};

	// console.log("Vim Docs Editor Loaded");
}
