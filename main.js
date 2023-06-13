import { docs } from "./docs.js";
let extpay = ExtPay("quantier-2");

// Get the user and only run Vim if they have paid (being on the free trial counts as paying)
let user = await extpay.getUser();

if (user.paid) {
	runVim();
} 
else {
    // Check if user started or went past their free trial
    const now = new Date();
    const oneDay = 1000 * 60 * 60 * 24; // 1 day in milliseconds
    if (user.trialStartedAt === null ) {
        // User has not yet started their free trial, so prompt them to do so
        extpay.openTrialPage();
    }
    else if (user.trialStartedAt && (now - user.trialStartedAt) < oneDay) {
        // User is still in their free trial
        runVim();
    }
    else {
        // User's free trial ran out and they still haven't paid
        extpay.openPaymentPage();
        alert("You need to pay, Vim is disabled until you pay.")
    }
}

function runVim() {
	const UIDocHead = document.querySelector("#kix-appview");
	const UISequenceContainer = document.createElement("div");
	UISequenceContainer.style.position = "absolute";
	UISequenceContainer.style.right = "30px";
	UISequenceContainer.style.bottom = "0px";
	UISequenceContainer.style.width = "50px";
	UISequenceContainer.style.height = "30px";
	UISequenceContainer.style.color = "black";
	UISequenceContainer.style.borderRadius = "3px";
	UISequenceContainer.style.fontFamily = "Consolas";
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
	UIModeContainer.style.width = "150px";
	UIModeContainer.style.height = "30px";
	UIModeContainer.style.color = "black";
	UIModeContainer.style.borderRadius = "3px";
	UIModeContainer.style.fontFamily = "Consolas";
	UIModeContainer.style.fontSize = "16px";
	UIModeContainer.innerHTML = "<span></span>";
	UIDocHead.appendChild(UIModeContainer);

	const updateUIModeText = function (text) {
		UIModeContainer.innerHTML = "<span>" + text + "</span>";
	};

	let vim = {
		mode: "insert", // Keep track of current mode, options: ["insert", "normal", "visual"]
		num: "", // Keep track of number keys pressed by the user
		currentSequence: "", // Keep track of key sequences (ex: "gg")
		keyMaps: {
			Backspace: [["ArrowLeft"]],
			x: [["Delete"]],
			b: [["ArrowLeft", true]], // ctrl + <-
			B: [["ArrowLeft", true]], // ctrl + <-
			e: [["ArrowRight", true]], // ctrl + ->
			E: [["ArrowRight", true]], // ctrl + ->
			w: [
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
			H: [["Home", true]],
			gg: [["Home", true]],
			G: [["End", true]],
			u: [["Z", true]],
			U: [["Z", true]],
			d$: [["ArrowDown", true, true], ["Delete"], ["Enter"], ["ArrowLeft"]],
		},
		incompleteKeyMaps: ["g", "r", "d"], // Stores the starting substrings of multiline commands, ex: 'diw' would have 'di' and 'd' in here
		// "visualKeyMaps": {
		//     "Backspace": [["ArrowLeft"]],
		//     "x": [["Delete"]],
		//     "b": [["ArrowLeft", true]], // ctrl + <-
		//     "B": [["ArrowLeft", true]], // ctrl + <-
		//     "e": [["ArrowRight", true]], // ctrl + ->
		//     "E": [["ArrowRight", true]], // ctrl + ->
		//     "w": [["ArrowRight", true], ["ArrowRight", true], ["ArrowLeft", true]],  // w is same behavior as eeb
		//     "W": [["ArrowRight", true], ["ArrowRight", true], ["ArrowLeft", true]],  // w is same behavior as eeb
		//     "h": [["ArrowLeft"]],
		//     "j": [["ArrowDown"]],
		//     "k": [["ArrowUp"]],
		//     "l": [["ArrowRight"]],
		//     "H": [["Home", true]],
		//     "gg": [["Home", true]],
		//     "G": [["End", true]]
		// },
		// "incompleteVisualKeyMaps": ["g"]
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
		updateUIModeText("-- VISUAL --");
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
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs
				.pasteClipboard()
				.then(() => docs.pressKey(docs.codeFromKey("ArrowLeft")));
			vim.num = "";
			updateUISequenceText("");
			docs.setCursorWidth();
			return true;
		}

		// Paste (no support for numbers/pasting multiple times yet)
		if (e.key === "P" && vim.currentSequence.length === 0) {
			docs
				.pasteClipboard()
				.then(() => docs.pressKey(docs.codeFromKey("ArrowLeft")));
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
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[1]) {
				// If we're not at the end of the line, move right
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}

			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "A" && vim.currentSequence.length === 0) {
			let cursorLocations = docs.getCursorLocations();
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
			if (!cursorLocations[3]) {
				// If we're not at the end of the file, move left
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
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
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[0]) {
				// We are not at the start of a line
				docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			}
			vim.switchToInsertMode();
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
			const numRepeats = parseInt(vim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("Backspace"));
				docs.pressKey(vim.currentSequence.charCodeAt(1));
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

		// docs.setCursorWidth();

		if (e.key == "Escape") {
			// Escape visual mode.
			vim.switchToNormalMode();
			return true;
		}

		if (e.key.match(/\d+/)) {
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
			return true;
		}

		if (e.key === "a") {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[1]) {
				// If we're not at the end of the line, move right
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}

			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "A") {
			let cursorLocations = docs.getCursorLocations();
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
			if (!cursorLocations[3]) {
				// If we're not at the end of the file, move left
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}

			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "I") {
			let cursorLocations = docs.getCursorLocations();
			if (!cursorLocations[0]) {
				// We are not at the start of a line
				docs.pressKey(docs.codeFromKey("ArrowUp"), true);
			}
			vim.switchToInsertMode();
			return true;
		}

		if (e.key === "$") {
			let cursorLocations = docs.getCursorLocations();
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
			if (!cursorLocations[3]) {
				// If we're not at the end of a file, move back left
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
			return true;
		}

		vim.currentSequence += e.key;

		if (vim.currentSequence in vim.keyMaps) {
			vim.keyMaps[vim.currentSequence].forEach(([key, ...args]) => {
				const numRepeats = parseInt(vim.num) || 1;
				for (let i = 0; i < numRepeats; i++) {
					if (key.indexOf("Arrow") == 0) {
						// get the special keys pressed and default to false
						const keyArgs = [...args, false, false].slice(0, 2);
						keyArgs[1] = true;
						docs.pressKey(docs.codeFromKey(key), ...keyArgs);
					} else {
						docs.pressKey(docs.codeFromKey(key), ...args);
						vim.switchToNormalMode();
					}
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

	console.log("Vim Docs Editor Loaded");
}
