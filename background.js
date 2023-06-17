importScripts('dist/ExtPay.js');

var extpay = ExtPay('vim-for-docs'); // Extension ID
extpay.startBackground();  // Required, have extpay running in the background

// When user pays, refresh google docs so they can use the extension
extpay.onPaid.addListener(() => {
	// Reload the google doc after a user just paid
    chrome.tabs.query({
        url: "*://*.google.com/*document/d/*/edit*" 
    }, function(tabs) {
        for (let i = 0; i < tabs.length; i++) {
            chrome.tabs.reload(tabs[i].id);
        }
    })
});

// When user pays, refresh google docs so they can use the extension
extpay.onTrialStarted.addListener(() => {
	// Reload the google doc after a user just started their trial
    chrome.tabs.query({
        url: "*://*.google.com/*document/d/*/edit*" 
    }, function(tabs) {
        for (let i = 0; i < tabs.length; i++) {
            chrome.tabs.reload(tabs[i].id);
        }
    })
});

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        // When the extension is installed for the first time, prompt them to the popup HTML page
        // this opens on a full tab screen instead of a window
        chrome.tabs.create({url: "popup.html"});
        
    }
    // else if(details.reason == "update"){
    //     // Extension updated
    //     var thisVersion = chrome.runtime.getManifest().version;
    //     console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    // }
});