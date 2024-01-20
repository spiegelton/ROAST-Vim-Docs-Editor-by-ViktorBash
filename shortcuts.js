let nativeElem = document.getElementById("native");
let normalElem = document.getElementById("normal");
let insertElem = document.getElementById("insert");
let replaceElem = document.getElementById("replace");
let visualElem = document.getElementById("visual");
let visualLineElem = document.getElementById("visual-line");

import {
    KEY_SEPARATOR,
    getUltimateKeyMapInCallback,
    getDefaultKeyBindings,
    saveKeyInKeyMap,
    resetToDefaultKeyMap,
    getModifierInput
} from "./vim/keybindings.js";

// If we are in the middle of recording a new keybinding, any clicks to other keybindings will be ignored until the 
// user hits one of the following buttons: "Save", "Cancel" or "Default"
let block_clicks = false;

// Given an id, this function returns a list of elements associated with that id
function getElements(intId) {
    let selectedKey = document.querySelector("#span-1-" + intId);
    let saveButton = document.querySelector("#save-btn-" + intId);
    let cancelButton = document.querySelector("#cancel-btn-" + intId);
    let defaultButton = document.querySelector("#edit-btn-" + intId);
    return [selectedKey, saveButton, cancelButton, defaultButton];
}

// Given an id and a bitmask, this function updates the checkboxes associated with that id
// to show the right value (checked or not) based on the bitmask
function updateCheckboxes(intId, bitmask) {
    let checkBox1 = document.querySelector("#checkbox-1-" + intId);
    let checkBox2 = document.querySelector("#checkbox-2-" + intId);
    let checkBox3 = document.querySelector("#checkbox-3-" + intId);
    let checkBox4 = document.querySelector("#checkbox-4-" + intId);

    checkBox1.checked = bitmask & 8 ? true : false;
    checkBox2.checked = bitmask & 4 ? true : false;
    checkBox3.checked = bitmask & 2 ? true : false;
    checkBox4.checked = bitmask & 1 ? true : false;
}

