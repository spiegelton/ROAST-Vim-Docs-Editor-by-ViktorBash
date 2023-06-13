const extpay = ExtPay('quantier-2') ;


let payButtons = document.querySelectorAll('#payButton');
let trialButtons = document.querySelectorAll("#trialButton");

for (let i = 0; i < payButtons.length; i++) {
    payButtons[i].addEventListener('click', extpay.openPaymentPage);
}
for (let i = 0; i < trialButtons.length; i++) {
    trialButtons[i].addEventListener('click', extpay.openTrialPage);
}

let newUserModal = document.querySelector("#newUser");
let trialUserModal = document.querySelector("#trialUser");
let expiredTrialUserModal = document.querySelector("#expiredTrialUser");
let paidUserModal = document.querySelector("#paidUser");

async function start() {
let user = await extpay.getUser().catch(err => {
 // TODO: Handle error
})

extpay.getUser().then(user => {
    if (user.paid) {
        document.querySelector("header").innerHTML = "You're a paid user!";
    }
}).catch(err => {
    document.querySelector('p').innerHTML = "Error fetching data :( Check that your ExtensionPay id is correct and you're connected to the internet"
})
    

if (user.paid) {
    // User is a paid user
    newUserModal.style.display = "none";
    trialUserModal.style.display = "none";
    expiredTrialUserModal.style.display = "none";
    paidUserModal.style.display = "block";
} 
else {
    // Check if user started or went past their free trial
    const now = new Date();
    const oneDay = 1000 * 60 * 60 * 24; // 1 day in milliseconds
    if (user.trialStartedAt === null ) {
        // User is a new user (no recorded trial)
        newUserModal.style.display = "block";
        trialUserModal.style.display = "none";
        expiredTrialUserModal.style.display = "none";
        paidUserModal.style.display = "none";

    }
    else if (user.trialStartedAt && (now - user.trialStartedAt) < oneDay) {
        // User is a trial user
        newUserModal.style.display = "none";
        trialUserModal.style.display = "block";
        expiredTrialUserModal.style.display = "none";
        paidUserModal.style.display = "none";

    }
    else {
        // User is an expired trial user
        newUserModal.style.display = "none";
        trialUserModal.style.display = "none";
        expiredTrialUserModal.style.display = "block";
        paidUserModal.style.display = "none";
    }
}
}
start();