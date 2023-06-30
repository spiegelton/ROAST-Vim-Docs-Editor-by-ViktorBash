// UISequenceContainer goes on the right and shows the current command if it's multiple characters
const UIDocHead = document.querySelector("#kix-appview");
const UISequenceContainer = document.createElement("div");
UISequenceContainer.style.position = "absolute";
UISequenceContainer.style.right = "30px";
UISequenceContainer.style.bottom = "0px";
UISequenceContainer.style.width = "50px";
UISequenceContainer.style.height = "30px";
UISequenceContainer.style.color = "black";
UISequenceContainer.style.borderRadius = "3px";
UISequenceContainer.style.fontFamily = "Google Sans, Roboto, sans-serif";
UISequenceContainer.style.fontSize = "16px";
UISequenceContainer.innerHTML = "<span></span>";
UIDocHead.appendChild(UISequenceContainer);

const updateUISequenceText = function (text) {
	// Called in the vim modules
	UISequenceContainer.innerHTML = "<span>" + text + "</span>";
};


// UIModeContainer goes on the left and shows the current mode (insert, normal, etc..), or even if
// the user needs to activate their free trial, it expired, etc
const UIModeContainer = document.createElement("div");
UIModeContainer.style.position = "absolute";
UIModeContainer.style.left = "30px";
UIModeContainer.style.bottom = "0px";
UIModeContainer.style.width = "180px";
UIModeContainer.style.height = "30px";
UIModeContainer.style.color = "black";
UIModeContainer.style.borderRadius = "3px";
UIModeContainer.style.fontFamily = "Google Sans, Roboto, sans-serif";
UIModeContainer.style.fontSize = "16px";
UIModeContainer.innerHTML = "<span>-- INSERT --</span>";
UIDocHead.appendChild(UIModeContainer);

const updateUIModeText = function (text) {
	// Called in the vim modules
	UIModeContainer.innerHTML = "<span>" + text + "</span>";
};

export { updateUISequenceText, updateUIModeText };