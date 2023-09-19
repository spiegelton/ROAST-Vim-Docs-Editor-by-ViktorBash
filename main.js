let extpay = ExtPay("vim-for-docs");
import { macVim } from "./vim/macVim.js";
import { windowsVim } from "./vim/windowsVim.js";
import { docs } from "./docs.js";
import { updateUIModeText } from "./vim/UI.js";
import { getUltimateKeyMapInCallback } from "./vim/keybindings.js";

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

/*
* Called when we verify that the user has access to the extension
*/
function runVim() {

	// Create a copy of the vimVariant we want to run
	let vimVariant;
	if (docs.isMac) {
		vimVariant = macVim;
	}
	else {
		vimVariant = windowsVim;
	}

	// Now, we will populate the vimVariant with the user's keybindings
	getUltimateKeyMapInCallback(function (ultimateKeyMap) {
		vimVariant.keyMapN = ultimateKeyMap.keyMapN;
		vimVariant.keyMapI = ultimateKeyMap.keyMapI;
		vimVariant.keyMapV = ultimateKeyMap.keyMapV;
		vimVariant.keyMapVLine = ultimateKeyMap.keyMapVLine;
		
		// Set the incomplete keymap bindings now
		vimVariant.incompleteKeyMapN = ultimateKeyMap.incompleteKeyMapN;
		vimVariant.incompleteKeyMapV = ultimateKeyMap.incompleteKeyMapV;
		vimVariant.incompleteKeyMapVLine = ultimateKeyMap.incompleteKeyMapVLine;

		// After fetching the keybindings, we can start running Vim
		continueRunVim(vimVariant);
	})
}

function continueRunVim(vimVariant) {
	// Hook up Vim to the keydown presses in the document
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
		if (vimVariant.mode == "visual_line") {
			return vimVariant.visual_line_keydown(e);
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