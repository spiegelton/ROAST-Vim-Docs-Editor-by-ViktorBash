const extpay = ExtPay("vim-for-docs");

let payButtons = document.querySelectorAll("#payButton");
let trialButtons = document.querySelectorAll("#trialButton");
let shortcutButton = document.querySelector("#shortCutButton");

shortcutButton.addEventListener("click", () => {
	// When the user clicks on shortcut button, open the shortcuts page
	chrome.tabs.create({ url: chrome.runtime.getURL("shortcuts.html")});
});

for (let i = 0; i < payButtons.length; i++) {
	// Add event listener to each pay button
	payButtons[i].addEventListener("click", extpay.openPaymentPage);
}
for (let i = 0; i < trialButtons.length; i++) {
	// Add event listener to each trial button
	trialButtons[i].addEventListener("click", (event) => {extpay.openTrialPage("14 day")});
}

// We wil select later which modal to display
let newUserModal = document.querySelector("#newUser");
let trialUserModal = document.querySelector("#trialUser");
let expiredTrialUserModal = document.querySelector("#expiredTrialUser");
let paidUserModal = document.querySelector("#paidUser");
let pastDueUserModal = document.querySelector("#pastDueUser");
let cancelledUserModal = document.querySelector("#cancelledUser");

// Used for showing how much time the user has left on their trial
function convertMillisecondsToDaysAndHours(milliseconds) {
  // Calculate the number of seconds, minutes, and hours
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  // Calculate the number of days and remaining hours
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return { days, hours: remainingHours };
}

async function start() {
	let user = await extpay.getUser().catch((err) => {
		paidUserModal.style.display = "block";
		paidUserModal.innerHTML = "<p style=\"font-size: 16px;\">Error: Network error, no connection</p>"
	});

	if (user.paid) {
		// User is a paid user
		paidUserModal.style.display = "block";
	}
	else if (user.subscriptionStatus === "past_due" || user.subscriptionStatus === "unpaid") {
		// User is a past due user
		pastDueUserModal.style.display = "block";
	}
	else if (user.subscriptionStatus === "canceled") {
		// User is a cancelled user
		cancelledUserModal.style.display = "block";
	}
	else {
		// Check if user started or went past their free trial
		const now = new Date();
		const sevenDays = 1000 * 60 * 60 * 24 * 7 * 2; // 14 days in milliseconds
		if (user.trialStartedAt === null) {
			// User is a new user (no recorded trial)
			newUserModal.style.display = "block";
		} else if (user.trialStartedAt && now - user.trialStartedAt < sevenDays) {
			// User is a trial user
			let timeLeft = sevenDays - (now - user.trialStartedAt);
			let {days, hours} = convertMillisecondsToDaysAndHours(timeLeft);

			document.querySelector("#trialTimeLeft").textContent = `${days} days and ${hours} hours left`;
			trialUserModal.style.display = "block";
		} else {
			// User is an expired trial user
			expiredTrialUserModal.style.display = "block";
		}
	}
}
start();
