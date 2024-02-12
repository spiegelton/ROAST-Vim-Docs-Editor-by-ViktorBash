let extpay = ExtPay("vim-for-docs");
import { macVim } from "./vim/macVim.js";
import { windowsVim } from "./vim/windowsVim.js";
import { docs } from "./docs.js";
import { UI } from "./vim/UI.js";
import { getUltimateKeyMapInCallback } from "./vim/keybindings.js";

// Helper function to sleep
function sleep(ms = 0)  {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Try to execute a function, on failure wait and then retry
export async function retry(fn, { retries, retryIntervalMs }) {
	try {
		return await fn()
	} catch (error) {
		if (retries <= 0) {
			throw error
		}
		await sleep(retryIntervalMs)
		return retry(fn, { retries: retries - 1, retryIntervalMs })
	}
}

// Get the user and only run Vim if they have paid (being on the free trial counts as paying)
let user = await extpay.getUser().catch((err) => {
	console.error("Vim for Google Docs Error: Network error, no connection");
});

// Set up the UI
await retry(() => {
	UI.setUp();
}, { retries: 100, retryIntervalMs: 200});

// docs.setUp() should be successful the first time, however it sometimes fails (maybe like 0.5-1% of the time)
// If it fails, we retry it a few times.
// Also, we need to run this because this loads in the DOM manipulation stuff that we need
await retry(() => {
	docs.setUp();
}, { retries: 100, retryIntervalMs: 200});

if (user.paid) {
	runVim();
} else if (user.subscriptionStatus === "past_due") {
	// We grant the user a grace period to get their payment details in order
	// (This grace period is defined in the Stripe settings)
	runVim();
} else if (user.subscriptionStatus === "unpaid") {
	UI.updateUIModeText("-- UNPAID --");
} else if (user.subscriptionStatus === "canceled") {
	UI.updateUIModeText("-- CANCELLED --");
} else {
	// Check if user started or went past their free trial
	const now = new Date();
	const sevenDays = 1000 * 60 * 60 * 24 * 7 * 2; // 14 days in milliseconds
	if (user.trialStartedAt === null) {
		// User has not yet started their free trial, so prompt them to do so
		extpay.openTrialPage();
		UI.updateUIModeText("-- ACTIVATE TRIAL --");
	} else if (user.trialStartedAt && now - user.trialStartedAt < sevenDays) {
		// User is still in their free trial
		runVim();
	} else {
		// User's free trial ran out, and they still haven't paid
		UI.updateUIModeText("-- TRIAL EXPIRED --");
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

		vimVariant.setUp(docs, UI, ultimateKeyMap);
		// After fetching the keybindings, we can start running Vim
		continueRunVim(vimVariant);
	})
}

function continueRunVim(vimVariant) {
	// Hook up Vim to the keydown presses in the document
	docs.keydown = function (e) {
		if (vimVariant.mode === "insert") {
			return vimVariant.insert_keydown(e);
		}
		if (vimVariant.mode === "normal") {
			return vimVariant.normal_keydown(e);
		}
		if (vimVariant.mode === "visual") {
			return vimVariant.visual_keydown(e);
		}
		if (vimVariant.mode === "visual_line") {
			return vimVariant.visual_line_keydown(e);
		}
		if (vimVariant.mode === "replace") {
			return vimVariant.replace_keydown(e);
		}
	};

	vimVariant.switchToNormalMode();

	// We will check whether we should start in insert mode or not
	chrome.storage.sync.get("toggleStartMode", function(result) {
		if (result.toggleStartMode === "false") {
			vimVariant.switchToInsertMode();
		}
	});

	// These 2 variables help us switch to visual mode whenever the user clicks and drags in normal mode
	let mouseDown = false;
	let mouseDownCoords = [-1, -1];

	// For double-click
	let lastMouseUp = 0; // ms

	// For middle mouse
	let middleMouseDown = false;

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
				if (event.buttons === 4) {
					middleMouseDown = true;
					// Middle click
					// We don't want to do anything if the user middle clicks (aka click on the scroll wheel)
					return;
				}

				middleMouseDown = false;
				mouseDown = true;
				mouseDownCoords = [event.clientX, event.clientY];

				// If we're in normal mode, let's update the cursor caret width on mousedown for better UX
				// We use a setTimeout() because it doesn't work without one
				if (vimVariant.mode === "normal") {
					setTimeout(() => {
						docs.setCursorWidth(vimVariant.mode);
					}, 1)
				}
			});

			// Mouse up (bulk of the logic)
			area.addEventListener("mouseup", (event) => {
				if (event.button === 1) {
					// Middle click
					// We don't want to do anything if the user middle clicks (aka click on the scroll wheel)
					return;
				}
				if (middleMouseDown) {
					middleMouseDown = false;
					return;
				}

				mouseDown = false;
				let oldTime = lastMouseUp;
				lastMouseUp = Date.now();

				if (lastMouseUp - oldTime < MAX_TIME_FOR_DOUBLE_CLICK && mouseDownCoords[0] === event.clientX && mouseDownCoords[1] === event.clientY) {
					// This is a double click, because the last click was less than 400 ms ago
					if (vimVariant.mode === "normal") {

						vimVariant.switchToVisualMode(false);
					}
				}
				else if (mouseDownCoords[0] === event.clientX && mouseDownCoords[1] === event.clientY)
				{
					// We clicked in place (didn't drag) --> Switch to normal if we were in visual mode
					if (vimVariant.mode === "visual" || vimVariant.mode === "visual_line") {
						vimVariant.switchToNormalMode();
					}
					else if (vimVariant.mode === "normal") {
						// If we clicked around in normal mode, we still need to resize the cursor caret
						docs.setCursorWidth("normal");
					}
				}
				else {
					// We dragged
					// HOWEVER, there's a chance we dragged and selected no text still. If that happens
					// we want to highlight one character (for UX) still
					if (vimVariant.mode === "normal") {
						// We use a setTimeout() because it doesn't work without one
						setTimeout(() => {
							if (docs.isTextSelected()) {
								// We dragged and selected text, good to go
								vimVariant.switchToVisualMode(false);
							}
							else {
								// We dragged and did not select text, so we want to highlight one character
								vimVariant.switchToVisualMode(true);
							}
						}, 1)
					}
				}

			});

			
		}
	);
}