importScripts("dist/ExtPay.js");

let extpay = ExtPay("vim-for-docs"); // Extension ID
extpay.startBackground(); // Required, have extpay running in the background

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason === "install") {
		// When the extension is installed for the first time, prompt them to the popup HTML page
		// this opens on a full tab screen instead of a window
		chrome.tabs.create({ url: "popup.html" });

		// Check if vimium exists, and if it does, then open the vimium warning page
		chrome.management.getAll(function (chromeExtensionList) {
			for (let i = 0; i < chromeExtensionList.length; i++) {
				if (chromeExtensionList[i].id === "dbepggeogbaibhgnhhndojpepiihcmeb") {
					chrome.tabs.create({ url: "vimium_warning.html" });
					break;
				}
			}
		})
	}
	else if(details.reason === "update"){
	    // Extension updated
		chrome.storage.sync.get("updateCheckbox", function(result) { 
			if (result.updateCheckbox !== "false") {
				// We do not open the popup if updateCheckbox = "false", because this means the user has opted
				// to not receive pop-ups when the extension gets updated
				chrome.tabs.create({ url: "changelog.html" });
			}
		});
	}
});