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

	// These 2 variables help us switch to visual mode whenever the user clicks and drags in normal mode
	let mouseDown = false;
	let visualModeClassList = "kix-cursor docs-ui-unprintable"
	let mouseDownCoords = [-1, -1];

	if (docs.isMac) {
		docs.keydown = function (e) {
			if (macVim.mode == "insert") {
				return macVim.insert_keydown(e);
			}
			if (macVim.mode == "normal") {
				return macVim.normal_keydown(e);
			}
			if (macVim.mode == "visual") {
				return macVim.visual_keydown(e);
			}
		};

		// Add event listener to switch to visual mode automatically from normal mode
		const userObserver = new MutationObserver((mutationsList) => {
			mutationsList.forEach((mutation) => {
				if (mouseDown && mutation.type === "attributes" && mutation.attributeName === "class" && docs.userCursor.classList.value === visualModeClassList && macVim.mode === "normal") {
					macVim.switchToVisualMode();
				}
			})
		});

		const userObserverConfig = { attributes: true, attributeFilter: ['class'] }
		userObserver.observe(docs.userCursor, userObserverConfig);
	}
	else {
		docs.keydown = function (e) {
			if (windowsVim.mode == "insert") {
				return windowsVim.insert_keydown(e);
			}
			if (windowsVim.mode == "normal") {
				return windowsVim.normal_keydown(e);
			}
			if (windowsVim.mode == "visual") {
				return windowsVim.visual_keydown(e);
			}
		};

		// Add event listener to switch to visual mode automatically from normal mode
		const userObserver = new MutationObserver((mutationsList) => {
			mutationsList.forEach((mutation) => {
				if (mouseDown && mutation.type === "attributes" && mutation.attributeName === "class" && docs.userCursor.classList.value === visualModeClassList && windowsVim.mode === "normal") {
					windowsVim.switchToVisualMode();
				}
			})
		});

		const userObserverConfig = { attributes: true, attributeFilter: ['class'] }
		userObserver.observe(docs.userCursor, userObserverConfig);
	}
	// let area = document.querySelector(".kix-rotatingtilemanager.docs-ui-hit-region-surface")

	window.addEventListener("mousedown", (event) => {
		mouseDown = true;
		mouseDownCoords = [event.clientX, event.clientY];
	})

	window.addEventListener("mouseup", (event) => {
		mouseDown = false;
		if (mouseDownCoords[0] === event.clientX && mouseDownCoords[1] === event.clientY)
		{
			// We clicked in place (didn't drag) --> Switch to normal if we were in visual mode
			if (docs.isMac && macVim.mode === "visual") {
				macVim.switchToNormalMode();

			}
			else if (!docs.isMac && windowsVim.mode === "visual") {
				windowsVim.switchToNormalMode();
			}
		}

		// if (mouseDownCoords[0] !== event.clientY && mouseDownCoords[1] !== event.clientY) {
		// 	if (docs.isMac && macVim.mode === "normal") {
		// 		macVim.switchToVisualMode();
		// 	}
		// 	else if (!docs.isMac && windowsVim.mode === "normal") {
		// 		windowsVim.switchToVisualMode();
		// 	}
		// }
	});

}