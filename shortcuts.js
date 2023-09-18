let normalElem = document.getElementById("normal");
let insertElem = document.getElementById("insert");
let visualElem = document.getElementById("visual");
let visualLineElem = document.getElementById("visual-line");

import { KEY_SEPARATOR, getUltimateKeyMapInCallback, getDefaultKeyBindings, saveKeyInKeyMap } from "./vim/keybindings.js";

let block_clicks = false;

function getElements(intId) {
    let selectedKey = document.querySelector("#span-1-" + intId);
    let saveButton = document.querySelector("#save-btn-" + intId);
    let cancelButton = document.querySelector("#cancel-btn-" + intId);
    let defaultButton = document.querySelector("#edit-btn-" + intId);
    return [selectedKey, saveButton, cancelButton, defaultButton];
}

function addHTML(elem, key, id, keyMapStr, keyNameStr) {
    let bitmask = key[2];

    // Build the value of the current key (we need to remove the KEY_SEPARATOR character)
    let curValue = "";
    for (let j = 0; j < key[0].length; j++) {
        if (key[0][j] !== KEY_SEPARATOR) {
            curValue += key[0][j];
        }
    }

    let curSequence = ""; // This comes into play when the user "saves" a new keymap value, and also
    // for updating as they type

    let handleOnClick = function (e) {
        if (block_clicks) {
            return;
        }
        block_clicks = true;
        // This function handles when a user clicks on a keymap's value (to change it)
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        selectedKey.innerHTML = "";
        saveButton.style.display = "inline-block";
        cancelButton.style.display = "inline-block";
        defaultButton.style.display = "inline-block";
        
        window.onkeydown = function (e) {
            e.preventDefault();
            e.stopPropagation();

            selectedKey.innerHTML += e.key;
            if (curSequence.length > 0) {
                curSequence += KEY_SEPARATOR + e.key;
            }
            else {
                curSequence = e.key;
            }
        }
    }

    let handleSave = function (e) {
        block_clicks = false;
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
        defaultButton.style.display = "none";

        curValue = "";
        for (let i = 0; i < curSequence.length; i++) {
            if (curSequence[i] !== KEY_SEPARATOR) {
                curValue += curSequence[i];
            }
        }
        selectedKey.innerHTML = curValue;

        // curSequence holds the new value in raw form
        
        saveKeyInKeyMap(keyMapStr, keyNameStr, curSequence, 0b000)
        curSequence = "";
        window.onkeydown = null;
    }

    let handleCancel = function (e) {
        block_clicks = false;
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
        defaultButton.style.display = "none";
        selectedKey.innerHTML = curValue;
        curSequence = "";
        window.onkeydown = null;
    }

    let handleDefault = function (e) {
        block_clicks = false;
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
        defaultButton.style.display = "none";
        let defaultArr = getDefaultKeyBindings()[keyMapStr][keyNameStr];
        let defaultRawValue = defaultArr[0];
        let defaultDisplayValue = "";

        // Build the default display value
        for (let i = 0; i < defaultRawValue.length; i++) {
            if (defaultRawValue[i] !== KEY_SEPARATOR) {
                defaultDisplayValue += defaultRawValue[i];
            }
        }
        
        curSequence = "";
        // Now we have displayed the default value
        curValue = defaultDisplayValue;
        selectedKey.innerHTML = curValue;

        saveKeyInKeyMap(keyMapStr, keyNameStr, defaultRawValue, defaultArr[2])
        window.onkeydown = null;
    }

    // Create the HTML elements (li, span, checkbox1, checkbox2, checkbox3, checkbox4)
    // Then, we'll append them to the normalElem element (they will be in the DOM then)
    let li = document.createElement("li");
    li.id = "li-" + id;

    let span = document.createElement("span");
    span.id = "span-1-" + id;
    span.classList.add("key");
    span.innerHTML = curValue;
    li.appendChild(span);

    // <svg xmlns="http://www.w3.org/2000/svg" fill="#000000" width="800px" height="800px" viewBox="0 0 24 24"><path d="M20.7,5.2a1.024,1.024,0,0,1,0,1.448L18.074,9.276l-3.35-3.35L17.35,3.3a1.024,1.024,0,0,1,1.448,0Zm-4.166,5.614-3.35-3.35L4.675,15.975,3,21l5.025-1.675Z"/></svg>
    let icon = document.createElement("svg");
    icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    icon.setAttribute("fill", "#000000");
    icon.setAttribute("width", "20px");
    icon.setAttribute("height", "20px");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.innerHTML = "<path d='M20.7,5.2a1.024,1.024,0,0,1,0,1.448L18.074,9.276l-3.35-3.35L17.35,3.3a1.024,1.024,0,0,1,1.448,0Zm-4.166,5.614-3.35-3.35L4.675,15.975,3,21l5.025-1.675Z'/>"

    let iconContainer = document.createElement("span");
    iconContainer.classList.add("iconContainer");
    iconContainer.width = "20px";
    iconContainer.height = "20px";
    iconContainer.appendChild(icon);
    iconContainer.innerHTML += "";
    iconContainer.onclick = handleOnClick;
    li.appendChild(iconContainer);


    let checkbox1 = document.createElement("input");
    checkbox1.type = "checkbox";
    checkbox1.checked = bitmask & 8 ? true : false;
    checkbox1.disabled = true;
    li.appendChild(checkbox1);

    let checkbox2 = document.createElement("input");
    checkbox2.type = "checkbox";
    checkbox2.checked = bitmask & 4 ? true : false;
    checkbox2.disabled = true;
    li.appendChild(checkbox2);

    let checkbox3 = document.createElement("input");
    checkbox3.type = "checkbox";
    checkbox3.checked = bitmask & 2 ? true : false;
    checkbox3.disabled = true;
    li.appendChild(checkbox3);

    let checkbox4 = document.createElement("input");
    checkbox4.type = "checkbox";
    checkbox4.checked = bitmask & 1 ? true : false;
    checkbox4.disabled = true;
    li.appendChild(checkbox4);

    let saveButton = document.createElement("button");
    saveButton.id = "save-btn-" + id;
    saveButton.innerHTML = "Save";
    saveButton.style.display = "none";
    saveButton.onclick = handleSave;
    li.appendChild(saveButton);

    let cancelButton = document.createElement("button");
    cancelButton.id = "cancel-btn-" + id;
    cancelButton.innerHTML = "Cancel";
    cancelButton.style.display = "none";
    cancelButton.onclick = handleCancel;
    li.appendChild(cancelButton);

    let defaultButton = document.createElement("button");
    defaultButton.id = "edit-btn-" + id;
    defaultButton.innerHTML = "Default";
    defaultButton.style.display = "none";
    defaultButton.onclick = handleDefault;
    li.appendChild(defaultButton);


    elem.appendChild(li);
}

