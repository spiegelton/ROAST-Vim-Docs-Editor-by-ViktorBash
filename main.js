let extpay = ExtPay("vim-for-docs");
import { macVim } from "./vim/macVim.js";
import { windowsVim } from "./vim/windowsVim.js";
import { docs } from "./docs.js";
import { updateUIModeText, updateUISequenceText } from "./vim/UI.js";

// Get the user and only run Vim if they have paid (being on the free trial counts as paying)
let user = await extpay.getUser().catch((err) => {
	console.error("Vim for Google Docs Error: Network error, no connection");
});


if (user.paid) {
	runVim();
} else if (user.subscriptionStatus === "past_due") {
	// We grant the user a grace period to get their payment details in order
	// (This grace period is defined in the Stripe settings)
	runVim();
} else if (user.subscriptionStatus === "unpaid") {
	updateUIModeText("-- UNPAID --");
} else if (user.subscriptionStatus === "canceled") {
	updateUIModeText("-- CANCELLED --");
} else {
	// Check if user started or went past their free trial
	const now = new Date();
	const sevenDays = 1000 * 60 * 60 * 24 * 7 * 2; // 14 days in milliseconds
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

	let vimVariant;
	if (docs.isMac) {
		vimVariant = macVim;
	}
	else {
		vimVariant = windowsVim;
	}

  	const KEY_SEPARATOR = "•";
	// TODO: keyMapN is different for mac and windows
	let keyMapN = {
		// keybinding (with key separator), ignoreModifierKeys (boolean), bitmask (ctrl, shift, alt, meta)
		arrowLeft: ["ArrowLeft", false, 0b0000],
		arrowRight: ["ArrowRight", false, 0b0000],
		arrowUp: ["ArrowUp", false, 0b0000],
		arrowDown: ["ArrowDown", false, 0b0000],
		backspace: ["Backspace", false, 0b0000],
		b: ["b", false, 0b0000],
		B: ["B", false, 0b0100],
		h: ["h", false, 0b0000],
		j: ["j", false, 0b0000],
		k: ["k", false, 0b0000],
		l: ["l", false, 0b0000],
		gg: ["g" + KEY_SEPARATOR + "g", true, 0b0000],
		"{": ["{", false, 0b0100],
		"}": ["}", false, 0b0100],
		arrowLeftCtrl: ["ArrowLeft", false, 0b1000],
		arrowRightCtrl: ["ArrowRight", false, 0b1000],
		arrowDownCtrl: ["ArrowDown", false, 0b1000],
		arrowUpCtrl: ["ArrowUp", false, 0b1000],
		escape: ["Escape", true, 0b0000],
		ctrlC: ["c", false, 0b1000],
		slashSearch: ["/", false, 0b0000],
		ctrlDPageDown: ["d", false, 0b1000],
		ctrlUPageUp: ["u", false, 0b1000],
		redo: ["r", false, 0b1000],
		paste: ["p", false, 0b0000], // TODO: Change into 2 functions on the other side
		pasteNoFormatting: ["p", false, 0b1000],
		pasteBeforeCursor: ["P", false, 0b0100],
		pasteBeforeCursorNoFormatting: ["P", false, 0b1100],
		insert: ["i", false, 0b0000],
		enterVisual: ["v", false, 0b0000],
		enterVisualLine: ["V", false, 0b0100],
		append: ["a", false, 0b0000],
		appendEndOfLine: ["A", false, 0b0100],
		newLineAbove: ["O", false, 0b0100],
		newLineBelow: ["o", false, 0b0000],
		insertStartOfLine: ["I", false, 0b0100],
		e: ["e", false, 0b0000],
		E: ["E", false, 0b0100],
		endOfLine: ["$", false, 0b0100],
		w: ["w", false, 0b0000],
		W: ["W", false, 0b0100],
		x: ["x", false, 0b0000],
		s: ["s", false, 0b0000],
		deleteToEndOfLine: ["D", false, 0b0100],
		deleteToEndOfLine2: ["d" + KEY_SEPARATOR + "$", true, 0b0000],
		deleteToEndOfLineInsert: ["C", false, 0b0100],
		deleteToEndOfLine2Insert: ["c" + KEY_SEPARATOR + "$", true, 0b0000],
		deleteToStartOfLine: ["d" + KEY_SEPARATOR + "0", true, 0b0000],
		deleteToStartOfLineInsert: ["c" + KEY_SEPARATOR + "0", true, 0b0000],
		dw: ["d" + KEY_SEPARATOR + "w", true, 0b0000],
		dW: ["d" + KEY_SEPARATOR + "W", true, 0b0000],
		cw: ["c" + KEY_SEPARATOR + "w", true, 0b0000],
		cW: ["c" + KEY_SEPARATOR + "W", true, 0b0000],
		deleteLine: ["d" + KEY_SEPARATOR + "d", true, 0b0000],
		deleteLineInsert: ["c" + KEY_SEPARATOR + "c", true, 0b0000],
		deleteLine2Insert: ["S", false, 0b0100],
		deleteInnerWord: ["d" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000],
		deleteInnerWordInsert: ["c" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000],
		deleteWord: ["d" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000],
		deleteWordInsert: ["c" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000],
		copyToEndOfLine: ["y" + KEY_SEPARATOR + "$", true, 0b0000],
		copyToStartOfLine: ["y" + KEY_SEPARATOR + "0", true, 0b0000],
		copyWholeLine: ["y" + KEY_SEPARATOR + "y", true, 0b0000],
		copyWholeLine2: ["Y", false, 0b0100],
	}

	let keyMapI = {
		// TODO: Tell user only single character mappings work in insert mode
		// TODO: if user wants to disable a keymapping (ex: ctrl - c), we will store two key separators 
		//together in the keymap so that it won't ever run
		escape: ["Escape", true, 0b0000],
		ctrlC: ["c", false, 0b1000],
	}


	vimVariant.keyMapN = keyMapN;
	vimVariant.keyMapI = keyMapI;

	docs.keydown = function (e) {
		if (vimVariant.mode == "insert") {
			return vimVariant.insert_keydown(e);
		}
		if (vimVariant.mode == "normal") {
			return vimVariant.normal_keydown(e);
		}
		if (vimVariant.mode == "visual") {
			return vimVariant.visual_keydown(e);
		}
	};

	// These 2 variables help us switch to visual mode whenever the user clicks and drags in normal mode
	let mouseDown = false;
	let mouseDownCoords = [-1, -1];

	// For double click
	let lastMouseUp = 0; // ms

	// validMouseArea: 
	// Clicks on the extreme far left or the extreme far right or the top menu bar are not registered, only clicks on the left, document, and right
	// We don't want to change modes or do anything if the user is clicking some buttons on the top menu for instance
	let validMouseArea = document.querySelector(".kix-rotatingtilemanager.docs-ui-hit-region-surface")

	// Surprisingly, we also need to add a listener to the cursor caret, otherwise when the user clicks on their own cursor nothing will happen
	let cursorArea = document.querySelector("#kix-current-user-cursor-caret");

	let MAX_TIME_FOR_DOUBLE_CLICK = 400; // ms

	let areasToListen = [validMouseArea, cursorArea];
		areasToListen.forEach((area) => {

			// Mouse down (Just used in mouse-up really to check if we dragged or not)
			area.addEventListener("mousedown", (event) => {
				mouseDown = true;
				mouseDownCoords = [event.clientX, event.clientY];
			});

			// Mouse up (bulk of the logic)
			area.addEventListener("mouseup", (event) => {
				mouseDown = false;
				let oldTime = lastMouseUp;
				lastMouseUp = Date.now();

				if (lastMouseUp - oldTime < MAX_TIME_FOR_DOUBLE_CLICK && mouseDownCoords[0] === event.clientX && mouseDownCoords[1] === event.clientY) {
					// This is a double click, because the last click was less than 400 ms ago
					if (vimVariant.mode === "normal") {
						vimVariant.switchToVisualMode();
					}
				}
				else if (mouseDownCoords[0] === event.clientX && mouseDownCoords[1] === event.clientY)
				{
					// We clicked in place (didn't drag) --> Switch to normal if we were in visual mode
					if (vimVariant.mode === "visual") {
						vimVariant.switchToNormalMode();
					}
					else if (vimVariant.mode === "normal") {
						// If we clicked around in normal mode, we still need to resize the cursor caret
						docs.setCursorWidth();
					}
				}
				else {
					// We dragged
					if (vimVariant.mode === "normal") {
						vimVariant.switchToVisualMode();
					}
				}

			});

			
		}
	);
}