// Take in a keybinding and it's associated data, and add it to the HTML DOM
// This includes also creating handling functionsf for when we want to update this keybinding
function addHTML(elem, key, id, keyMapStr, keyNameStr) {

    let bitmask = key[2]; // The saved bitmask for this keybinding
    let checked = key[4]; // The saved cut text toggle for this keybinding

    // Build the value of the current key (we need to remove the KEY_SEPARATOR character)
    let curValue = ""; // The saved value for this keybinding, without KEY_SEPARATOR
    for (let j = 0; j < key[0].length; j++) {
        if (key[0][j] !== KEY_SEPARATOR) {
            curValue += key[0][j];
        }
    }

    // When recording a new keymap, curSequence and curBitmask are the new values for this keybinding
    let curSequence = "";
    let curBitmask = 0b000;

    // Handle recording a new keybinding when a user clicks on the keybinding
    let handleOnClick = function (e) {
        if (block_clicks) {
            // If we are in the middle of recording a different keybinding, do nothing for this one
            return;
        }

        // At this point we are not recording any keybindings, so we can proceed and lock it so that the
        // user only has control over this current keybinding as they record it
        block_clicks = true;

        // Let's set the text of the keybinding to nothing and also make "Edit", "Save" and "Default" buttons visible
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        selectedKey.innerHTML = "";
        saveButton.style.display = "inline-block";
        cancelButton.style.display = "inline-block";
        defaultButton.style.display = "inline-block";
        
        // This function handles the recording of a new keybinding, so it is very important
        window.onkeydown = function (e) {
            // Stop the default behavior of the key
            e.preventDefault();
            e.stopPropagation();

            // F1-F12 and modifier keys are not allowed to be used as keybindings
            let not_allowed = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Control", "Shift", "Alt", "Meta"]
            if (not_allowed.includes(e.key)) {
                return;
            }

            if ((keyMapStr === "keyMapI" || keyMapStr === "keyMapR") && curSequence.length > 0) {
                // For both these modes, keybindings longer than 1 key are not allowed
                return;
            }

            // Past this point the key is a valid keybinding that we need to handle it (record, update UIs)

            // Let's update the bitmask with any modifiers that were pressed
            let newBitmask = getModifierInput(e);
            curBitmask = curBitmask | newBitmask;

            selectedKey.innerHTML += e.key; // Update the UI text of the keybinding so the user can see it

            // Let's add to curSequence the keybinding (along with KEY_SEPARATOR if it's not the first key)
            if (curSequence.length > 0) {
                curBitmask = 0b000; // Keybindings longer 1 key don't have modifiers that matter, so let's just set it to 0
                curSequence += KEY_SEPARATOR + e.key;
            }
            else {
                curSequence = e.key;
            }

            updateCheckboxes(id, curBitmask); // Update the checkboxes with the current bitmask
        }
    }

    /*
    * When the user clicks the "Save" button, we need to update some variables and save to chrome.storage.local the new keybinding
    */
    let handleSave = function (e) {
        // We are done editing, so let's stop blocking from clicking on other keybindings
        block_clicks = false;

        // Hide the buttons
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
        defaultButton.style.display = "none";

        // Let's update curValue with the new keybinding (without KEY_SEPARATOR)
        curValue = "";
        for (let i = 0; i < curSequence.length; i++) {
            if (curSequence[i] !== KEY_SEPARATOR) {
                curValue += curSequence[i];
            }
        }

        // Now update on the UI side
        selectedKey.innerHTML = curValue;

        // Update the bitmask
        bitmask = curBitmask;

        // Save the new keybinding to chrome.storage.local with this function call
        saveKeyInKeyMap(keyMapStr, keyNameStr, curSequence, curBitmask, checked);

        // Reset curSequence and curBitmask to empty values (for the next time the user goes to edit this keybinding)
        curSequence = "";
        curBitmask = 0b000;

        // Let's terminate recording the keystrokes of the user
        window.onkeydown = null;
    }

    /*
    * When the user clicks the "Cancel" button, we need to update some variables and revert the UI back to the original keybinding
    */
    let handleCancel = function (e) {
        block_clicks = false; // Stop blocking clicks on other keybindings

        // Hide the buttons
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
        defaultButton.style.display = "none";

        // Update the UI to the old value
        selectedKey.innerHTML = curValue;

        // Reset the curSequence and curBitmask to empty values (for the next time the user goes to edit this keybinding)
        curSequence = "";
        curBitmask = 0b000;

        // Update the checkboxes to show the correct bitmask values
        updateCheckboxes(id, bitmask);

        // Let's terminate recording the keystrokes of the user
        window.onkeydown = null;
    }

    /*
    * When the user clicks the "Default" button, we need to update some variables and revert the UI back to the default keybinding
    */
    let handleDefault = function (e) {
        block_clicks = false; // Stop blocking clicks on other keybindings

        // Hide the buttons
        let [selectedKey, saveButton, cancelButton, defaultButton] = getElements(id);
        saveButton.style.display = "none";
        cancelButton.style.display = "none";
        defaultButton.style.display = "none";

        // Get the default keybinding entry from the default keybindings return function
        let defaultArr = getDefaultKeyBindings()[keyMapStr][keyNameStr];

        let defaultRawValue = defaultArr[0]; // Include KEY_SEPARATOR, for savingg
        let defaultDisplayValue = ""; // Does not include KEY_SEPARATOR, for displaying

        // Build defaultDisplayValue from defaultRawValue
        for (let i = 0; i < defaultRawValue.length; i++) {
            if (defaultRawValue[i] !== KEY_SEPARATOR) {
                defaultDisplayValue += defaultRawValue[i];
            }
        }
        
        // Reset the curSequence and curBitmask to empty values (for the next time the user goes to edit this keybinding)
        curSequence = "";
        curBitmask = "";
        checked = defaultArr[4];


        // Update curValue to the correct value for the keybinding now, and update the UI too
        curValue = defaultDisplayValue;
        selectedKey.innerHTML = curValue;

        // Update the bitmask to the right one as well
        bitmask = defaultArr[2];
        
        // Update the checkboxes to show the correct bitmask values
        updateCheckboxes(id, defaultArr[2]);

        // Let's save to the backend now the default keybinding to make it final
        saveKeyInKeyMap(keyMapStr, keyNameStr, defaultRawValue, defaultArr[2], checked)

        // Let's update the cut checkbox to show the correct value (if it exists)
        let checkbox = document.getElementById("checkbox-cut-text-" + id);
        if (checkbox !== null) {
            checkbox.checked = checked;
        }

        // Let's terminate recording the keystrokes of the user
        window.onkeydown = null;
    }

    let handleCutText = function (e) {
        checked = e.target.checked;
        let sequence = "";
        for (let i = 0; i < curValue.length; i++) {
            sequence += curValue[i] + KEY_SEPARATOR;
        }
        sequence = sequence.slice(0, -1); // Remove the last KEY_SEPARATOR
        saveKeyInKeyMap(keyMapStr, keyNameStr, sequence, bitmask, checked);
    }

    // Create the HTML elements (tr, span, checkbox1, checkbox2, checkbox3, checkbox4)
    // Then, we'll append them to the normalElem element (they will be in the DOM then)

    // Container (<tr>) for everything below
    // We will add <td> (rows) to this container, and append the whole thing to the table at the end
    let tr = document.createElement("tr");
    tr.id = "tr-" + id;

    // Text that shows the keybinding's value (Column 1)
    let keyBindingValueCol = document.createElement("td");
    let keyBindingValue = document.createElement("span");
    keyBindingValue.id = "span-1-" + id;
    keyBindingValue.classList.add("key-text");
    keyBindingValue.innerHTML = curValue;
    keyBindingValueCol.appendChild(keyBindingValue);
    tr.appendChild(keyBindingValueCol);

    // Pencil icon that acts as a button for editing the keybinding, made with an SVG
    let icon = document.createElement("svg");
    icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    icon.setAttribute("fill", "#000000");
    icon.setAttribute("width", "24px");
    icon.setAttribute("height", "24px");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.innerHTML = "<path d='M20.7,5.2a1.024,1.024,0,0,1,0,1.448L18.074,9.276l-3.35-3.35L17.35,3.3a1.024,1.024,0,0,1,1.448,0Zm-4.166,5.614-3.35-3.35L4.675,15.975,3,21l5.025-1.675Z'/>"

    // Container for the icon
    let editCol = document.createElement("td");
    let iconContainer = document.createElement("span");
    iconContainer.classList.add("iconContainer");
    iconContainer.width = "24px";
    iconContainer.height = "24px";
    iconContainer.appendChild(icon); // icon is child of iconContainer
    iconContainer.innerHTML += "";
    iconContainer.onclick = handleOnClick;
    editCol.appendChild(iconContainer);

    // saveButton, cancelButton, and defaultButton are buttons that are hidden by default
    // They are shown when the user clicks on the keybinding to edit it

    // For some reason, the SVG moves 1 px up/down on toggle of the buttons
    // For that reason, we add this button here (instead of using margin-right on the SVG container), so that the SVG doesn't move on toggle
    // of the buttons. This blank button is invisible but still takes up space
    let blankButton = document.createElement("button");
    blankButton.textContent = "Hi";
    blankButton.classList = "blank-button"; // In the CSS we use this to dictate that the button cursor on hover is default
    // Make the button invisible but still take up space
    blankButton.style.opacity = "0";

    editCol.appendChild(blankButton);

    let saveButton = document.createElement("button");
    saveButton.id = "save-btn-" + id;
    saveButton.innerHTML = "Save";
    saveButton.style.display = "none";
    saveButton.onclick = handleSave;
    editCol.appendChild(saveButton);

    let cancelButton = document.createElement("button");
    cancelButton.id = "cancel-btn-" + id;
    cancelButton.innerHTML = "Cancel";
    cancelButton.style.display = "none";
    cancelButton.onclick = handleCancel;
    editCol.appendChild(cancelButton);

    let defaultButton = document.createElement("button");
    defaultButton.id = "edit-btn-" + id;
    defaultButton.innerHTML = "Default";
    defaultButton.style.display = "none";
    defaultButton.onclick = handleDefault;
    editCol.appendChild(defaultButton);

    tr.appendChild(editCol);

    // checkbox1, checkbox2, checkbox3, and checkbox4 are disabled checkboxes that show the current modifier keys for this keybinding
    // The value of checked or not depends on the bitmask

    // Ctrl
    let checkbox1Col = document.createElement("td");
    let checkbox1 = document.createElement("input");
    checkbox1.type = "checkbox";
    checkbox1.checked = bitmask & 8 ? true : false;
    checkbox1.disabled = true;
    checkbox1.id = "checkbox-1-" + id;
    checkbox1Col.appendChild(checkbox1);
    tr.appendChild(checkbox1Col);

    // Shift
    let checkbox2Col = document.createElement("td");
    let checkbox2 = document.createElement("input");
    checkbox2.type = "checkbox";
    checkbox2.checked = bitmask & 4 ? true : false;
    checkbox2.disabled = true;
    checkbox2.id = "checkbox-2-" + id;
    checkbox2Col.appendChild(checkbox2);
    tr.appendChild(checkbox2Col);

    // Alt
    let checkbox3Col = document.createElement("td");
    let checkbox3 = document.createElement("input");
    checkbox3.type = "checkbox";
    checkbox3.checked = bitmask & 2 ? true : false;
    checkbox3.disabled = true;
    checkbox3.id = "checkbox-3-" + id;
    checkbox3Col.appendChild(checkbox3);
    tr.appendChild(checkbox3Col);

    // Meta
    let checkbox4Col = document.createElement("td");
    let checkbox4 = document.createElement("input");
    checkbox4.type = "checkbox";
    checkbox4.checked = bitmask & 1 ? true : false;
    checkbox4.disabled = true;
    checkbox4.id = "checkbox-4-" + id;
    checkbox4Col.appendChild(checkbox4);
    tr.appendChild(checkbox4Col);

    // Cut text toggle
    let cutTextCol = document.createElement("td");
    if (key[4] !== null) {
        let checkboxCutText = document.createElement("input");
        checkboxCutText.type = "checkbox";
        checkboxCutText.checked = key[4];
        checkboxCutText.onclick = handleCutText;
        checkboxCutText.id = "checkbox-cut-text-" + id;
        cutTextCol.appendChild(checkboxCutText);
    }
    tr.appendChild(cutTextCol);

    let descriptionCol = document.createElement("td");
    descriptionCol.innerHTML = key[3];
    tr.appendChild(descriptionCol);

    // Now tr has everything inside of it, so append it to it's parent element
    // (which is passed in as an argument to this function)
    elem.appendChild(tr);
}