getUltimateKeyMapInCallback(function (ultimateKeyMap) {
    // We have the current list of the user's keymaps in the ultimateKeyMap variable

    // Normal mode keymaps
    let keyMapN = ultimateKeyMap["keyMapN"];
    let normalKeys = Object.keys(keyMapN);

    let id = 1;

    for (let i = 0; i < normalKeys.length; i++) {
        let key = keyMapN[normalKeys[i]]; // We now have the array holding the keymap's data
        addHTML(normalElem, key, id, "keyMapN", normalKeys[i]);
        id += 1;
    }

    // Insert mode keymaps
    let keyMapI = ultimateKeyMap["keyMapI"];
    let insertKeys = Object.keys(keyMapI);

    for (let i = 0; i < insertKeys.length; i++) {
        let key = keyMapI[insertKeys[i]]; // We now have the array holding the keymap's data
        addHTML(insertElem, key, id, "keyMapI", insertKeys[i]);
        id += 1;
    }

    // Visual mode keymaps
    let keyMapV = ultimateKeyMap["keyMapV"];
    let visualKeys = Object.keys(keyMapV);

    for (let i = 0; i < visualKeys.length; i++) {
        let key = keyMapV[visualKeys[i]]; // We now have the array holding the keymap's data
        addHTML(visualElem, key, id, "keyMapV", visualKeys[i]);
        id += 1;
    }

    // Visual line mode keymaps
    let keyMapVLine = ultimateKeyMap["keyMapVLine"];
    let visualLineKeys = Object.keys(keyMapVLine);

    for (let i = 0; i < visualLineKeys.length; i++) {
        let key = keyMapVLine[visualLineKeys[i]]; // We now have the array holding the keymap's data
        addHTML(visualLineElem, key, id, "keyMapVLine", visualLineKeys[i]);
        id += 1;
    }

});
