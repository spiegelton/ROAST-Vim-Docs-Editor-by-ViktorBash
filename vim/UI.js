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
	UISequenceContainer.innerHTML = "<span>" + text + "</span>";
};

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
	UIModeContainer.innerHTML = "<span>" + text + "</span>";
};

export { updateUISequenceText, updateUIModeText };