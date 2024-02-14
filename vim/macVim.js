import { getCleanedSequence } from "./UI.js";
import {getModifierInput, KEY_SEPARATOR} from "./keybindings.js";

let docs;
let UI;
let keyMap;

let macVim = {
	// Main variables here
	mode: "insert", // Keep track of current mode, options: ["insert", "normal", "visual", "visual_line"]
	num: "", // Keep track of number keys pressed by the user if they want to repeat a command
	currentSequence: "", // Keep track of key sequences (ex: "gg")
    // Note: There is no "incompleteKeyMapsI" because commands can be a max of 1 character in insert mode
    replaceModeUndoCounterStack: [],
    // The reason we use a stack instead of a counter is because if we hit enter we need to do 1 undo, but if
    // we hit any other regular key we need to do 2 undos, if we added to the end of a line we need to do 1 undo
    visualLineModeDown: true, // Keep track of whether we're highlighting up or down
};

// List of shortcuts for normal, visual and visual line mode that we will let pass through, primarily Chrome shortcuts
macVim.chromeShortcuts = [
    // Chrome shortcut for switching tabs
    ["1", false, false, true, false], // Command + 1
    ["2", false, false, true, false], // Command + 2
    ["3", false, false, true, false], // Command + 3
    ["4", false, false, true, false], // Command + 4
    ["5", false, false, true, false], // Command + 5
    ["6", false, false, true, false], // Command + 6
    ["7", false, false, true, false], // Command + 7
    ["8", false, false, true, false], // Command + 8
    ["9", false, false, true, false], // Command + 9
]

macVim.isChromeShortcut = function (e) {
    let checkIfNativeShortcut = [e.key, e.altKey, e.ctrlKey, e.metaKey, e.shiftKey];

    for (let i = 0; i < this.chromeShortcuts.length; i++) {
        let equal = true;
        for (let j = 0; j < this.chromeShortcuts[i].length; j++) {
            if (this.chromeShortcuts[i][j] !== checkIfNativeShortcut[j]) {
                equal = false;
                break;
            }
        }
        if (equal) {
            return true;
        }
    }
    return false;
}

macVim.setUp = function (docsInstance, UIInstance, keyMapInstance) {
    docs = docsInstance;
    UI = UIInstance;
    keyMap = keyMapInstance;
}

macVim.switchToNormalMode = function () {
	macVim.currentSequence = "";
	macVim.mode = "normal";
	macVim.num = "";
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- NORMAL --");
	docs.setCursorWidth(this.mode);
};

macVim.switchToReplaceMode = function () {
    this.currentSequence = "";
    this.mode = "replace";
    this.num = "";
    UI.updateUISequenceText("");
    UI.updateUIModeText("-- REPLACE --");
    docs.setCursorWidth(this.mode);
};

macVim.switchToVisualMode = function (highlightText = true) {
	macVim.currentSequence = "";
	macVim.mode = "visual";
	macVim.num = "";
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- VISUAL --");
	docs.setCursorWidth(this.mode);

    // We do not highlight text if we switch to visual mode from mouse movement (false is passed in during that scenario)
    if (highlightText) {
        docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
    }
};

macVim.switchToVisualLineMode = function () {
	macVim.currentSequence = "";
	macVim.mode = "visual_line";
	macVim.num = "";
    macVim.visualLineModeDown = true;
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- VISUAL LINE --");
	docs.setCursorWidth(this.mode);

    // Get to the start of the current line
    this.moveToStartOfLine();

    // Detect if we're on an empty line or not
    let [startXCoord, startYCoord] = docs.getCoords();
    docs.pressKey(docs.codeFromKey("ArrowRight"));
    let [endXCoord, endYCoord] = docs.getCoords();

    if (startXCoord === endXCoord && startYCoord === endYCoord) {
        // At end of file on empty line, highlight
        docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
    }
    else if (startYCoord !== endYCoord) {
        // On empty line, highlight the empty line
        docs.pressKey(docs.codeFromKey("ArrowLeft")); // Reverse our ArrowRight
        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
    }
    else {
        // On non-empty line
        docs.pressKey(docs.codeFromKey("ArrowLeft")); // Reverse our ArrowRight
        docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
    }
}

macVim.switchToInsertMode = function () {
	macVim.currentSequence = "";
	macVim.mode = "insert";
	macVim.num = "";
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- INSERT --");
	docs.setCursorWidth(this.mode);
};

/*
* Paste whatever is in the clipboard at the appropriate place (lot of logic to move the cursor around)
* You don't just simply paste because for 'p', you paste after the cursor, so there's logic to deal
* with stuff like being at the end of a line or multiline
*/
macVim.moveRightToPasteAfterCursor = function () {
	// The main thing is to check that if we're at the end, are we at the end of a multiline or real line
    let [startXCoord, startYCoord] = docs.getCoords();
    docs.pressKey(docs.codeFromKey("ArrowRight"));
    let [midXCoord, midYCoord] = docs.getCoords();
    if (startXCoord === midXCoord && startYCoord === midYCoord) {
        // At end of file, do nothing (in right place)
    }
    else if (startYCoord !== midYCoord) {
        // Need to check whether on end of line or multiline
        docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
        let [endXCoord, endYCoord] = docs.getCoords();
        if (startXCoord === endXCoord && startYCoord === endYCoord) {
            // At end of a real line, we already are in the right place now
        }
        else {
            // Must deal with multiline
            docs.pressKey(docs.codeFromKey("ArrowRight"), true); // Get back to original position
            docs.pressKey(docs.codeFromKey("ArrowRight")); // Move one right
        }

    }
    else {
        // In the middle of a line, we are in the right place already since we moved 1 left
    }
};

macVim.clearData = function () {
	macVim.num = "";
	macVim.currentSequence = "";
	UI.updateUISequenceText("");
	docs.setCursorWidth(this.mode);
}

