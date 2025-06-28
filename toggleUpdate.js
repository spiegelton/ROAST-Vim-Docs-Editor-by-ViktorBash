// This script sets the "Show Updates" checkbox to the correct value, and also stores if the user changes the value by toggling the checkbox
let toggleUpdateCheckbox = document.getElementById("toggleUpdate");


// Set the value of the checkbox
chrome.storage.sync.get("updateCheckbox", function(result) {
    if (result.updateCheckbox === "false") {
        toggleUpdateCheckbox.checked = false;
    }
    else {
        toggleUpdateCheckbox.checked = true;
    }

});

// Handle checkbox change
function handleCheckboxChange(event) {
    if (event.target.checked) {
        chrome.storage.sync.set({"updateCheckbox": "true"});
    }
    else {
        chrome.storage.sync.set({"updateCheckbox": "false"});
    }
}

toggleUpdateCheckbox.addEventListener("change", handleCheckboxChange);