// Here we call the function getUltimateKeyMapInCallback(), and pass in the callback function that
// runs once it's completed
// This is the "entry" point of the script
getUltimateKeyMapInCallback(function (ultimateKeyMap) {
    // We have the current list of the user's keymaps in the ultimateKeyMap variable


    // This ID very important because it is used to identify each keymap in the HTML elements,
    // We increment it as we add more keymaps
    let id = 1;

    // Add native keymaps
    let keyMapNative = ultimateKeyMap["keyMapNative"];
    let nativeKeys = Object.keys(keyMapNative);

    for (let i = 0; i < nativeKeys.length; i++) {
        // Loop through each keymap in the normal mode keymaps
        let key = keyMapNative[nativeKeys[i]]; // We now have the array holding the specific keybinding's data
        addHTML(nativeElem, key, id, "keyMapNative", nativeKeys[i]);
        id += 1;
    }

    // Add normal mode keymaps
    let keyMapN = ultimateKeyMap["keyMapN"];
    let normalKeys = Object.keys(keyMapN);

    for (let i = 0; i < normalKeys.length; i++) {
        // Loop through each keymap in the normal mode keymaps
        let key = keyMapN[normalKeys[i]]; // We now have the array holding the specific keybinding's data
        addHTML(normalElem, key, id, "keyMapN", normalKeys[i]);
        id += 1;
    }

    // Add insert mode keymaps
    let keyMapI = ultimateKeyMap["keyMapI"];
    let insertKeys = Object.keys(keyMapI);

    for (let i = 0; i < insertKeys.length; i++) {
        // Loop through each keymap in the insert mode keymaps
        let key = keyMapI[insertKeys[i]]; // We now have the array holding the specific keybinding's data
        addHTML(insertElem, key, id, "keyMapI", insertKeys[i]);
        id += 1;
    }

    // Add replace mode keymaps
    let keyMapR = ultimateKeyMap["keyMapR"];
    let replaceKeys = Object.keys(keyMapR);

    for (let i = 0; i < replaceKeys.length; i++) {
        // Loop through each keymap in the insert mode keymaps
        let key = keyMapR[replaceKeys[i]]; // We now have the array holding the specific keybinding's data
        addHTML(replaceElem, key, id, "keyMapR", replaceKeys[i]);
        id += 1;
    }

    // Add visual mode keymaps
    let keyMapV = ultimateKeyMap["keyMapV"];
    let visualKeys = Object.keys(keyMapV);

    for (let i = 0; i < visualKeys.length; i++) {
        // Loop through each keymap in the visual mode keymaps
        let key = keyMapV[visualKeys[i]]; // We now have the array holding the specific keybinding's data
        addHTML(visualElem, key, id, "keyMapV", visualKeys[i]);
        id += 1;
    }

    // Add visual line mode keymaps
    let keyMapVLine = ultimateKeyMap["keyMapVLine"];
    let visualLineKeys = Object.keys(keyMapVLine);

    for (let i = 0; i < visualLineKeys.length; i++) {
        // Loop through each keymap in the visual line mode keymaps
        let key = keyMapVLine[visualLineKeys[i]]; // We now have the array holding the specific keybinding's data
        addHTML(visualLineElem, key, id, "keyMapVLine", visualLineKeys[i]);
        id += 1;
    }

    // Wire up collapsible buttons to their respective tables
    let collapseAndTables = [
        [document.getElementById("dropdown-native"), document.getElementById("native-table")],
        [document.getElementById("dropdown-normal"), document.getElementById("normal-table")],
        [document.getElementById("dropdown-insert"), document.getElementById("insert-table")],
        [document.getElementById("dropdown-replace"), document.getElementById("replace-table")],
        [document.getElementById("dropdown-visual"), document.getElementById("visual-table")],
        [document.getElementById("dropdown-visual-line"), document.getElementById("visual-line-table")]
    ]

    for (let index = 0; index < collapseAndTables.length; index++) {
        let collapseElem = collapseAndTables[index][0];
        let table = collapseAndTables[index][1];

        collapseElem.onclick = function (e) {
            // When we click the toggle let's toggle the table's display and also how the toggle looks itself
            if (table.style.display === "none") {
                table.style.display = "inline-block";
                collapseElem.classList = "fa fa-caret-down";
            }
            else {
                table.style.display = "none";
                collapseElem.classList = "fa fa-caret-right";
            }
        }
    }

    // Reset button functionality
    let resetButton = document.getElementById("reset-btn");
    let resetModal = document.getElementById("reset-modal");
    
    let resetModalConfirmBtn = document.getElementById("reset-modal-confirm-btn");
    let resetModalCancelBtn = document.getElementById("reset-modal-cancel-btn");

    resetButton.onclick = function (e) {
        resetModal.style.display = "block";
    }

    window.onclick = function (e) {
        if (e.target === resetModal) {
            resetModal.style.display = "none"; // Clicked anywhere outside of the modal-content, so close the modal
        }
        else if (e.target === resetModalCancelBtn) {
            resetModal.style.display = "none"; // Clicked the cancel button, so close the modal
        }
        else if (e.target === resetModalConfirmBtn) {
            resetModal.style.display = "none";
            resetToDefaultKeyMap(function () {
                // Inside of the callback function (clearing finished)

                // Refresh the page to show the new keybindings
                location.reload();

            }); // in keybindings.js
        }
    }


});

// Any code outside of the function (here) will likely run before the keybindings are loaded in (bad)