// Move to the end of a real line
// Used by "A" and "$"
macVim.moveToEndOfLine = function () {
	let [startXCoord, startYCoord] = docs.getCoords();
	docs.pressKey(docs.codeFromKey("ArrowLeft"));
	let [midXCoord, midYCoord] = docs.getCoords();
	if (startXCoord === midXCoord && startYCoord === midYCoord) {
		// At start of file, test to ensure it's not an empty line
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let [endXCoord, endYCoord] = docs.getCoords();

		if (endYCoord !== midYCoord) {
			// On an empty line, just go back to it
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		else {
			// Not an empty line, safe to control + arrow
			docs.pressKey(docs.codeFromKey("ArrowLeft")); // Go back
			docs.pressKey(docs.codeFromKey("ArrowDown"), true);
		}
	}
	else {
		docs.pressKey(docs.codeFromKey("ArrowDown"), true);
	}
};

macVim.moveToStartOfLine = function () {
    let [startXCoord, startYCoord] = docs.getCoords();
	docs.pressKey(docs.codeFromKey("ArrowRight"));
	let newCoords = docs.userCursor.style.transform;
    let [newXCoord, newYCoord] = docs.getCoords();
    if (startXCoord === newXCoord && startYCoord === newYCoord) {
		// We are at the end of a file (which may be an empty line, so we have to test for that)
        let [initialXCoord, initialYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
        let [finalXCoord, finalYCoord] = docs.getCoords();

		// We are going to check Y-Values, if the y-value didn't change, hit arrow up
		// If the y value did change, hit arrow right
		if (initialYCoord === finalYCoord) {
			// Y Coord didn't change, so we should get to the start of a line with arrow up
            docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true);
		} else {
			// Y Coord changed, so we were at the start of a line (so just go back)
			docs.pressKey(docs.codeFromKey("ArrowRight"));
		}
	} else {
		// We can just arrow up from here in all scenarios
		docs.pressKey(docs.codeFromKey("ArrowUp"), true);
	}
};

// shouldWeCut is boolean
macVim.deleteOrCut = function(shouldWeCut) {
    if (shouldWeCut === true) {
        docs.contentDocument.execCommand("cut");
    }
    else {
        docs.pressKey(docs.codeFromKey("Backspace"));
    }
}

// shouldWeCut is boolean
// There are 2 ways to undo and which one is the correct one to do depends on whether you deleted (Backspaceed) or cut the text
// Consequently this function does both since undo depends on how you deleted/cut the text
macVim.deleteOrCutAndUndo = function(shouldWeCut) {
    if (shouldWeCut === true) {
        docs.contentDocument.execCommand("cut");
        docs.contentDocument.execCommand("undo")
    }
    else {
        docs.pressKey(docs.codeFromKey("Backspace"));
        docs.pressKey(docs.codeFromKey("Z"), true);
    }
}

macVim.nativeKeyCheck = function (modifierInput) {
    const keyMapNative = keyMap.keyMapNative;
    switch (true) {
        case (keyMapNative.bold[0] === this.currentSequence && (keyMapNative.bold[1] === true || keyMapNative.bold[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.bold);
            return true;
        }
        case (keyMapNative.italic[0] === this.currentSequence && (keyMapNative.italic[1] === true || keyMapNative.italic[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.italic);
            return true;
        }
        case (keyMapNative.underline[0] === this.currentSequence && (keyMapNative.underline[1] === true || keyMapNative.underline[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.underline);
            return true;
        }
        case (keyMapNative.link[0] === this.currentSequence && (keyMapNative.link[1] === true || keyMapNative.link[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.link);
            return true;
        }
        case (keyMapNative.comment[0] === this.currentSequence && (keyMapNative.comment[1] === true || keyMapNative.comment[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.comment);
            return true;
        }
        case (keyMapNative.checkList[0] === this.currentSequence && (keyMapNative.checkList[1] === true || keyMapNative.checkList[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.checkList);
            return true;
        }
        case (keyMapNative.bulletedList[0] === this.currentSequence && (keyMapNative.bulletedList[1] === true || keyMapNative.bulletedList[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.bulletedList);
            return true;
        }
        case (keyMapNative.numberedList[0] === this.currentSequence && (keyMapNative.numberedList[1] === true || keyMapNative.numberedList[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.numberedList);
            return true;
        }
        case (keyMapNative.alignLeft[0] === this.currentSequence && (keyMapNative.alignLeft[1] === true || keyMapNative.alignLeft[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.alignLeft);
            return true;
        }
        case (keyMapNative.alignCenter[0] === this.currentSequence && (keyMapNative.alignCenter[1] === true || keyMapNative.alignCenter[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.alignCenter);
            return true;
        }
        case (keyMapNative.alignRight[0] === this.currentSequence && (keyMapNative.alignRight[1] === true || keyMapNative.alignRight[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.alignRight);
            return true;
        }
        case (keyMapNative.alignJustify[0] === this.currentSequence && (keyMapNative.alignJustify[1] === true || keyMapNative.alignJustify[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.alignJustify);
            return true;
        }
        case (keyMapNative.increaseFontSize[0] === this.currentSequence && (keyMapNative.increaseFontSize[1] === true || keyMapNative.increaseFontSize[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.increaseFontSize);
            return true;
        }
        case (keyMapNative.decreaseFontSize[0] === this.currentSequence && (keyMapNative.decreaseFontSize[1] === true || keyMapNative.decreaseFontSize[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.decreaseFontSize);
            return true;
        }
        case (keyMapNative.spellingAndGrammarCheck[0] === this.currentSequence && (keyMapNative.spellingAndGrammarCheck[1] === true || keyMapNative.spellingAndGrammarCheck[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.spellingAndGrammarCheck);
            return true;
        }
        case (keyMapNative.clearFormatting[0] === this.currentSequence && (keyMapNative.clearFormatting[1] === true || keyMapNative.clearFormatting[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.clearFormatting);
            return true;
        }
        case (keyMapNative.normalText[0] === this.currentSequence && (keyMapNative.normalText[1] === true || keyMapNative.normalText[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.normalText);
            return true;
        }
        case (keyMapNative.heading1[0] === this.currentSequence && (keyMapNative.heading1[1] === true || keyMapNative.heading1[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.heading1);
            return true;
        }
        case (keyMapNative.heading2[0] === this.currentSequence && (keyMapNative.heading2[1] === true || keyMapNative.heading2[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.heading2);
            return true;
        }
        case (keyMapNative.heading3[0] === this.currentSequence && (keyMapNative.heading3[1] === true || keyMapNative.heading3[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.heading3);
            return true;
        }
        case (keyMapNative.heading4[0] === this.currentSequence && (keyMapNative.heading4[1] === true || keyMapNative.heading4[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.heading4);
            return true;
        }
        case (keyMapNative.heading5[0] === this.currentSequence && (keyMapNative.heading5[1] === true || keyMapNative.heading5[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.heading5);
            return true;
        }
        case (keyMapNative.heading6[0] === this.currentSequence && (keyMapNative.heading6[1] === true || keyMapNative.heading6[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.heading6);
            return true;
        }
        case (keyMapNative.strikethrough[0] === this.currentSequence && (keyMapNative.strikethrough[1] === true || keyMapNative.strikethrough[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.strikethrough);
            return true;
        }
        case (keyMapNative.superscript[0] === this.currentSequence && (keyMapNative.superscript[1] === true || keyMapNative.superscript[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.superscript);
            return true;
        }
        case (keyMapNative.subscript[0] === this.currentSequence && (keyMapNative.subscript[1] === true || keyMapNative.subscript[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.subscript);
            return true;
        }
        case (keyMapNative.selectAll[0] === this.currentSequence && (keyMapNative.selectAll[1] === true || keyMapNative.selectAll[2] === modifierInput)):
        {
            if (this.mode !== "visual" && this.mode !== "visual_line") {
                this.switchToVisualMode();
            }
            docs.clickButton(docs.toolbarMenuButtonOptions.selectAll);
            return true;
        }
        case (keyMapNative.open[0] === this.currentSequence && (keyMapNative.open[1] === true || keyMapNative.open[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.open);
            return true;
        }
        case (keyMapNative.seeVersionHistory[0] === this.currentSequence && (keyMapNative.seeVersionHistory[1] === true || keyMapNative.seeVersionHistory[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.seeVersionHistory);
            return true;
        }
        case (keyMapNative.findAndReplace[0] === this.currentSequence && (keyMapNative.findAndReplace[1] === true || keyMapNative.findAndReplace[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.findAndReplace);
            return true;
        }
        case (keyMapNative.footNote[0] === this.currentSequence && (keyMapNative.footNote[1] === true || keyMapNative.footNote[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.footNote);
            return true;
        }
        case (keyMapNative.pageBreak[0] === this.currentSequence && (keyMapNative.pageBreak[1] === true || keyMapNative.pageBreak[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.pageBreak);
            return true;
        }
        case (keyMapNative.wordCount[0] === this.currentSequence && (keyMapNative.wordCount[1] === true || keyMapNative.wordCount[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.wordCount);
            return true;
        }
        case (keyMapNative.explore[0] === this.currentSequence && (keyMapNative.explore[1] === true || keyMapNative.explore[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.explore);
            return true;
        }
        case (keyMapNative.dictionary[0] === this.currentSequence && (keyMapNative.dictionary[1] === true || keyMapNative.dictionary[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.dictionary);
            return true;
        }
        case (keyMapNative.voiceTyping[0] === this.currentSequence && (keyMapNative.voiceTyping[1] === true || keyMapNative.voiceTyping[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.voiceTyping);
            return true;
        }
        case (keyMapNative.searchTheMenus[0] === this.currentSequence && (keyMapNative.searchTheMenus[1] === true || keyMapNative.searchTheMenus[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.searchTheMenus);
            return true;
        }
        case (keyMapNative.hideTheMenus[0] === this.currentSequence && (keyMapNative.hideTheMenus[1] === true || keyMapNative.hideTheMenus[2] === modifierInput)):
        {
            docs.clickButton(docs.toolbarMenuButtonOptions.hideTheMenus);
            return true;
        }
    }

    return false;
}


// Called in normal mode.
macVim.normal_keydown = function (e) {
    if (e.key.match(/F\d+/)) {
        // Let function keys (F1 to F12), go through normally
        return true;
    }

    if (this.isChromeShortcut(e)) {
        return true;
    }

    // Past this point we are controlling what happens
    e.preventDefault();
    e.stopPropagation();

    if (
        e.key === "Shift" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Meta"
    ) {
        // Shift by itself does nothing
        return true;
    }

    // Bit mask of what modifier keys are pressed
    const modifierInput = getModifierInput(e);
    const keyMapN = keyMap.keyMapN;

    switch (true) {
        case (keyMapN.F[0] === this.currentSequence):
        case (keyMapN.T[0] === this.currentSequence):
        {
            // Like f and t, except that we go backwards (this means we need to find the top of the line as the
            // boundary instead of the end of the line)

            let searchLineOption;
            if (keyMapN.F[0] === this.currentSequence) {
                searchLineOption = docs.searchLineOptions.F;
            }
            else {
                searchLineOption = docs.searchLineOptions.T;
            }

            // Find character on the current line (or do nothing if there is no character on the current line)
            let character = e.key;

            switch (true) {
                case (keyMapN.ctrlC[0] === e.key && (keyMapN.ctrlC[1] === true || keyMapN.ctrlC[2] === modifierInput)):
                case (keyMapN.escape[0] === e.key && (keyMapN.escape[1] === true || keyMapN.escape[2] === modifierInput)):
                case (character === "Escape"):
                {
                    // We want to clear data if the user is trying to escape
                    this.clearData();
                    return true;
                }
            }

            if (docs.passThroughKeys.has(character)) {
                // We do not clear data, because we actually want to repeat this command on the next keyboard event
                // For example, if the user has pressed "AudioVolumeUp", we still want them to be in the middle of
                // executing the replace command
                return true;
            }

            let [xCoord, yCoord] = docs.getCoords();
            this.moveToStartOfLine();
            let [lineStartXCoord, lineStartYCoord] = docs.getCoords();
            docs.moveToCoords(xCoord, yCoord);

            let coords = {
                xCoord: xCoord,
                yCoord: yCoord,
                lineStartXCoord: lineStartXCoord,
                lineStartYCoord: lineStartYCoord,
            }

            docs.inputIntoSearchBox(character, coords, searchLineOption);

            this.clearData();
            return true;
        }
        case (keyMapN.f[0] === this.currentSequence):
        case (keyMapN.t[0] === this.currentSequence):
        {
            let searchLineOption;
            if (keyMapN.f[0] === this.currentSequence) {
                searchLineOption = docs.searchLineOptions.f;
            }
            else {
                searchLineOption = docs.searchLineOptions.t;
            }

            // Find character on the current line (or do nothing if there is no character on the current line)
            let character = e.key;

            switch (true) {
                case (keyMapN.ctrlC[0] === e.key && (keyMapN.ctrlC[1] === true || keyMapN.ctrlC[2] === modifierInput)):
                case (keyMapN.escape[0] === e.key && (keyMapN.escape[1] === true || keyMapN.escape[2] === modifierInput)):
                case (character === "Escape"):
                {
                    // We want to clear data if the user is trying to escape
                    this.clearData();
                    return true;
                }
            }

            if (docs.passThroughKeys.has(character)) {
                // We do not clear data, because we actually want to repeat this command on the next keyboard event
                // For example, if the user has pressed "AudioVolumeUp", we still want them to be in the middle of
                // executing the replace command
                return true;
            }

            let [xCoord, yCoord] = docs.getCoords();
            this.moveToEndOfLine();
            let [lineEndXCoord, lineEndYCoord] = docs.getCoords();
            docs.moveToCoords(xCoord, yCoord);

            let coords = {
                xCoord: xCoord,
                yCoord: yCoord,
                lineEndXCoord: lineEndXCoord,
                lineEndYCoord: lineEndYCoord
            }


            docs.inputIntoSearchBox(character, coords, searchLineOption);

            this.clearData();
            return true;
        }
        case (keyMapN.replaceCharacter[0] === this.currentSequence):
        {
            let keyCharacter = e.key;

            let keyFunc = docs.pressKey
            let keyFuncInput = e.key.charCodeAt(0);

            if (docs.passThroughKeys.has(keyCharacter)) {
                this.clearData();
                return true;
            }

            switch (true) {
                case (keyMapN.ctrlC[0] === e.key && (keyMapN.ctrlC[1] === true || keyMapN.ctrlC[2] === modifierInput)):
                case (keyMapN.escape[0] === e.key && (keyMapN.escape[1] === true || keyMapN.escape[2] === modifierInput)):
                case (keyCharacter === "Escape"):
                {
                    // We want to clear data if the user is trying to escape
                    this.clearData();
                    return true;
                }
            }

            if ("-,. '!#$%&*()+\“-".indexOf(keyCharacter) > -1 || keyCharacter === "Tab" || keyCharacter === "\"") {
                // Instead of using the regular press Key, we need to handle edge cases of special keys
                keyFunc = docs.pressSpecialKey;
                keyFuncInput = keyCharacter; // We will pass in the actual char/string instead of the numeric code
            }

            if (keyCharacter === "Enter") {
                keyFuncInput = docs.codeFromKey("Enter");
            }

            const numRepeats = parseInt(macVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                // if we're at the end of a line, r should go on the current line
                // if we're at the end of a multiline (fake) line, r can move to next multiline
                let [xCoord, yCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowLeft")); // We do this to check if we're at the start of a line
                let [leftXCoord, leftYCoord] = docs.getCoords();

                // IF: We are not at the start of the file, undo our arrow left with an arrow right
                if (xCoord !== leftXCoord || yCoord !== leftYCoord) {
                    // We are not at the beginning of the file, so undo our arrow right
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }
                // IF: We are at the start of a line OR at the start of a file, we can just replace the character without worrying
                // about line ending stuff
                if (
                    leftYCoord !== yCoord ||
                    (leftYCoord === yCoord && leftXCoord === xCoord)
                ) {
                    // At the beginning of a line or multiline, no need for checking if we're at the end
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    let [rightXCoord, rightYCoord] = docs.getCoords();
                    // let rightYCoord = docs.getYCoord();
                    if (rightYCoord !== yCoord) {
                        // Empty line
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        keyFunc(keyFuncInput);
                    } else if (rightXCoord === xCoord && rightYCoord === yCoord) {
                        // We are at the end of the file on an empty line
                        keyFunc(keyFuncInput);
                    } else {
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        keyFunc(keyFuncInput);
                    }
                }
                // We are not at the start of a file or line, so we have to check if we're at the end of a line,
                // middle of a line, or end of a file
                else {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    let [newXCoord, newYCoord] = docs.getCoords();
                    if (xCoord === newXCoord && yCoord === newYCoord) {
                        // We are at the end of the file, guaranteed to not be an empty line from above
                        // Don't backspace
                        keyFunc(keyFuncInput);
                    } else if (yCoord === newYCoord) {
                        // We are in the middle of the line somewhere or something, standard procedure
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        keyFunc(keyFuncInput);
                    } else {
                        // We've either passed a space or a return that has put us one multiline or line down
                        docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                        let [finalXCoord, finalYCoord] = docs.getCoords();
                        if (finalXCoord === xCoord && finalYCoord === yCoord) {
                            // We are dealing with a "Return" and actual new line
                            // Don't hit backspace since we're at the end of the line
                            keyFunc(keyFuncInput);
                        } else {
                            // We are dealing with a space and just a multiline
                            docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                            docs.pressKey(docs.codeFromKey("Backspace"));
                            keyFunc(keyFuncInput);
                        }
                    }
                }
            }

            macVim.clearData();
            return true;
        }

    }


    // Past this point we add the key to the sequence, and then go checking if it matches any of the commands
    // If it doesn't, after the switch statement we see if we are building up to a command or not
    if (this.currentSequence.length === 0) {
        this.currentSequence = e.key;
    }
    else {
        this.currentSequence += KEY_SEPARATOR + e.key;
    }

    if (this.nativeKeyCheck(modifierInput)) {
        this.clearData();
        return true;
    }

	switch (true) {
        case (keyMapN.escape[0] === this.currentSequence && (keyMapN.escape[1] === true || keyMapN.escape[2] === modifierInput)):
        case (keyMapN.escape[0] === e.key && (keyMapN.escape[1] === true || keyMapN.escape[2] === modifierInput)):
        case (keyMapN.ctrlC[0] === this.currentSequence && (keyMapN.ctrlC[1] === true || keyMapN.ctrlC[2] === modifierInput)):
        case (keyMapN.ctrlC[0] === e.key && (keyMapN.ctrlC[1] === true || keyMapN.ctrlC[2] === modifierInput)):
        {
            // Remove any saved queries that the user had
            macVim.clearData();
            return true;
        }
        case (keyMapN.zz[0] === this.currentSequence && (keyMapN.zz[1] === true || keyMapN.zz[2] === modifierInput)):
        {
            docs.scrollSoCursorIsCenter();
            this.clearData();
            return true;
        }
        case (keyMapN.zt[0] === this.currentSequence && (keyMapN.zt[1] === true || keyMapN.zt[2] === modifierInput)):
        {
            docs.scrollSoCursorIsTop();
            this.clearData();
            return true;
        }
        case (keyMapN.zb[0] === this.currentSequence && (keyMapN.zb[1] === true || keyMapN.zb[2] === modifierInput)):
        {
            docs.scrollSoCursorIsBottom();
            this.clearData();
            return true;
        }
        case (keyMapN.joinLine[0] === this.currentSequence && (keyMapN.joinLine[1] === true || keyMapN.joinLine[2] === modifierInput)):
        {
            this.moveToEndOfLine();
            docs.pressSpecialKey(" ");
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [endXCoord, endYCoord] = docs.getCoords();

            if (startXCoord === endXCoord && startYCoord === endYCoord) {
                // We are at the end of the file, reverse what we did and do nothing
                docs.pressKey(docs.codeFromKey("Backspace"));
                this.clearData();
                return true;
            }

            // We are at the start of the line that we want to join to above
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [finalXCoord, finalYCoord] = docs.getCoords();
            if (endXCoord === finalXCoord && endYCoord === finalYCoord) {
                // We are trying to join an empty line that is the end of the file
                docs.pressKey(docs.codeFromKey("Backspace")); // Delete the empty line
                docs.pressKey(docs.codeFromKey("Backspace")); // Delete the space we added
            }
            else if (endYCoord !== finalYCoord) {
                // On an empty line
                docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to the empty line
                docs.pressKey(docs.codeFromKey("Backspace")); // Delete the empty line
                docs.pressKey(docs.codeFromKey("Backspace")); // Delete the space we added
            }
            else {
                // Base case
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("Backspace"));
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
            }

            this.clearData();
            return true;
        }
        case (keyMapN["0"][0] === this.currentSequence && (keyMapN["0"][1] === true || keyMapN["0"][2] === modifierInput)):
            {
                let regexNumMatch = /\d/;
                if (regexNumMatch.test(this.currentSequence) && this.num !== "") {
                    // If we are typing a number, we don't want to execute this command actually, but instead just keep typing our number
                    break;
                }

                this.moveToStartOfLine();
                this.clearData();
                return true;
            }
        case (keyMapN.backspace[0] === this.currentSequence && (keyMapN.backspace[1] === true || keyMapN.backspace[2] === modifierInput)):
        case (keyMapN.arrowLeft[0] === this.currentSequence && (keyMapN.arrowLeft[1] === true || keyMapN.arrowLeft[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.arrowRight[0] === this.currentSequence && (keyMapN.arrowRight[1] === true || keyMapN.arrowRight[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.arrowUp[0] === this.currentSequence && (keyMapN.arrowUp[1] === true || keyMapN.arrowUp[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.arrowDown[0] === this.currentSequence && (keyMapN.arrowDown[1] === true || keyMapN.arrowDown[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.b[0] === this.currentSequence && (keyMapN.b[1] === true || keyMapN.b[2] === modifierInput)):
        case (keyMapN.B[0] === this.currentSequence && (keyMapN.B[1] === true || keyMapN.B[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                }
                this.clearData();
                return true;
            }
        case (keyMapN.h[0] === this.currentSequence && (keyMapN.h[1] === true || keyMapN.h[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.j[0] === this.currentSequence && (keyMapN.j[1] === true || keyMapN.j[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.k[0] === this.currentSequence && (keyMapN.k[1] === true || keyMapN.k[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.l[0] === this.currentSequence && (keyMapN.l[1] === true || keyMapN.l[2] === modifierInput)):
        case (keyMapN.space[0] === this.currentSequence && (keyMapN.space[1] === true || keyMapN.space[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }
                this.clearData();
                return true;
            }
        case (keyMapN.gg[0] === this.currentSequence && (keyMapN.gg[1] === true || keyMapN.gg[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("Home"), true);
                this.clearData();
                return true;
            }
        case (keyMapN.G[0] === this.currentSequence && (keyMapN.G[1] === true || keyMapN.G[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("End"), true);
                this.clearData();
                return true;
            }
        case (keyMapN["{"][0] === this.currentSequence && (keyMapN["{"][1] === true || keyMapN["{"][2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowUp"), true);
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                let [endXCoord, endYCoord] = docs.getCoords();
                while ((initialYCoord === endYCoord) && (initialXCoord !== endXCoord)) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true);
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    [initialXCoord, initialYCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    [endXCoord, endYCoord] = docs.getCoords();
                }

                if (initialXCoord === endXCoord && initialYCoord === endYCoord) {
                    // At end of file, do nothing
                }
                else {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }

                this.clearData();
                return true;
            }
        case (keyMapN["}"][0] === this.currentSequence && (keyMapN["}"][1] === true || keyMapN["}"][2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [endXCoord, endYCoord] = docs.getCoords();
                while ((initialYCoord === endYCoord) && (initialXCoord !== endXCoord)) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    [initialXCoord, initialYCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    [endXCoord, endYCoord] = docs.getCoords();
                }

                if (initialXCoord === endXCoord && initialYCoord === endYCoord) {
                    // At end of file, do nothing
                }
                else {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }

                this.clearData();
                return true;
            }
        case (keyMapN.arrowLeftCtrl[0] === this.currentSequence && (keyMapN.arrowLeftCtrl[1] === true || keyMapN.arrowLeftCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapN.arrowRightCtrl[0] === this.currentSequence && (keyMapN.arrowRightCtrl[1] === true || keyMapN.arrowRightCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapN.arrowDownCtrl[0] === this.currentSequence && (keyMapN.arrowDownCtrl[1] === true || keyMapN.arrowDownCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapN.arrowUpCtrl[0] === this.currentSequence && (keyMapN.arrowUpCtrl[1] === true || keyMapN.arrowUpCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapN.slashSearch[0] === this.currentSequence && (keyMapN.slashSearch[1] === true || keyMapN.slashSearch[2] === modifierInput)):
            {
                // Search
                docs.pressKey(docs.codeFromKey("f"), true);
                macVim.clearData();
                return true;
            }
        case (keyMapN.ctrlDPageDown[0] === this.currentSequence && (keyMapN.ctrlDPageDown[1] === true || keyMapN.ctrlDPageDown[2] === modifierInput)):
            {
                // Page down
                docs.pressKey(docs.codeFromKey("PageDown"));
                macVim.clearData();
                return true;
            }
        case (keyMapN.ctrlUPageUp[0] === this.currentSequence && (keyMapN.ctrlUPageUp[1] === true || keyMapN.ctrlUPageUp[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("PageUp"));
                macVim.clearData();
                return true;
            }
        case (keyMapN.redo[0] === this.currentSequence && (keyMapN.redo[1] === true || keyMapN.redo[2] === modifierInput)):
            {
                // Redo
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("Y"), true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapN.paste[0] === this.currentSequence && (keyMapN.paste[1] === true || keyMapN.paste[2] === modifierInput)):
            {
                docs.paste(this.moveToEndOfLine, this.moveRightToPasteAfterCursor);
                this.clearData();
                return true;
            }
        case (keyMapN.pasteNoFormatting[0] === this.currentSequence && (keyMapN.pasteNoFormatting[1] === true || keyMapN.pasteNoFormatting[2] === modifierInput)):
            {
                docs.pasteNoFormatting(this.moveToEndOfLine, this.moveRightToPasteAfterCursor);
                this.clearData();
                return true;
            }
        case (keyMapN.pasteBeforeCursor[0] === this.currentSequence && (keyMapN.pasteBeforeCursor[1] === true || keyMapN.pasteBeforeCursor[2] === modifierInput)):
            {
                docs.pasteBeforeCursor(this.moveToStartOfLine);
                this.clearData();
                return true;
            }
        case (keyMapN.pasteBeforeCursorNoFormatting[0] === this.currentSequence && (keyMapN.pasteBeforeCursorNoFormatting[1] === true || keyMapN.pasteBeforeCursorNoFormatting[2] === modifierInput)):
            {
                docs.pasteBeforeCursorNoFormatting(this.moveToStartOfLine);
                this.clearData();
                return true;
            }
        case (keyMapN.insert[0] === this.currentSequence && (keyMapN.insert[1] === true || keyMapN.insert[2] === modifierInput)):
            {
                macVim.clearData();
                macVim.switchToInsertMode();
                return true;
            }
        case (keyMapN.enterVisual[0] === this.currentSequence && (keyMapN.enterVisual[1] === true || keyMapN.enterVisual[2] === modifierInput)):
            {
                macVim.clearData();
                macVim.switchToVisualMode();
                return true;
            }
        case (keyMapN.enterVisualLine[0] === this.currentSequence && (keyMapN.enterVisualLine[1] === true || keyMapN.enterVisualLine[2] === modifierInput)):
            {
                macVim.clearData();
                macVim.switchToVisualLineMode();
                return true;
            }
        case (keyMapN.append[0] === this.currentSequence && (keyMapN.append[1] === true || keyMapN.append[2] === modifierInput)): 
            {
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
                    // We are at the end of the file already, do nothing
                } else if (startYCoord === middleYCoord) {
                    // We are the in the middle of a line somewhere, do nothing
                } else {
                    // We are on the end of a multiline or line
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [finalXCoord, finalYCoord] = docs.getCoords();
                    if (finalXCoord === startXCoord && finalYCoord === startYCoord) {
                        // We were at the end of a line and are back there, do nothing else
                    } else {
                        // We were at the end of a multiline
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                    }
                }

                macVim.clearData();
                macVim.switchToInsertMode();
                return true;
            }
        case (keyMapN.appendEndOfLine[0] === this.currentSequence && (keyMapN.appendEndOfLine[1] === true || keyMapN.appendEndOfLine[2] === modifierInput)): 
        {
            macVim.moveToEndOfLine();
            macVim.clearData();
            macVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.newLineAbove[0] === this.currentSequence && (keyMapN.newLineAbove[1] === true || keyMapN.newLineAbove[2] === modifierInput)): 
        {
            const numRepeats = parseInt(macVim.num) || 1;
            macVim.moveToStartOfLine();

            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("Enter"));
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
            }

            macVim.clearData();
            macVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.newLineBelow[0] === this.currentSequence && (keyMapN.newLineBelow[1] === true || keyMapN.newLineBelow[2] === modifierInput)): 
        {
            // Get to the bottom of the current line, then press enter
            const numRepeats = parseInt(macVim.num) || 1;
            macVim.moveToEndOfLine();

            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("Enter"));
            }

            macVim.clearData();
            macVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.insertStartOfLine[0] === this.currentSequence && (keyMapN.insertStartOfLine[1] === true || keyMapN.insertStartOfLine[2] === modifierInput)): 
        {
            macVim.moveToStartOfLine();

            macVim.clearData();
            macVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.e[0] === this.currentSequence && (keyMapN.e[1] === true || keyMapN.e[2] === modifierInput)): 
        case (keyMapN.E[0] === this.currentSequence && (keyMapN.E[1] === true || keyMapN.E[2] === modifierInput)): 
        {
            const numRepeats = parseInt(macVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                let [endXCoord, endYCoord] = docs.getCoords();
                if (startXCoord === endXCoord && startYCoord === endYCoord) {
                    // End of file reached, do nothing
                }
                else {
                    // Keep going like regular
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
            }
            macVim.clearData();
            return true;
        }
        case (keyMapN.endOfLine[0] === this.currentSequence && (keyMapN.endOfLine[1] === true || keyMapN.endOfLine[2] === modifierInput)): 
        {
            macVim.moveToEndOfLine();
            macVim.clearData();
            return true;
        }
        case (keyMapN.w[0] === this.currentSequence && (keyMapN.w[1] === true || keyMapN.w[2] === modifierInput)): 
        case (keyMapN.W[0] === this.currentSequence && (keyMapN.W[1] === true || keyMapN.W[2] === modifierInput)): 
        {
            const numRepeats = parseInt(macVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                docs.pressKey(docs.codeFromKey("ArrowRight"));
            }
            macVim.clearData();
            return true;
        }
        case (keyMapN.x[0] === this.currentSequence && (keyMapN.x[1] === true || keyMapN.x[2] === modifierInput)): 
        case (keyMapN.s[0] === this.currentSequence && (keyMapN.s[1] === true || keyMapN.s[2] === modifierInput)): 
        {
            let shouldWeCut = keyMapN.x[4];
            if (keyMapN.s[0] === this.currentSequence && (keyMapN.s[1] === true || keyMapN.s[2] === modifierInput)) {
                shouldWeCut = keyMapN.s[4];
            }
            // Delete the current character (enter insert mode for "s")
            // "x" and "s" commands
            let numRepeats = parseInt(this.num) || 1;

            if (e.repeat === false && numRepeats === 1 && docs.isTextSelected()) {
                // If the user presses "Undo", we still have text highlighted in normal mode to delete
                this.deleteOrCut(keyMapN.x[4]);
                numRepeats = 0; // Skip the logic and go straight to the bottom
            }

            // We can only delete stuff on the current line
            // We will move right as much as possible, and then move left if we still need to delete more
            let [startXCoord, startYCoord] = docs.getCoords();

            let counter = numRepeats;
            let rightCounter = 0; // How many characters to move to the right

            while (counter > 0) {
                let [curXCoord, curYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [newXCoord, newYCoord] = docs.getCoords();
                if (curXCoord === newXCoord && curYCoord === newYCoord) {
                    // At the end of the file, do nothing
                    break; // Don't change counters or anything since we didn't actually move
                }
                else if (newYCoord !== curYCoord) {
                    // We are on a new line (potentially), so we need to test and take appropriate action
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [finalXCoord, finalYCoord] = docs.getCoords();
                    if (finalXCoord === curXCoord && finalYCoord === curYCoord) {
                        // We are on a new line, so we're done now and moving to the next stage
                        break;
                    }
                    else {
                        // We are on a multiline, keep going
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        counter--;
                        rightCounter++;
                    }
                }
                else {
                    // Middle of a line, all is well
                    counter--;
                    rightCounter++;
                }
            }

            if (rightCounter > 0) {
                // Characters to delete that we can,
                // We will highlight going to the left
                while (rightCounter > 0) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                    rightCounter--;
                }
                // Only delete based whether or not text is selected
                if (docs.isTextSelected() && numRepeats > 1) {
                    this.deleteOrCutAndUndo(shouldWeCut);
                    // Undo our delete, and then we are going to press "Space" and delete the space (this is to prevent docs from deleting spaces after the word)
                    docs.pressKey(docs.codeFromKey(docs.placeHolderKey)); // Placeholder
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }
                else if (docs.isTextSelected() && numRepeats === 1) {
                    if (shouldWeCut) {
                        docs.contentDocument.execCommand("copy");
                    }
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    docs.pressKey(docs.codeFromKey("Delete"));
                }
            }
            else if (rightCounter === 0) {
                // We're at the end of the line and need to cut/delete 1 character left (unless we're on an empty line)
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                let [newXCoord, newYCoord] = docs.getCoords();
                if (startXCoord === newXCoord && startYCoord === newYCoord) {
                    // We're on an empty line
                    // We don't copy emptiness to the clipboard (if we're cutting)
                }
                else if (newYCoord !== startYCoord) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [finalXCoord, finalYCoord] = docs.getCoords();
                    if (finalXCoord === newXCoord && finalYCoord === newYCoord) {
                        // We're on a new line, so go back and do nothing
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        // We don't copy emptiness to the clipboard (if we're cutting)
                    }
                    else {
                        // Multiline
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        if (shouldWeCut) {
                            docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                            docs.contentDocument.execCommand("copy")
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                        else {
                            docs.pressKey(docs.codeFromKey("Backspace"))
                        }
                    }
                }
                else {
                    if (shouldWeCut) {
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.contentDocument.execCommand("copy");
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        docs.pressKey(docs.codeFromKey("Delete"));
                    }
                    else {
                        docs.pressKey(docs.codeFromKey("Delete"));
                    }
                }

            }


            if (keyMapN.x[0] === this.currentSequence && (keyMapN.x[1] === true || keyMapN.x[2] === modifierInput)) {
                macVim.clearData();
            }
            else {
                macVim.currentSequence = "";
                macVim.num = "";
                macVim.switchToInsertMode();
            }
            return true;
        }
        case (keyMapN.deleteToEndOfLine[0] === this.currentSequence && (keyMapN.deleteToEndOfLine[1] === true || keyMapN.deleteToEndOfLine[2] === modifierInput)): 
        case (keyMapN.deleteToEndOfLine2[0] === this.currentSequence && (keyMapN.deleteToEndOfLine2[1] === true || keyMapN.deleteToEndOfLine2[2] === modifierInput)): 
        case (keyMapN.deleteToEndOfLineInsert[0] === this.currentSequence && (keyMapN.deleteToEndOfLineInsert[1] === true || keyMapN.deleteToEndOfLineInsert[2] === modifierInput)): 
        case (keyMapN.deleteToEndOfLine2Insert[0] === this.currentSequence && (keyMapN.deleteToEndOfLine2Insert[1] === true || keyMapN.deleteToEndOfLine2Insert[2] === modifierInput)): 
        {
            // Get the value for shouldWeCut
            let shouldWeCut;
            switch (true) {
                case (keyMapN.deleteToEndOfLine[0] === this.currentSequence && (keyMapN.deleteToEndOfLine[1] === true || keyMapN.deleteToEndOfLine[2] === modifierInput)):
                { shouldWeCut = keyMapN.deleteToEndOfLine[4]; break; }
                case (keyMapN.deleteToEndOfLine2[0] === this.currentSequence && (keyMapN.deleteToEndOfLine2[1] === true || keyMapN.deleteToEndOfLine2[2] === modifierInput)):
                { shouldWeCut = keyMapN.deleteToEndOfLine2[4]; break; }
                case (keyMapN.deleteToEndOfLineInsert[0] === this.currentSequence && (keyMapN.deleteToEndOfLineInsert[1] === true || keyMapN.deleteToEndOfLineInsert[2] === modifierInput)):
                { shouldWeCut = keyMapN.deleteToEndOfLineInsert[4]; break; }
                case (keyMapN.deleteToEndOfLine2Insert[0] === this.currentSequence && (keyMapN.deleteToEndOfLine2Insert[1] === true || keyMapN.deleteToEndOfLine2Insert[2] === modifierInput)):
                { shouldWeCut = keyMapN.deleteToEndOfLine2Insert[4]; break; }
            }

	        // D, d$, C, c$
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [middleXCoord, middleYCoord] = docs.getCoords();
            if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
                // We are at the end of the file already, do nothing
            } else if (startYCoord === middleYCoord) {
                // We're in the middle of a line
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                this.deleteOrCut(shouldWeCut);
            } else {
                // We are on the end of a multiline or line
                docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                let [endXCoord, endYCoord] = docs.getCoords();
                if (endXCoord === startXCoord && endYCoord === startYCoord) {
                    // We are at the end of a line, do nothing
                } else {
                    // We are on a multiline

                    // Get back to original position
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);

                    // Highlight
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                    this.deleteOrCut(shouldWeCut);
                }
            }

            // Insert case
            if (
            (keyMapN.deleteToEndOfLineInsert[0] === this.currentSequence && (keyMapN.deleteToEndOfLineInsert[1] === true || keyMapN.deleteToEndOfLineInsert[2] === modifierInput)) || 
            (keyMapN.deleteToEndOfLine2Insert[0] === this.currentSequence && (keyMapN.deleteToEndOfLine2Insert[1] === true || keyMapN.deleteToEndOfLine2Insert[2] === modifierInput)) 
                )
                {
                    macVim.num = "";
                    macVim.currentSequence = "";
                    macVim.switchToInsertMode();
                    return true;
                }

            // Base case
            macVim.clearData();
            return true;
        }
        case (keyMapN.deleteToStartOfLine[0] === this.currentSequence && (keyMapN.deleteToStartOfLine[1] === true || keyMapN.deleteToStartOfLine[2] === modifierInput)): 
        case (keyMapN.deleteToStartOfLineInsert[0] === this.currentSequence && (keyMapN.deleteToStartOfLineInsert[1] === true || keyMapN.deleteToStartOfLineInsert[2] === modifierInput)): 
        {
	    // d0, c0
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
			// At start of file, do nothing
		}
		else if (startYCoord === middleYCoord) {
			// In the middle of a line
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.pressKey(docs.codeFromKey("Backspace"));
		}
		else {
			// At the start of a line or multiline, figure out which one and then act accordingly
			let [tempXCoord, tempYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [finalXCoord, finalYCoord] = docs.getCoords();
			if (tempYCoord === finalYCoord && tempXCoord === finalXCoord) {
				// The line above us was the start of the file on an empty line, so just go back (we only do
				// one because the last ArrowLeft didn't do anything)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
			else if (tempYCoord !== finalYCoord) {
				// The line above us is empty, so just get back (we were at the start of a line)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
			}
			else {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [finalXCoord, finalYCoord] = docs.getCoords();
				if (finalXCoord === middleXCoord && finalYCoord === middleYCoord) {
					// We were at the start of an enter, just go back
					docs.pressKey(docs.codeFromKey("ArrowRight"));
				}
				else {
					// We were at the start of a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}
		}

            if (
            keyMapN.deleteToStartOfLineInsert[0] === this.currentSequence && (keyMapN.deleteToStartOfLineInsert[1] === true || keyMapN.deleteToStartOfLineInsert[2] === modifierInput)
            )
            {
                macVim.num = "";
                macVim.currentSequence = "";
                macVim.switchToInsertMode();
            }
            else {
                macVim.clearData();
            }

            return true;
        }
        case (keyMapN.dw[0] === this.currentSequence && (keyMapN.dw[1] === true || keyMapN.dw[2] === modifierInput)): 
        case (keyMapN.dW[0] === this.currentSequence && (keyMapN.dW[1] === true || keyMapN.dW[2] === modifierInput)): 
        {
            // "dw", "dW"
            // 2 potential choices/scenarios:

            // 1:
            // Determine if we are at the end of a line
            // If we are at the end of a line, delete one character (or none if we are on an empty line)

            // 2: 
            // If we are not at the end of a line, proceed normally (highlight to the right, then hit delete)
            // After: If we are not at the end of a line, arrow left back one to be on the right character

            let numRepeats = parseInt(macVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
                    // We are at the end of the file (and line subsequently)
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }
                else if (initialYCoord !== middleYCoord) {
                    // Determine if we are at the end of a line or a multiline
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
                        // We are at the end of a real line

                        // Just delete the last character then
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        let [afterBackspaceXCoord, afterBackspaceYCoord] = docs.getCoords();
                        if (afterBackspaceXCoord === initialXCoord && afterBackspaceYCoord === initialYCoord) {
                            // We just hit backspace, but we didn't move anywhere --> We are at the start of the file on an empty line
                            // Let's actually delete that empty line then by moving forward and deleting
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                        else if (afterBackspaceYCoord !== initialYCoord) {
                            // We deleted an empty line --> Move the cursor down to the right position
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                        }
                    }
                    else {
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true); // Get back to original position
                        // We are at the end of a multiline

                        // Delete (just the space)
                        docs.pressKey(docs.codeFromKey("Delete"));
                    }
                }
                else {
                    // On a multiline
                    docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                    let textNotSelected = !docs.isTextSelected()
                    if (textNotSelected) {
                        // Proceed normally, no chance it's a space
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                    else {
                        // Text is highlighted
                        // Need to check again
                        docs.pressKey(docs.codeFromKey("ArrowRight")); // Text is not highlighted after this
                        let [xPos, yPos] = docs.getCoords();
                        if (xPos === middleXCoord && yPos === middleYCoord) {
                            // If we moved only one place to the right --> On a space
                            // We are on a space
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                        else {
                            // Normal procedure
                            docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                    }
                }
            }

            macVim.clearData();
            return true;
        }
        case (keyMapN.cw[0] === this.currentSequence && (keyMapN.cw[1] === true || keyMapN.cw[2] === modifierInput)): 
        case (keyMapN.cW[0] === this.currentSequence && (keyMapN.cW[1] === true || keyMapN.cW[2] === modifierInput)): 
        {
	        // "cw", "cW"
            // 2 potential choices/scenarios:

            // 1:
            // Determine if we are at the end of a line
            // If we are at the end of a line, delete one character (or none if we are on an empty line)

            // 2:
            // If we are not at the end of a line, proceed normally (highlight to the right, then hit delete)
            // After: If we are not at the end of a line, arrow left back one to be on the right character

            let numRepeats = parseInt(macVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
                    // We are at the end of the file (and line subsequently)
                    // Now we check if we're on an empty line (if we are, we don't backspace anything)

                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [endXCoord, endYCoord] = docs.getCoords();

                    if (endYCoord !== initialYCoord) {
                        // We were on an empty line at the end, just go back and be done (do nothing)
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                    }
                    else {
                        // There is stuff on the line, so we have to go back and delete it actually
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                }
                else if (initialYCoord !== middleYCoord) {
                    // Determine if we are at the end of a line or a multiline
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
                        // We are at the end of a real line

                        // Just delete the last character then

                        // Now we check if the line is empty
                        // If it is: Do nothing
                        // If there is something: Delete it
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        let [finalXCoord, finalYCoord] = docs.getCoords();
                        if (finalYCoord !== initialYCoord) {
                            // Was an empty line, go back and do nothing
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                        }
                        else if (finalYCoord === initialYCoord && finalXCoord === initialXCoord) {
                            // At the start of the file on an empty line, do nothing
                        }
                        else {
                            // Line had something on it, delete it
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                    }
                    else {
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true); // Get back to original position
                        // We are at the end of a multiline, so just delete the space
                        docs.pressKey(docs.codeFromKey("Delete"))

                    }
                }
                else {
                    // On a multiline, highlight and delete
                    docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                    let textNotSelected = !docs.isTextSelected();
                    if (textNotSelected) {
                        // Proceed normally, no chance it's a space
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                    else {
                        // Text is highlighted
                        // Need to check again
                        docs.pressKey(docs.codeFromKey("ArrowRight")); // Text is not highlighted after this
                        let [xPos, yPos] = docs.getCoords();
                        if (xPos === middleXCoord && yPos === middleYCoord) {
                            // If we moved only one place to the right --> On a space
                            // We are on a space
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                        else {
                            // Normal procedure
                            docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                    }
                }
            }

            macVim.currentSequence = "";
            macVim.num = "";
            macVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.deleteLine[0] === this.currentSequence && (keyMapN.deleteLine[1] === true || keyMapN.deleteLine[2] === modifierInput)): 
        {
            let shouldWeCut = keyMapN.deleteLine[4];
            this.moveToEndOfLine();
            const numRepeats = parseInt(this.num) || 1;
            let counter = numRepeats - 1;
            let downCounter = 1;

            while (counter > 0) {
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                let [endXCoord, endYCoord] = docs.getCoords();
                if (startXCoord === endXCoord && startYCoord === endYCoord) {
                    // We are at the end of the file on an empty line, so we can't go down anymore
                    break;
                }
                else {
                    counter--;
                    downCounter++;
                }
            }

            let endOfFile = false;
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [endXCoord, endYCoord] = docs.getCoords();
            if (startXCoord === endXCoord && startYCoord === endYCoord) {
                // Didn't move, enter
                docs.pressKey(docs.codeFromKey("Enter"));
                endOfFile = true;
            }


            while (downCounter > 0) {
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                downCounter--;
            }
            this.deleteOrCut(shouldWeCut);

            if (shouldWeCut) {
                // Since we are doing commands immediately after a execCommand("cut") operation, we need the timeout
                if (endOfFile) {
                    // Position ourselves properly
                    setTimeout(() => {
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        this.moveToStartOfLine();
                    }, 1);
                }
                else {
                    // We still have the style of the deleted line on our cursor, so we just move quick right/left to
                    // get rid of it and have the style of the line we're on
                    setTimeout(() => {
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    }, 1);
                }
            }
            else {
                if (endOfFile) {
                    docs.pressKey(docs.codeFromKey("Backspace"));
                    this.moveToStartOfLine();
                }
                else {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
            }

            macVim.clearData();
            return true;
        }
        case (keyMapN.deleteLineInsert[0] === this.currentSequence && (keyMapN.deleteLineInsert[1] === true || keyMapN.deleteLineInsert[2] === modifierInput)): 
        case (keyMapN.deleteLine2Insert[0] === this.currentSequence && (keyMapN.deleteLine2Insert[1] === true || keyMapN.deleteLine2Insert[2] === modifierInput)): 
        {
            // cc
            let shouldWeCut = keyMapN.deleteLineInsert[4];
            if (keyMapN.deleteLine2Insert[0] === this.currentSequence && (keyMapN.deleteLine2Insert[1] === true || keyMapN.deleteLine2Insert[2] === modifierInput)) {
                shouldWeCut = keyMapN.deleteLine2Insert[4];
            }

            this.moveToEndOfLine();
            const numRepeats = parseInt(this.num) || 1;
            let counter = numRepeats - 1;
            let downCounter = 1;

            while (counter > 0) {
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                let [endXCoord, endYCoord] = docs.getCoords();
                if (startXCoord === endXCoord && startYCoord === endYCoord) {
                    // We are at the end of the file on an empty line, so we can't go down anymore
                    break;
                }
                else {
                    counter--;
                    downCounter++;
                }
            }

            // Now let's test if we're on an empty line or not before we highlight back up
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
            let [endXCoord, endYCoord] = docs.getCoords();
            if (startXCoord === endXCoord && startYCoord === endYCoord) {
                // At start of file on an empty line
                if (shouldWeCut) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                    docs.contentDocument.execCommand("copy");
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
                macVim.currentSequence = "";
                macVim.num = "";
                macVim.switchToInsertMode();
                return true;

            }
            else if (endYCoord !== startYCoord) {
                // We were on an empty line somewhere
                // highlight 1 less line on the way up
                if (downCounter === 1) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    if (shouldWeCut) {
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                        docs.contentDocument.execCommand("copy");
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    }
                    macVim.currentSequence = "";
                    macVim.num = "";
                    macVim.switchToInsertMode();
                    return true;
                }
                else {
                    downCounter--;
                    docs.pressKey(docs.codeFromKey("ArrowRight"))
                }
            }
            else {
                // Base case, reverse our ArrowLeft
                docs.pressKey(docs.codeFromKey("ArrowRight"))
            }

            while (downCounter > 0) {
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                downCounter--;
            }
            this.deleteOrCut(shouldWeCut);

            macVim.currentSequence = "";
            macVim.num = "";
            macVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.deleteInnerWord[0] === this.currentSequence && (keyMapN.deleteInnerWord[1] === true || keyMapN.deleteInnerWord[2] === modifierInput)): 
        case (keyMapN.deleteInnerWordInsert[0] === this.currentSequence && (keyMapN.deleteInnerWordInsert[1] === true || keyMapN.deleteInnerWordInsert[2] === modifierInput)): 
        {
	        // diw, ciw (don't delete spaces + other differences)
            let numRepeats = parseInt(macVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                let atEndOfLine = false;
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
                    // End of file
                    atEndOfLine = true;
                }
                else if (initialYCoord === middleYCoord) {
                    // Middle of line
                    docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

                    // Get into position
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true)
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === middleXCoord && endYCoord === middleYCoord) {
                        // This means we were on a space --> delete
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                    else {
                        // We were on a character --> delete
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                        docs.pressSpecialKey(" ");
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                }
                else {
                    // We are at the end of a line or multiline, we need to check which one
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
                        // At the end of a line
                        atEndOfLine = true;
                    }
                    else {
                        // At the end of a multiline
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("Delete"));
                    }
                }

                if (atEndOfLine) {
                    let [startXCoord, startYCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endYCoord !== startYCoord) {
                        // Empty line, do nothing (just go back)
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                    }
                    else if (endYCoord === startYCoord && endXCoord === startXCoord) {
                        // At start of file on an empty line, do nothing
                    }
                    else {
                        // The line has stuff on it (regular case)
                        docs.pressKey(docs.codeFromKey("ArrowRight")); // Get back to where we were

                        // Delete stuff at the end of the line
                        docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                        let textNotSelected = !docs.isTextSelected();
                        if (textNotSelected) {
                            // No trailing spaces to worry about or anything
                            docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                        else {
                            // Trailing spaces are currently highlighted, which we will destroy
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                    }
                    
                }
            }

            if (
keyMapN.deleteInnerWordInsert[0] === this.currentSequence && (keyMapN.deleteInnerWordInsert[1] === true || keyMapN.deleteInnerWordInsert[2] === modifierInput)
            )
            {
                macVim.currentSequence = "";
                macVim.num = "";
                macVim.switchToInsertMode();
            }
            else {
                macVim.clearData();
            }
            return true;
        }
        case (keyMapN.deleteWord[0] === this.currentSequence && (keyMapN.deleteWord[1] === true || keyMapN.deleteWord[2] === modifierInput)): 
        case (keyMapN.deleteWordInsert[0] === this.currentSequence && (keyMapN.deleteWordInsert[1] === true || keyMapN.deleteWordInsert[2] === modifierInput)): 
        {
	        // daw, caw
		const numRepeats = parseInt(macVim.num) || 1;
		for (let i = 0; i < numRepeats; i++) {
			let atEndOfLine = false;
			let [initialXCoord, initialYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			let [middleXCoord, middleYCoord] = docs.getCoords();
			if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
				// At end of file
				atEndOfLine = true;
			}
			else if (initialYCoord === middleYCoord) {
				// In the middle of a line
				docs.pressKey(docs.codeFromKey("ArrowLeft"));

				// Get into position
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true)
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === middleXCoord && endYCoord === middleYCoord) {
					// This means we were on a space --> delete
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
				else {
					// We were on a character --> delete
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}

			}
			else {
				// We are at the end of a line or multiline, we need to check which one
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
					// At the end of a line
					atEndOfLine = true;
				}
				else {
					// At the end of a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
					docs.pressKey(docs.codeFromKey("Backspace"));
				}
			}

			if (atEndOfLine) {
				let [startXCoord, startYCoord] = docs.getCoords();
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
				let [endXCoord, endYCoord] = docs.getCoords();
				if (endYCoord !== startYCoord) {
					// Empty line
					docs.pressKey(docs.codeFromKey("Delete"));
					docs.pressKey(docs.codeFromKey("ArrowRight"));
				}
				else if (endYCoord === startYCoord && endXCoord === startXCoord) {
					// At start of file on an empty line
					docs.pressKey(docs.codeFromKey("Delete"));
				}
				else {
					docs.pressKey(docs.codeFromKey("ArrowRight")); // Get back to where we were

					// Delete stuff at the end of the line
					docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
					docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                    let textNotSelected = !docs.isTextSelected();
					// let textNotSelected = docs.contentDocument.getSelection(0).getRangeAt(0).startOffset;
					if (textNotSelected) {
						// No trailing spaces to worry about or anything
						docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
						docs.pressKey(docs.codeFromKey("Backspace"));

						let [startXPosCoord, startYPosCoord] = docs.getCoords();
						docs.pressKey(docs.codeFromKey("Backspace"));
						let [endPosXCoord, endPosYCoord] = docs.getCoords();
						if (startYPosCoord !== endPosYCoord) {
							docs.pressKey(docs.codeFromKey("Z"), true);
							docs.pressKey(docs.codeFromKey("Backspace"));
						}
					}
					else {
						// Trailing spaces are currently highlighted, which we will destroy
						docs.pressKey(docs.codeFromKey("Backspace"));
						docs.pressKey(docs.codeFromKey("Delete")); // **Different from Windows** Like actual vim, we now have to bring the previous line up

						// Delete the next word on the next line as well (one arrow right for the enter, one for the actual word)
						docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
						docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
						docs.pressKey(docs.codeFromKey("Backspace"));
					}
				}
			}
		}

		if (
        keyMapN.deleteWordInsert[0] === this.currentSequence && (keyMapN.deleteWordInsert[1] === true || keyMapN.deleteWordInsert[2] === modifierInput)
        ) {
			macVim.currentSequence = "";
			macVim.num = "";
			macVim.switchToInsertMode();
		}
		else {
			macVim.clearData();
		}
		return true;
        }
        case (keyMapN.copyToEndOfLine[0] === this.currentSequence && (keyMapN.copyToEndOfLine[1] === true || keyMapN.copyToEndOfLine[2] === modifierInput)): 
        {
	        // y$
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowRight"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
			// We are at the end of the file already, do nothing
			navigator.clipboard.writeText("");
		} else if (startYCoord === middleYCoord) {
			// We're in the middle of a line
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		} else {
			// We are on the end of a multiline or line
			docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
			let [endXCoord, endYCoord] = docs.getCoords();
			if (endXCoord === startXCoord && endYCoord === startYCoord) {
				// We are at the end of a line, do nothing
				navigator.clipboard.writeText("");
			} else {
				// We are on a multiline

				// Get back to original position
				docs.pressKey(docs.codeFromKey("ArrowRight"), true);

				// Highlight, copy, deselect
				docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
				docs.contentDocument.execCommand("copy");
				docs.pressKey(docs.codeFromKey("ArrowLeft"));
			}
		}

		macVim.clearData();
		return true;
        }
        case (keyMapN.copyToStartOfLine[0] === this.currentSequence && (keyMapN.copyToStartOfLine[1] === true || keyMapN.copyToStartOfLine[2] === modifierInput)): 
        {
	        // y0
		let [startXCoord, startYCoord] = docs.getCoords();
		docs.pressKey(docs.codeFromKey("ArrowLeft"));
		let [middleXCoord, middleYCoord] = docs.getCoords();
		if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
			// At start of file, do nothing
			navigator.clipboard.writeText("");
		}
		else if (startYCoord === middleYCoord) {
			// In the middle of a line
			docs.pressKey(docs.codeFromKey("ArrowRight"));
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
			docs.contentDocument.execCommand("copy");
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
		}
		else {
			// At the start of a line or multiline, figure out which one and then act accordingly
			let [tempXCoord, tempYCoord] = docs.getCoords();
			docs.pressKey(docs.codeFromKey("ArrowLeft"));
			let [finalXCoord, finalYCoord] = docs.getCoords();
			if (tempYCoord === finalYCoord && tempXCoord === finalXCoord) {
				// The line above us was the start of the file on an empty line, so just go back (we only do
				// one because the last ArrowLeft didn't do anything)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				navigator.clipboard.writeText("");
			}
			else if (tempYCoord !== finalYCoord) {
				// The line above us is empty, so just get back (we were at the start of a line)
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				navigator.clipboard.writeText("");
			}
			else {
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowRight"));
				docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
				let [finalXCoord, finalYCoord] = docs.getCoords();
				if (finalXCoord === middleXCoord && finalYCoord === middleYCoord) {
					// We were at the start of an enter, just go back
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					navigator.clipboard.writeText("");
				}
				else {
					// We were at the start of a multiline
					docs.pressKey(docs.codeFromKey("ArrowRight"), true);
					docs.pressKey(docs.codeFromKey("ArrowRight"));
					docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
					docs.contentDocument.execCommand("copy");
					docs.pressKey(docs.codeFromKey("ArrowLeft"));
				}
			}
		}

		macVim.clearData();
		return true;
    
        }
        case (keyMapN.copyWholeLine[0] === this.currentSequence && (keyMapN.copyWholeLine[1] === true || keyMapN.copyWholeLine[2] === modifierInput)): 
        case (keyMapN.copyWholeLine2[0] === this.currentSequence && (keyMapN.copyWholeLine2[1] === true || keyMapN.copyWholeLine2[2] === modifierInput)): 
        {
            // yy or Y (copy the whole line)
            const numRepeats = parseInt(this.num) || 1;

            let [startXCoord, startYCoord] = docs.getCoords();

            // Since we're on Mac we can't just highlight down the specified number of lines :C, we have to get more
            // creative :D

            this.moveToEndOfLine();

            // Navigate as many lines down as we need (we are always on the end of any line we're on now)
            let downCounter = numRepeats - 1;
            while (downCounter > 0) {
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                let [endXCoord, endYCoord] = docs.getCoords();
                if (initialXCoord === endXCoord && initialYCoord === endYCoord) {
                    // We tried to move down but couldn't (we are at the end of the file)
                    break;
                }
                else {
                    downCounter -= 1;
                }
            }

            docs.pressKey(docs.codeFromKey("ArrowRight")) // Highlight the newline character on the way up

            // Now we're going to highlight up everything, copy it, and then move back to the original position
            let upCounter;
            if (numRepeats === 1) {
                upCounter = 1;
            }
            else {
                upCounter = numRepeats - downCounter;
            }

            while (upCounter > 0) {
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                upCounter -= 1;
            }

            docs.contentDocument.execCommand("copy");

            docs.pressKey(docs.codeFromKey("ArrowLeft"));

            docs.moveToCoords(startXCoord, startYCoord);

            macVim.clearData();
            return true;
        }
        case (keyMapN.u[0] === this.currentSequence && (keyMapN.u[1] === true || keyMapN.u[2] === modifierInput)): 
        case (keyMapN.U[0] === this.currentSequence && (keyMapN.U[1] === true || keyMapN.U[2] === modifierInput)): 
		{
            const numRepeats = parseInt(this.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("Z"), true);
            }
            this.clearData();
            return true;
		}
        case (keyMapN.indent[0] === this.currentSequence && (keyMapN.indent[1] === true || keyMapN.indent[2] === modifierInput)):
        {
            let numRepeats = parseInt(this.num) || 1;

            // 13 indentations is the max possible
            if (numRepeats > 13) {
                numRepeats = 13;
            }

            for (let i = 0; i < numRepeats; i++) {
                // Indent
                docs.clickButton(docs.toolbarMenuButtonOptions.indent);
            }
            this.clearData();
            return true;
        }
        case (keyMapN.outdent[0] === this.currentSequence && (keyMapN.outdent[1] === true || keyMapN.outdent[2] === modifierInput)):
        {
            let numRepeats = parseInt(this.num) || 1;

            // 13 indentations is the max possible
            if (numRepeats > 13) {
                numRepeats = 13;
            }

            for (let i = 0; i < numRepeats; i++) {
                // Indent
                docs.clickButton(docs.toolbarMenuButtonOptions.outdent);
            }
            this.clearData();
            return true;
        }
        case (keyMapN.replaceMode[0] === this.currentSequence && (keyMapN.replaceMode[1] === true || keyMapN.replaceMode[2] === modifierInput)):
        {
            this.clearData();
            this.switchToReplaceMode();
            return true;
        }
        case(keyMapN.db[0] === this.currentSequence && (keyMapN.db[1] === true || keyMapN.db[2] === modifierInput)):
        case(keyMapN.cb[0] === this.currentSequence && (keyMapN.cb[1] === true || keyMapN.cb[2] === modifierInput)):
        {
            let enterInsertMode = false;

            if (keyMapN.cb[0] === this.currentSequence && (keyMapN.cb[1] === true || keyMapN.cb[2] === modifierInput)) {
                enterInsertMode = true;
            }

            // Highlight backwards
            const numRepeats = parseInt(this.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
            }

            // Delete or cut the selection
            if (!enterInsertMode) {
                this.deleteOrCut(keyMapN.db[4]);
                this.clearData();
            }
            else {
                this.deleteOrCut(keyMapN.cb[4]);
                this.clearData();
                this.switchToInsertMode();
            }

            return true;
        }
	}

    // Check for numbers
    if (e.key.match(/\d+/) && this.currentSequence.length === 1) {
        // We have a number
        this.currentSequence = "";
        if (this.num.length < 3) {
            this.num += e.key;
        }
    }

    if (
        this.currentSequence.length !== 0 &&
        !keyMap.incompleteKeyMapN.includes(this.currentSequence) && !keyMap.incompleteKeyMapNative.includes(this.currentSequence)
    ) {
        // This means that the current sequence is invalid, so we have to reset it
        this.clearData();
        return true;
    }

	// Basically catch here anything that is a valid keymap but is not fully finished typing yet (ex: "g", but not "gg" yet)
    UI.updateUISequenceText(this.num + getCleanedSequence(this.currentSequence));
    docs.setCursorWidth(this.mode);
    return true;
};

// Called in visual mode.
macVim.visual_keydown = function (e) {
	if (e.key.match(/F\d+/)) {
		// Pass through any function keys.
		return true;
	}

    if (this.isChromeShortcut(e)) {
        return true;
    }

	e.preventDefault();
	e.stopPropagation();

	if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
		// Shift by itself does nothing
		return true;
	}

    // Past this point we add the key to the sequence, and then go checking if it matches any of the commands in our switch statement
    // If it doesn't, after the switch statement we see if we are building up to a command or not

    if (this.currentSequence.length === 0) {
        this.currentSequence = e.key;
    }
    else {
        this.currentSequence += KEY_SEPARATOR + e.key;
    }

    // Bit mask of what modifier keys are pressed
    const modifierInput = getModifierInput(e);
    const keyMapV = keyMap.keyMapV;

    if (this.nativeKeyCheck(modifierInput)) {
        this.clearData();
        return true;
    }

	switch (true) {
        case (keyMapV.escape[0] === this.currentSequence && (keyMapV.escape[1] === true || keyMapV.escape[2] === modifierInput)):
        case (keyMapV.escape[0] === e.key && (keyMapV.escape[1] === true || keyMapV.escape[2] === modifierInput)):
        case (keyMapV.ctrlC[0] === this.currentSequence && (keyMapV.ctrlC[1] === true || keyMapV.ctrlC[2] === modifierInput)):
        case (keyMapV.ctrlC[0] === e.key && (keyMapV.ctrlC[1] === true || keyMapV.ctrlC[2] === modifierInput)):
        {
            // Escape visual mode.
            docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
            // go to the right side when the left side could be a solution as well
            macVim.clearData();
            macVim.switchToNormalMode();
            return true;
        }
        case (keyMapV["0"][0] === this.currentSequence && (keyMapV["0"][1] === true || keyMapV["0"][2] === modifierInput)):
            {
                let regexNumMatch = /\d/;
                if (regexNumMatch.test(this.currentSequence) && this.num !== "") {
                    // If we are typing a number, we don't want to execute this command actually, but instead just keep typing our number
                    break;
                }
                docs.pressKey(docs.codeFromKey("Home"), false, true);
                docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                this.clearData();
                UI.updateUISequenceText(this.num + getCleanedSequence(this.currentSequence));
                return true;

            }
        case (keyMapV.arrowLeft[0] === this.currentSequence && (keyMapV.arrowLeft[1] === true || keyMapV.arrowLeft[2] === modifierInput)):
        case (keyMapV.backspace[0] === this.currentSequence && (keyMapV.backspace[1] === true || keyMapV.backspace[2] === modifierInput)):
        case (keyMapV.h[0] === this.currentSequence && (keyMapV.h[1] === true || keyMapV.h[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                }
                this.clearData();
                return true;
            }
        case (keyMapV.arrowRight[0] === this.currentSequence && (keyMapV.arrowRight[1] === true || keyMapV.arrowRight[2] === modifierInput)):
        case (keyMapV.l[0] === this.currentSequence && (keyMapV.l[1] === true || keyMapV.l[2] === modifierInput)):
        case (keyMapV.space[0] === this.currentSequence && (keyMapV.space[1] === true || keyMapV.space[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                }
                this.clearData();
                return true;
            }
        case (keyMapV.arrowUp[0] === this.currentSequence && (keyMapV.arrowUp[1] === true || keyMapV.arrowUp[2] === modifierInput)):
        case (keyMapV.k[0] === this.currentSequence && (keyMapV.k[1] === true || keyMapV.k[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), false, true);
                }
                this.clearData();
                return true;
            }
        case (keyMapV.arrowDown[0] === this.currentSequence && (keyMapV.arrowDown[1] === true || keyMapV.arrowDown[2] === modifierInput)):
        case (keyMapV.j[0] === this.currentSequence && (keyMapV.j[1] === true || keyMapV.j[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), false, true);
                }
                this.clearData();
                return true;
            }
        case (keyMapV.B[0] === this.currentSequence && (keyMapV.B[1] === true || keyMapV.B[2] === modifierInput)):
        case (keyMapV.b[0] === this.currentSequence && (keyMapV.b[1] === true || keyMapV.b[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                }
                this.clearData();
                return true;
            }
        case (keyMapV.gg[0] === this.currentSequence && (keyMapV.gg[1] === true || keyMapV.gg[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("Home"), true, true);
                this.clearData();
                return true;
            }
        case (keyMapV.G[0] === this.currentSequence && (keyMapV.G[1] === true || keyMapV.G[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("End"), true, true);
                this.clearData();
                return true;
            }
        case (keyMapV.e[0] === this.currentSequence && (keyMapV.e[1] === true || keyMapV.e[2] === modifierInput)):
        case (keyMapV.E[0] === this.currentSequence && (keyMapV.E[1] === true || keyMapV.E[2] === modifierInput)):
            {
                const numRepeats = parseInt(this.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                }
                this.clearData();
                return true;
            }
        case (keyMapV.u[0] === this.currentSequence && (keyMapV.u[1] === true || keyMapV.u[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.lowercase);
                this.clearData();
                return true;
            }
        case (keyMapV.U[0] === this.currentSequence && (keyMapV.U[1] === true || keyMapV.U[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.uppercase);
                this.clearData();
                return true;
            }
        case (keyMapV.redo[0] === this.currentSequence && (keyMapV.redo[1] === true || keyMapV.redo[2] === modifierInput)):
            {
                // Escape visual mode.
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                // go to the right side when the left side could be a solution as well
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.slashSearch[0] === this.currentSequence && (keyMapV.slashSearch[1] === true || keyMapV.slashSearch[2] === modifierInput)):
            {
                // Search
                docs.pressKey(docs.codeFromKey("f"), true);
                macVim.clearData();
                return true;
            }
        case (keyMapV.paste[0] === this.currentSequence && (keyMapV.paste[1] === true || keyMapV.paste[2] === modifierInput)):
        case (keyMapV.pasteBeforeCursor[0] === this.currentSequence && (keyMapV.pasteBeforeCursor[1] === true || keyMapV.pasteBeforeCursor[2] === modifierInput)):
            {
                // Paste
                if (docs.isTextSelected()) {
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }

                setTimeout(() => {
                    docs.pasteRegular();
                }, 1)
                this.clearData();
                this.switchToNormalMode();
                return true;

            }
        case (keyMapV.pasteNoFormatting[0] === this.currentSequence && (keyMapV.pasteNoFormatting[1] === true || keyMapV.pasteNoFormatting[2] === modifierInput)):
        case (keyMapV.pasteBeforeCursorNoFormatting[0] === this.currentSequence && (keyMapV.pasteBeforeCursorNoFormatting[1] === true || keyMapV.pasteBeforeCursorNoFormatting[2] === modifierInput)):
            {
                // We have to first delete the highlighted text, then paste in the clipboard
                if (docs.isTextSelected()) {
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }

                docs.pastePlainText();

                this.clearData();
                this.switchToNormalMode();
                return true;
            }
        case (keyMapV.insertStartOfHighlight[0] === this.currentSequence && (keyMapV.insertStartOfHighlight[1] === true || keyMapV.insertStartOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                macVim.clearData();
                macVim.switchToInsertMode();
                return true;
            }
        case (keyMapV.exitVisualMode[0] === this.currentSequence && (keyMapV.exitVisualMode[1] === true || keyMapV.exitVisualMode[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.exitToVisualLineMode[0] === this.currentSequence && (keyMapV.exitToVisualLineMode[1] === true || keyMapV.exitToVisualLineMode[2] === modifierInput)):
            {
                // TODO: Eventually we're going to highlight in visual line mode all the lines that were highlighted in visual mode
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                this.clearData();
                this.switchToVisualLineMode();
                return true;
            }
        case (keyMapV.appendEndOfHighlight[0] === this.currentSequence && (keyMapV.appendEndOfHighlight[1] === true || keyMapV.appendEndOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowRight"));

                macVim.clearData();
                macVim.switchToInsertMode();
                return true;
            }
        case (keyMapV.highlightToEndOfLine[0] === this.currentSequence && (keyMapV.highlightToEndOfLine[1] === true || keyMapV.highlightToEndOfLine[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                macVim.clearData();
                return true;
            }
        case (keyMapV.x[0] === this.currentSequence && (keyMapV.x[1] === true || keyMapV.x[2] === modifierInput)):
            {
                let shouldWeCut = keyMapV.x[4];
                this.deleteOrCut(shouldWeCut);
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.d[0] === this.currentSequence && (keyMapV.d[1] === true || keyMapV.d[2] === modifierInput)):
            {
                let shouldWeCut = keyMapV.d[4];
                this.deleteOrCut(shouldWeCut);
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.c[0] === this.currentSequence && (keyMapV.c[1] === true || keyMapV.c[2] === modifierInput)):
            {
                let shouldWeCut = keyMapV.c[4];
                this.deleteOrCut(shouldWeCut);
                macVim.clearData();
                macVim.switchToInsertMode();
                return true;
            }
        case (keyMapV.D[0] === this.currentSequence && (keyMapV.D[1] === true || keyMapV.D[2] === modifierInput)):
        case (keyMapV.C[0] === this.currentSequence && (keyMapV.C[1] === true || keyMapV.C[2] === modifierInput)):
            {
                // Delete the whole line(s) that we partially selected
                docs.pressKey(docs.codeFromKey("Backspace"));

                // Now we need to just need to basically do the same logic as "dd" or "cc"
                if (keyMapV.D[0] === this.currentSequence && (keyMapV.D[1] === true || keyMapV.D[2] === modifierInput)) {
                    macVim.moveToEndOfLine();
                    let [startXCoord, startYCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [midXCoord, midYCoord] = docs.getCoords();
                    if (startXCoord === midXCoord && startYCoord === midYCoord) {
                        // At the start of the file
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                    else if (startYCoord === midYCoord) {
                        // In the middle of a line or something
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                    else {
                        // We are on an empty line
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }

                    macVim.clearData();
                    macVim.switchToNormalMode();
                    return true;
                }
                else if (keyMapV.C[0] === this.currentSequence && (keyMapV.C[1] === true || keyMapV.C[2] === modifierInput)) {
                    macVim.moveToEndOfLine();
                    let [startXCoord, startYCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [midXCoord, midYCoord] = docs.getCoords();
                    if (startXCoord === midXCoord && startYCoord === midYCoord) {
                        // Do nothing
                    }
                    else if (startYCoord === midYCoord) {
                        // In the middle of a line or something
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                    else {
                        // We are on an empty line
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                    }

                    macVim.clearData();
                    macVim.switchToInsertMode();
                    return true;
                }

                macVim.clearData();
                return true;

            }
        case (keyMapV.y[0] === this.currentSequence && (keyMapV.y[1] === true || keyMapV.y[2] === modifierInput)):
            {
                docs.contentDocument.execCommand("copy");
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.arrowLeftCtrl[0] === this.currentSequence && (keyMapV.arrowLeftCtrl[1] === true || keyMapV.arrowLeftCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapV.arrowRightCtrl[0] === this.currentSequence && (keyMapV.arrowRightCtrl[1] === true || keyMapV.arrowRightCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapV.arrowDownCtrl[0] === this.currentSequence && (keyMapV.arrowDownCtrl[1] === true || keyMapV.arrowDownCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapV.arrowUpCtrl[0] === this.currentSequence && (keyMapV.arrowUpCtrl[1] === true || keyMapV.arrowUpCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                }
                macVim.clearData();
                return true;
            }
        case (keyMapV.ctrlDPageDown[0] === this.currentSequence && (keyMapV.ctrlDPageDown[1] === true || keyMapV.ctrlDPageDown[2] === modifierInput)):
            {
	            // Page up/down if we are not line based visual mode
                // Page down
                docs.pressKey(docs.codeFromKey("PageDown"), false, true);
                macVim.clearData();
                return true;
            }
        case (keyMapV.ctrlUPageUp[0] === this.currentSequence && (keyMapV.ctrlUPageUp[1] === true || keyMapV.ctrlUPageUp[2] === modifierInput)):
            {
                // Page up
                docs.pressKey(docs.codeFromKey("PageUp"), false, true);
                macVim.clearData();
                return true;
            }
        case (keyMapV.w[0] === this.currentSequence && (keyMapV.w[1] === true || keyMapV.w[2] === modifierInput)):
        case (keyMapV.W[0] === this.currentSequence && (keyMapV.W[1] === true || keyMapV.W[2] === modifierInput)):
			{
                const numRepeats = parseInt(macVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                    docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                }
                macVim.clearData();
                return true;
			}
        case (keyMapV.indent[0] === this.currentSequence && (keyMapV.indent[1] === true || keyMapV.indent[2] === modifierInput)):
        {
            let numRepeats = parseInt(this.num) || 1;

            // 13 indentations is the max possible
            if (numRepeats > 13) {
                numRepeats = 13;
            }

            for (let i = 0; i < numRepeats; i++) {
                // Indent
                docs.clickButton(docs.toolbarMenuButtonOptions.indent);
            }
            this.clearData();
            return true;
        }
        case (keyMapV.outdent[0] === this.currentSequence && (keyMapV.outdent[1] === true || keyMapV.outdent[2] === modifierInput)):
        {
            let numRepeats = parseInt(this.num) || 1;

            // 13 indentations is the max possible
            if (numRepeats > 13) {
                numRepeats = 13;
            }

            for (let i = 0; i < numRepeats; i++) {
                // Indent
                docs.clickButton(docs.toolbarMenuButtonOptions.outdent);
            }
            this.clearData();
            return true;
        }
	}

    // Check for numbers
    if (e.key.match(/\d+/) && this.currentSequence.length === 1) {
        // We have a number
        this.currentSequence = "";
        if (this.num.length < 3) {
            this.num += e.key;
        }
    }

    // Check if we are building up to a command or if the sequence is invalid
    if (
        this.currentSequence.length !== 0 &&
        !keyMap.incompleteKeyMapV.includes(this.currentSequence) && !keyMap.incompleteKeyMapNative.includes(this.currentSequence)
    ) {
        // This means that the current sequence is invalid, so we have to reset it
        this.num = "";
        this.currentSequence = "";
    }

    UI.updateUISequenceText(this.num + getCleanedSequence(this.currentSequence));
    return true;


};

macVim.switchVisualLineDirection = function () {
    // We know that no text is highlighted if this function is called

    this.visualLineModeDown =  !this.visualLineModeDown;
    if (this.visualLineModeDown === false) {
        // We have to change our direction to up now
        this.moveToEndOfLine();
        docs.pressKey(docs.codeFromKey("ArrowRight"));
        docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);

        docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
    }
    else {
        // We have to change our direction to down now
        docs.pressKey(docs.codeFromKey("ArrowLeft"));
        this.moveToStartOfLine();
        docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
        docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);

        // We need to select the next line down too because that's technically what we were trying to do at the
        // very start
        docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
        docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);

    }
}

macVim.visual_line_keydown = function (e) {
	if (e.key.match(/F\d+/)) {
		// Pass through any function keys.
		return true;
	}

    if (this.isChromeShortcut(e)) {
        return true;
    }

	e.preventDefault();
	e.stopPropagation();

	if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
		// Shift by itself does nothing
		return true;
	}

    // Past this point we add the key to the sequence, and then go checking if it matches any of the commands in our switch statement
    // If it doesn't, after the switch statement we see if we are building up to a command or not

    if (this.currentSequence.length === 0) {
        this.currentSequence = e.key;
    }
    else {
        this.currentSequence += KEY_SEPARATOR + e.key;
    }

    // Bit mask of what modifier keys are pressed
    const modifierInput = getModifierInput(e);
    const keyMapVLine = keyMap.keyMapVLine;

    if (this.nativeKeyCheck(modifierInput)) {
        this.clearData();
        return true;
    }

	switch (true) {
        case (keyMapVLine.escape[0] === this.currentSequence && (keyMapVLine.escape[1] === true || keyMapVLine.escape[2] === modifierInput)):
        case (keyMapVLine.escape[0] === e.key && (keyMapVLine.escape[1] === true || keyMapVLine.escape[2] === modifierInput)):
        case (keyMapVLine.ctrlC[0] === this.currentSequence && (keyMapVLine.ctrlC[1] === true || keyMapVLine.ctrlC[2] === modifierInput)):
        case (keyMapVLine.ctrlC[0] === e.key && (keyMapVLine.ctrlC[1] === true || keyMapVLine.ctrlC[2] === modifierInput)):
        case (keyMapVLine.exitVisualLineMode[0] === this.currentSequence && (keyMapVLine.exitVisualLineMode[1] === true || keyMapVLine.exitVisualLineMode[2] === modifierInput)):
        case (keyMapVLine.exitToVisualMode[0] === macVim.currentSequence && (keyMapVLine.exitToVisualMode[1] === true || keyMapVLine.exitToVisualMode[2] === modifierInput)):
        case (keyMapVLine.redo[0] === this.currentSequence && (keyMapVLine.redo[1] === true || keyMapVLine.redo[2] === modifierInput)):
        {
            // Escape visual mode.
            if (!docs.isTextSelected()) {
                // Do nothing (this should never hit though)
            }
            else if (this.visualLineModeDown) {
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                this.moveToEndOfLine();
            }
            else {
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
            }

            if (keyMapVLine.exitToVisualMode[0] === macVim.currentSequence && (keyMapVLine.exitToVisualMode[1] === true || keyMapVLine.exitToVisualMode[2] === modifierInput)) {
                this.clearData();
                this.switchToVisualMode();
                return true;
            }

            macVim.clearData();
            macVim.switchToNormalMode();
            return true;
        }
        case (keyMapVLine.arrowUp[0] === this.currentSequence && (keyMapVLine.arrowUp[1] === true || keyMapVLine.arrowUp[2] === modifierInput)):
        case (keyMapVLine.arrowUpCtrl[0] === this.currentSequence && (keyMapVLine.arrowUpCtrl[1] === true || keyMapVLine.arrowUpCtrl[2] === modifierInput)): 
        case (keyMapVLine.k[0] === this.currentSequence && (keyMapVLine.k[1] === true || keyMapVLine.k[2] === modifierInput)):
        {
			const numRepeats = parseInt(macVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
				docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);

                if (!docs.isTextSelected()) {
                    this.switchVisualLineDirection();
                }
			}
			macVim.clearData();
			return true;
        }
        case (keyMapVLine.arrowDown[0] === this.currentSequence && (keyMapVLine.arrowDown[1] === true || keyMapVLine.arrowDown[2] === modifierInput)): 
        case (keyMapVLine.arrowDownCtrl[0] === this.currentSequence && (keyMapVLine.arrowDownCtrl[1] === true || keyMapVLine.arrowDownCtrl[2] === modifierInput)): 
        case (keyMapVLine.j[0] === this.currentSequence && (keyMapVLine.j[1] === true || keyMapVLine.j[2] === modifierInput)):
        {
			// We need to handle j differently on Mac because of Apple's weird behavior around empty lines
			const numRepeats = parseInt(macVim.num) || 1;
			for (let i = 0; i < numRepeats; i++) {
                if (this.visualLineModeDown === true) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                }
                else {
                    // We are going down when our position is up, so we can only go down without using the ctrlKey
                    // unfortunately, otherwise we nuke ourselves and go all the way down to the end.
                    docs.pressKey(docs.codeFromKey("ArrowDown"), false, true);
                }

                if (!docs.isTextSelected()) {
                    this.switchVisualLineDirection();
                }
			}
			macVim.clearData();
			return true;
        }
        case (keyMapVLine.ctrlDPageDown[0] === this.currentSequence && (keyMapVLine.ctrlDPageDown[1] === true || keyMapVLine.ctrlDPageDown[2] === modifierInput)): 
        {
            // Ctrl-d is page-down, so move down and then ensure we are still line-based
            let iterations = 6;
            if (e.repeat) {
                iterations = 1;
                if (this.visualLineModeDown === false) {
                    iterations = 2;
                }
            }

            for (let i = 0; i < iterations; i++) {
                if (this.visualLineModeDown === true) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                } else {
                    // We are going down when our position is up, so we can only go down without using the ctrlKey
                    // unfortunately, otherwise we nuke ourselves and go all the way down to the end.
                    docs.pressKey(docs.codeFromKey("ArrowDown"), false, true);
                }

                if (!docs.isTextSelected()) {
                    this.switchVisualLineDirection();
                }
            }

			macVim.clearData();
			return true;
        }
        case (keyMapVLine.ctrlUPageUp[0] === this.currentSequence && (keyMapVLine.ctrlUPageUp[1] === true || keyMapVLine.ctrlUPageUp[2] === modifierInput)): 
        {
            // Ctrl-u is page-up, so move up and then ensure we are still line-based
            let iterations = 6
            if (e.repeat) {
                iterations = 0;
            }

            for (let i = 0; i < iterations; i++) {
                docs.pressKey(docs.codeFromKey("ArrowUp"), false, true);
                if (!docs.isTextSelected()) {
                    this.switchVisualLineDirection();
                }
            }

            docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
            if (!docs.isTextSelected()) {
                this.switchVisualLineDirection();
            }

			macVim.clearData();
			return true;
        }
        case (keyMapVLine.gg[0] === this.currentSequence && (keyMapVLine.gg[1] === true || keyMapVLine.gg[2] === modifierInput)):
            {
                // We must traverse to the top
                if (!this.visualLineModeDown) {
                    // Base case
                    docs.pressKey(docs.codeFromKey("Home"), true, true);
                }
                else {
                    // Edge case
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    this.moveToEndOfLine();
                    docs.pressKey(docs.codeFromKey("ArrowRight"));

                    docs.pressKey(docs.codeFromKey("Home"), true, true);
                }

                this.visualLineModeDown = false;
                this.clearData();
                return true;
            }
        case (keyMapVLine.G[0] === this.currentSequence && (keyMapVLine.G[1] === true || keyMapVLine.G[2] === modifierInput)):
            {
                // We must traverse down
                if (this.visualLineModeDown) {
                    // Base case
                    docs.pressKey(docs.codeFromKey("End"), true, true);
                }
                else {
                    // Edge case (we were going up)
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    this.moveToStartOfLine();
                    docs.pressKey(docs.codeFromKey("End"), true, true);
                }

                this.visualLineModeDown = true;
                this.clearData();
                return true;
            }
        case (keyMapVLine.u[0] === this.currentSequence && (keyMapVLine.u[1] === true || keyMapVLine.u[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.lowercase);
                this.clearData();
                return true;
            }
        case (keyMapVLine.U[0] === this.currentSequence && (keyMapVLine.U[1] === true || keyMapVLine.U[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.uppercase);
                this.clearData();
                return true;
            }
        case (keyMapVLine.slashSearch[0] === this.currentSequence && (keyMapVLine.slashSearch[1] === true || keyMapVLine.slashSearch[2] === modifierInput)):
            {
                // Search
                docs.pressKey(docs.codeFromKey("f"), true);
                macVim.clearData();
                return true;
            }
        case (keyMapVLine.paste[0] === this.currentSequence && (keyMapVLine.paste[1] === true || keyMapVLine.paste[2] === modifierInput)):
        case (keyMapVLine.pasteBeforeCursor[0] === this.currentSequence && (keyMapVLine.pasteBeforeCursor[1] === true || keyMapVLine.pasteBeforeCursor[2] === modifierInput)):
            {
                // We have to first delete the highlighted text, then paste in the clipboard
                if (docs.isTextSelected()) {
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }

                setTimeout(() => {
                    docs.pasteRegular();
                }, 1)

                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.pasteNoFormatting[0] === this.currentSequence && (keyMapVLine.pasteNoFormatting[1] === true || keyMapVLine.pasteNoFormatting[2] === modifierInput)):
        case (keyMapVLine.pasteBeforeCursorNoFormatting[0] === this.currentSequence && (keyMapVLine.pasteBeforeCursorNoFormatting[1] === true || keyMapVLine.pasteBeforeCursorNoFormatting[2] === modifierInput)):
            {
                if (docs.isTextSelected()) {
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }

                docs.pastePlainText();

                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.insertStartOfHighlight[0] === this.currentSequence && (keyMapVLine.insertStartOfHighlight[1] === true || keyMapVLine.insertStartOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                macVim.clearData();
                macVim.switchToInsertMode();
                return true;
            }
        case (keyMapVLine.appendEndOfHighlight[0] === this.currentSequence && (keyMapVLine.appendEndOfHighlight[1] === true || keyMapVLine.appendEndOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                this.moveToEndOfLine();

                this.clearData();
                this.switchToInsertMode();
                return true;

            }
        case (keyMapVLine.x[0] === this.currentSequence && (keyMapVLine.x[1] === true || keyMapVLine.x[2] === modifierInput)):
            {
                let shouldWeCut = keyMapVLine.x[4];
                this.deleteOrCut(shouldWeCut);
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.d[0] === this.currentSequence && (keyMapVLine.d[1] === true || keyMapVLine.d[2] === modifierInput)):
        case (keyMapVLine.D[0] === this.currentSequence && (keyMapVLine.D[1] === true || keyMapVLine.D[2] === modifierInput)):
            {
                let shouldWeCut = keyMapVLine.d[4];
                if (keyMapVLine.D[0] === this.currentSequence && (keyMapVLine.D[1] === true || keyMapVLine.D[2] === modifierInput)) {
                    shouldWeCut = keyMapVLine.D[4];
                }
                this.deleteOrCut(shouldWeCut);
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.c[0] === this.currentSequence && (keyMapVLine.c[1] === true || keyMapVLine.c[2] === modifierInput)):
        case (keyMapVLine.C[0] === this.currentSequence && (keyMapVLine.C[1] === true || keyMapVLine.C[2] === modifierInput)):
            {
                let shouldWeCut = keyMapVLine.c[4];
                if (keyMapVLine.C[0] === this.currentSequence && (keyMapVLine.C[1] === true || keyMapVLine.C[2] === modifierInput)) {
                    shouldWeCut = keyMapVLine.C[4];
                }
                this.deleteOrCut(shouldWeCut);
                macVim.clearData();
                macVim.switchToInsertMode();
                return true;
            }
        case (keyMapVLine.y[0] === this.currentSequence && (keyMapVLine.y[1] === true || keyMapVLine.y[2] === modifierInput)):
			{
                docs.contentDocument.execCommand("copy");
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                macVim.clearData();
                macVim.switchToNormalMode();
                return true;
			}
        case (keyMapVLine.indent[0] === this.currentSequence && (keyMapVLine.indent[1] === true || keyMapVLine.indent[2] === modifierInput)):
        {
            let numRepeats = parseInt(this.num) || 1;

            // 13 indentations is the max possible
            if (numRepeats > 13) {
                numRepeats = 13;
            }

            for (let i = 0; i < numRepeats; i++) {
                // Indent
                docs.clickButton(docs.toolbarMenuButtonOptions.indent);
            }
            this.clearData();
            return true;
        }
        case (keyMapVLine.outdent[0] === this.currentSequence && (keyMapVLine.outdent[1] === true || keyMapVLine.outdent[2] === modifierInput)):
        {
            let numRepeats = parseInt(this.num) || 1;

            // 13 indentations is the max possible
            if (numRepeats > 13) {
                numRepeats = 13;
            }

            for (let i = 0; i < numRepeats; i++) {
                // Indent
                docs.clickButton(docs.toolbarMenuButtonOptions.outdent);
            }
            this.clearData();
            return true;
        }
	}

    if (e.key.match(/\d+/) && macVim.currentSequence.length === 1) {
        // We have a number
        this.currentSequence = "";
        if (this.num.length < 3) {
            this.num += e.key
        }
    }

    // Check if we are building up to a command or if the sequence is invalid
    if (
        this.currentSequence.length !== 0 &&
        !keyMap.incompleteKeyMapVLine.includes(this.currentSequence) && !keyMap.incompleteKeyMapNative.includes(this.currentSequence)
    ) {
        // This means that the current sequence is invalid, so we have to reset it
        this.num = "";
        this.currentSequence = "";
    }


    UI.updateUISequenceText(this.num + getCleanedSequence(this.currentSequence));
    return true;
};

macVim.insert_keydown = function (e) {
    const modifierInput = getModifierInput(e);
    const keyMapI = keyMap.keyMapI;

	switch (true) {
        case (keyMapI.escape[0] === e.key && (keyMapI.escape[1] === true || keyMapI.escape[2] === modifierInput)):
        case (keyMapI.ctrlC[0] === e.key && (keyMapI.ctrlC[1] === true || keyMapI.ctrlC[2] === modifierInput)):
		{
			e.preventDefault();
    		e.stopPropagation();
			macVim.switchToNormalMode();
			return true;
		}
        case (e.key === "h" && modifierInput === 0b0101):
        case (e.key === "c" && modifierInput === 0b0101):
        {
            // User has pressed "find and replace" in insert mode, or "word count"
            // We'll let it pass through like normal, but we need to actually watch out because
            // we need to reattach our event listeners/stuff afterward (Vim stops working otherwise)
            docs.reactivateAfterPopupButton();
            return true;
        }
	}
};

macVim.replace_keydown = function (e) {
    if (e.key.match(/F\d+/)) {
        // Let function keys (F1 to F12), go through normally
        return true;
    }

    if (
        e.key === "Shift" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Meta"
    ) {
        return true;
    }


    // Basically, we must let all keys pass through, but also delete things as well
    // Very similar to insert mode
    const modifierInput = getModifierInput(e);
    const keyMapR = keyMap.keyMapR;

    switch (true) {
        case (docs.passThroughKeys.has(e.key) && e.key !== "Backspace"):
        {
            // Do nothing, let the keys pass through (Ex: Audio volume up)
            return true;
        }
        case (keyMapR.escape[0] === e.key && (keyMapR.escape[1] === true || keyMapR.escape[2] === modifierInput)):
        case (keyMapR.ctrlC[0] === e.key && (keyMapR.ctrlC[1] === true || keyMapR.ctrlC[2] === modifierInput)):
        case (e.key === "Escape"):
        {
            e.preventDefault();
            e.stopPropagation();
            this.replaceModeUndoCounterStack = [];
            this.clearData();
            this.switchToNormalMode();
            return true;
        }
        case (keyMapR.backspace[0] === e.key && (keyMapR.backspace[1] === true || keyMapR.backspace[2] === modifierInput)):
        {
            // Backspace should undo what we have done
            e.preventDefault();
            e.stopPropagation();

            let undoCounter = this.replaceModeUndoCounterStack.pop();

            if (undoCounter === undefined) {
                // If there is nothing to undo, we do nothing
            }
            else {
                // undoCounter should be either 1 or 2
                for (let i = 0; i < undoCounter; i++) {
                    docs.pressKey(docs.codeFromKey("Z"), true);
                }
                if (undoCounter === 2) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
            }

            return true;
        }
        case (e.key === "Enter"):
        {
            // Let enter pass through
            this.replaceModeUndoCounterStack.push(1);
            return true;
        }
        case (modifierInput > 0 && modifierInput !== 0b0100 && modifierInput !== 0b0110 && modifierInput !== 0b0010):
        {
            // We are running commands or something
            return true;
        }
    }

    // We must move forward, delete one key (except if we're at the end of a line), and then let the user key pass through

    // Beyond this point we have to see if we are at the end of the line or not
    let [startXCoord, startYCoord] = docs.getCoords();
    docs.pressKey(docs.codeFromKey("ArrowRight"));
    let [midXCoord, midYCoord] = docs.getCoords();

    if (startXCoord === midXCoord && startYCoord === midYCoord) {
        // We are at the end of the file
        this.replaceModeUndoCounterStack.push(1);
    }
    else if (startYCoord === midYCoord) {
        // We are in the middle of a line
        docs.pressKey(docs.codeFromKey("Backspace"));
        this.replaceModeUndoCounterStack.push(2);
    }
    else {
        // We are at the end of a line or multiline, more work is needed to determine which
        docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
        let [endXCoord, endYCoord] = docs.getCoords();
        if (startXCoord === endXCoord && startYCoord === endYCoord) {
            // New line, now we are positioned where we should be, don't need to do anything else
            this.replaceModeUndoCounterStack.push(1);
        }
        else {
            // In the middle of a multiline
            docs.pressKey(docs.codeFromKey("ArrowRight"), true);
            // Delete the forward character
            docs.pressKey(docs.codeFromKey("Delete"));
            // Now we're in the right place
            this.replaceModeUndoCounterStack.push(2);
        }
    }

}

export { macVim };
