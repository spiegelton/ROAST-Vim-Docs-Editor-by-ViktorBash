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
	}
}