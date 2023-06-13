importScripts('dist/ExtPay.js');

var extpay = ExtPay('quantier-2'); // Extension ID
extpay.startBackground();  // Required, have extpay running in the background

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