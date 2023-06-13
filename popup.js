const extpay = ExtPay("quantier-2");

let payButtons = document.querySelectorAll("#payButton");
let trialButtons = document.querySelectorAll("#trialButton");

for (let i = 0; i < payButtons.length; i++) {
	payButtons[i].addEventListener("click", extpay.openPaymentPage);
}
for (let i = 0; i < trialButtons.length; i++) {
	trialButtons[i].addEventListener("click", extpay.openTrialPage);
}

let newUserModal = document.querySelector("#newUser");
let trialUserModal = document.querySelector("#trialUser");
let expiredTrialUserModal = document.querySelector("#expiredTrialUser");
let paidUserModal = document.querySelector("#paidUser");

async function start() {
	let user = await extpay.getUser().catch((err) => {
		// TODO: Handle error
	});

	if (user.paid) {
		// User is a paid user
		newUserModal.style.display = "none";
		trialUserModal.style.display = "none";
		expiredTrialUserModal.style.display = "none";
		paidUserModal.style.display = "block";
	} else {
		// Check if user started or went past their free trial
		const now = new Date();
		const oneDay = 1000 * 60 * 60 * 24; // 1 day in milliseconds
		if (user.trialStartedAt === null) {
			// User is a new user (no recorded trial)
			newUserModal.style.display = "block";
			trialUserModal.style.display = "none";
			expiredTrialUserModal.style.display = "none";
			paidUserModal.style.display = "none";
		} else if (user.trialStartedAt && now - user.trialStartedAt < oneDay) {
			// User is a trial user

			let dateDifference = oneDay - (now - user.trialStartedAt);
			if (dateDifference < 0) {
				dateDifference = 0;
			}

			let hoursLeft = Math.ceil(dateDifference / (1000 * 60 * 60));
			document.querySelector("#trialTimeLeft").textContent = hoursLeft + " hours left";

			newUserModal.style.display = "none";
			trialUserModal.style.display = "block";
			expiredTrialUserModal.style.display = "none";
			paidUserModal.style.display = "none";
		} else {
			// User is an expired trial user
			newUserModal.style.display = "none";
			trialUserModal.style.display = "none";
			expiredTrialUserModal.style.display = "block";
			paidUserModal.style.display = "none";
		}
	}
}
start();
