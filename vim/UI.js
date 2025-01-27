import { KEY_SEPARATOR } from "./keybindings";

let UI = {}

UI.setUp = function() {
	// UISequenceContainer goes on the right and shows the current command if it's multiple characters
	this.UISequenceContainerParent = document.querySelector("#kix-appview");
	this.UISequenceContainer = document.createElement("div");
	this.UISequenceContainer.style.position = "absolute";
	this.UISequenceContainer.style.right = "30px";
	this.UISequenceContainer.style.bottom = "0px";
	this.UISequenceContainer.style.width = "50px";
	this.UISequenceContainer.style.height = "30px";
	this.UISequenceContainer.style.color = "black";
	this.UISequenceContainer.style.borderRadius = "3px";
	this.UISequenceContainer.style.fontFamily = "Google Sans, Roboto, sans-serif";
	this.UISequenceContainer.style.fontSize = "16px";
	this.UISequenceContainer.innerHTML = "<span></span>";
	this.UISequenceContainerParent.appendChild(this.UISequenceContainer);

	// UIModeContainer goes on the left and shows the current mode (insert, normal, etc.), or even if
	// the user needs to activate their free trial, it expired, etc

	// The parent was chosen so that the UI is shown with or without the sidebar on the left
	this.UIModeContainerParent = document.querySelector(".left-sidebar-container.docs-ui-unprintable.left-sidebar-container-animation");

	this.UIModeContainer = document.createElement("div");
	this.UIModeContainer.style.position = "absolute";
	this.UIModeContainer.style.left = "30px";
	this.UIModeContainer.style.bottom = "0px";
	this.UIModeContainer.style.width = "180px";
	this.UIModeContainer.style.height = "30px";
	this.UIModeContainer.style.color = "black";
	this.UIModeContainer.style.borderRadius = "3px";
	this.UIModeContainer.style.fontFamily = "Google Sans, Roboto, sans-serif";
	this.UIModeContainer.style.fontSize = "16px";
	this.UIModeContainer.innerHTML = "<span>-- INSERT --</span>";
	this.UIModeContainerParent.appendChild(this.UIModeContainer);
}


UI.updateUISequenceText = function (text) {
	// Called in the vim modules
	this.UISequenceContainer.innerHTML = "<span>" + text + "</span>";
};

UI.updateUIModeText = function (text) {
	// Called in the vim modules
	this.UIModeContainer.innerHTML = "<span>" + text + "</span>";
};

function getCleanedSequence(sequence) {
	// This function takes in a sequence (ex: "d•w") and returns a cleaned version (ex: "dw")
	// This is used to check if a keybinding is already taken or not
	let cleanedSequence;
	cleanedSequence = sequence.replaceAll(KEY_SEPARATOR, "");
	return cleanedSequence;
}

export { UI, getCleanedSequence };
