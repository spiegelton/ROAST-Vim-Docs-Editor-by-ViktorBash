import { getCleanedSequence } from "./UI.js";
import {getModifierInput, KEY_SEPARATOR} from "./keybindings.js";

let docs;
let UI;
let keyMap;

let windowsVim = {
    // Main variables here
    mode: "insert", // Keep track of current mode, options: ["insert", "normal", "visual", "visual_line"]
    num: "", // Keep track of number keys pressed by the user if they want to repeat a command
    currentSequence: "", // Keep track of key sequences (ex: "gg")
    replaceModeUndoCounterStack: [],
};

// List of shortcuts for normal, visual and visual line mode that we will let pass through, primarily Chrome shortcuts
windowsVim.chromeShortcuts = [
    // Chrome shortcut for switching tabs
    ["1", false, true, false, false], // Control + 1
    ["2", false, true, false, false], // Control + 2
    ["3", false, true, false, false], // Control + 3
    ["4", false, true, false, false], // Control + 4
    ["5", false, true, false, false], // Control + 5
    ["6", false, true, false, false], // Control + 6
    ["7", false, true, false, false], // Control + 7
    ["8", false, true, false, false], // Control + 8
    ["9", false, true, false, false], // Control + 9
]

windowsVim.isChromeShortcut = function (e) {
    let checkIfNativeShortcut = [e.key, e.altKey, e.ctrlKey, e.metaKey, e.shiftKey];

	for (let i = 0; i < windowsVim.chromeShortcuts.length; i++) {
		let equal = true;
		for (let j = 0; j < windowsVim.chromeShortcuts[i].length; j++) {
			if (windowsVim.chromeShortcuts[i][j] !== checkIfNativeShortcut[j]) {
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

windowsVim.setUp = function (docsInstance, UIInstance, keyMapInstance) {
    docs = docsInstance;
    UI = UIInstance;
    keyMap = keyMapInstance;
}

windowsVim.switchToNormalMode = function () {
	windowsVim.currentSequence = "";
	windowsVim.mode = "normal";
	windowsVim.num = "";
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- NORMAL --");
	docs.setCursorWidth(this.mode);
};

windowsVim.switchToReplaceMode = function () {
    windowsVim.currentSequence = "";
    windowsVim.mode = "replace";
    windowsVim.num = "";
    UI.updateUISequenceText("");
    UI.updateUIModeText("-- REPLACE --");
    docs.setCursorWidth(this.mode);
};

windowsVim.switchToVisualMode = function (highlightText = true) {
	windowsVim.currentSequence = "";
	windowsVim.mode = "visual";
	windowsVim.num = "";
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- VISUAL --");
	docs.setCursorWidth(this.mode);

    // We do not highlight text if we switch to visual mode from mouse movement (false is passed in during that scenario)
    if (highlightText) {
        docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
    }
};

windowsVim.switchToVisualLineMode = function () {
	windowsVim.currentSequence = "";
	windowsVim.mode = "visual_line";
	windowsVim.num = "";
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- VISUAL LINE --");
	docs.setCursorWidth(this.mode);

    // Get to the start of the current line
    this.moveToStartOfLine();

    // Highlight down
	docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
	docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
}

windowsVim.switchToInsertMode = function () {
	windowsVim.currentSequence = "";
	windowsVim.mode = "insert";
	windowsVim.num = "";
	UI.updateUISequenceText("");
	UI.updateUIModeText("-- INSERT --");
	docs.setCursorWidth(this.mode);
};


// shouldWeCut is boolean
windowsVim.deleteOrCut = function(shouldWeCut) {
    if (shouldWeCut === true) {
        docs.contentDocument.execCommand("cut");
    }
    else {
        docs.pressKey(docs.codeFromKey("Backspace"));
    }
}

// shouldWeCut is boolean
// There are 2 ways to undo and which one is the correct one to do depends on whether you deleted (Backspaced) or cut the text
// Consequently this function does both since undo depends on how you deleted/cut the text
windowsVim.deleteOrCutAndUndo = function(shouldWeCut) {
    if (shouldWeCut === true) {
        docs.contentDocument.execCommand("cut");
        docs.contentDocument.execCommand("undo")
    }
    else {
        docs.pressKey(docs.codeFromKey("Backspace"));
        docs.pressKey(docs.codeFromKey("Z"), true);
    }
}

windowsVim.clearData = function () {
    windowsVim.num = "";
    windowsVim.currentSequence = "";
    UI.updateUISequenceText("");
    docs.setCursorWidth(this.mode);
};
/*
 * Move to the end of a line
 */
windowsVim.moveToEndOfLine = function () {
    // We check if we're at the end of the file or not
    let [startXCoord, startYCoord] = docs.getCoords();
    docs.pressKey(docs.codeFromKey("ArrowRight"));
    let [endXCoord, endYCoord] = docs.getCoords();
    if (startXCoord === endXCoord && startYCoord === endYCoord) {
        // We are at the end of the file, do nothing
    }
    else {
        // Not at the end of the file, so move down and left 1

        docs.pressKey(docs.codeFromKey("ArrowLeft"));
        docs.pressKey(docs.codeFromKey("ArrowDown"), true);
        let [initialXCoord, initialYCoord] = docs.getCoords();
        docs.pressKey(docs.codeFromKey("ArrowLeft"));
        let [finalXCoord, finalYCoord] = docs.getCoords();
        if (initialYCoord === finalYCoord) {
            docs.pressKey(docs.codeFromKey("ArrowRight"));
        }
    }
};


windowsVim.moveToStartOfLine = function () {
    // Insert at the beginning of the line
    let [startXCoord, startYCoord] = docs.getCoords();
    docs.pressKey(docs.codeFromKey("ArrowRight"));
    let [endXCoord, endYCoord] = docs.getCoords();
    if (startXCoord === endXCoord && startYCoord === endYCoord) {
        // We are at the end of a file (which may be an empty line, so we have to test for that)
        let initialYCoord = docs.getYCoord();
        docs.pressKey(docs.codeFromKey("ArrowLeft"));
        let finalYCoord = docs.getYCoord();

        // We are going to check Y-Values, if the y-value didn't change, hit arrow up
        // If the y value did change, hit arrow right
        if (initialYCoord === finalYCoord) {
            // Y Coord didn't change, so we should get to the start of a line with arrow up
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
        } else {
            // Y Coord changed, so we were at the start of a line (so just go back)
            docs.pressKey(docs.codeFromKey("ArrowRight"));
        }
    } else {
        // We can just arrow up from here in all scenarios
        docs.pressKey(docs.codeFromKey("ArrowUp"), true);
    }
}

windowsVim.moveRightToPasteAfterCursor = function () {
    // The main thing is to check that if we're at the end, are we at the end of a multiline or real line
    let [xCoord, yCoord] = docs.getCoords();
    docs.pressKey(docs.codeFromKey("ArrowLeft")); // We do this to check if we're at the start of a line
    let [leftXCoord, leftYCoord] = docs.getCoords();
    if (leftXCoord === xCoord && leftYCoord === yCoord) {
        // We are the start of a file
        let startYCoord = docs.getYCoord();
        docs.pressKey(docs.codeFromKey("ArrowRight"));
        let endYCoord = docs.getYCoord();
        if (startYCoord !== endYCoord) {
            // We are at the start of an empty line, so don't move right actually
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
    } else {
        docs.pressKey(docs.codeFromKey("ArrowRight")); // Undo our ArrowLeft because we're not at the start of the file
        let yCoord = docs.getYCoord();
        docs.pressKey(docs.codeFromKey("ArrowRight"));
        let newYCoord = docs.getYCoord();
        if (yCoord === newYCoord) {
            // Either we are in the middle of a line or at the end of a file, good to go
        } else {
            // We are at the end of a multiline (fake line) or a real line,
            // Even though we do the same thing for both scenarios, the below key movements are still necessary
            // to either put us at the right position for either scenario
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
            docs.pressKey(docs.codeFromKey("ArrowRight"), true);
        }
    }

}

// Check if the key is a native shortcut and handle it if so
// Return true if key was handled and was a native shortcut
// Return false if key was not handled and was not a native shortcut
windowsVim.nativeKeyCheck = function (modifierInput) {
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
    }

    return false;
}

// Called in normal mode.
windowsVim.normal_keydown = function (e) {
    if (e.key.match(/F\d+/)) {
        // Let function keys (F1 to F12), go through normally
        return true;
    }

    if (windowsVim.isChromeShortcut(e)) {
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
        case (keyMapN.F[0] === windowsVim.currentSequence):
        case (keyMapN.T[0] === windowsVim.currentSequence):
        {
            // Like f and t, except that we go backwards (this means we need to find the top of the line as the
            // boundary instead of the end of the line)

            let searchLineOption;
            if (keyMapN.F[0] === windowsVim.currentSequence) {
                searchLineOption = docs.searchLineOptions.F;
            }
            else {
                searchLineOption = docs.searchLineOptions.T;
            }

            // Find character on the current line (or do nothing if there is no character on the current line)
            let character = e.key;

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
        case (keyMapN.f[0] === windowsVim.currentSequence):
        case (keyMapN.t[0] === windowsVim.currentSequence):
        {
            let searchLineOption;
            if (keyMapN.f[0] === windowsVim.currentSequence) {
                searchLineOption = docs.searchLineOptions.f;
            }
            else {
                searchLineOption = docs.searchLineOptions.t;
            }

            // Find character on the current line (or do nothing if there is no character on the current line)
            let character = e.key;

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
        case (keyMapN.replaceCharacter[0] === windowsVim.currentSequence):
            {
                // We don't check the .replaceCharacter modifierInput because we want to be able to replace a character
                // r for replace command
                let keyCharacter = e.key;

                let keyFunc = docs.pressKey;
                let keyFuncInput = e.key.charCodeAt(0);

                if ("-,. '!#$%&*()+\“-".indexOf(keyCharacter) > -1 || keyCharacter === "Tab" || keyCharacter === "\"") {
                    // Instead of using the regular press Key, we need to handle edge cases of special keys
                    keyFunc = docs.pressSpecialKey;
                    keyFuncInput = keyCharacter; // We will pass in the actual char/string instead of the numeric code
                }

                // if we're at the end of a line, r should go on the current line
                // if we're at the end of a multiline (fake) line, r can move to next multiline
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
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
                        keyFunc(keyFuncInput);
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        let rightYCoord = docs.getYCoord();
                        if (rightYCoord !== yCoord) {
                            docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        } else {
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                        continue;
                    }

                    // We are not at the start of a file or line, so we have to check if we're at the end of a line,
                    // middle of a line, or end of a file

                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    let [newXCoord, newYCoord] = docs.getCoords();
                    if (xCoord === newXCoord && yCoord === newYCoord) {
                        // We are at the end of the file, just add our word and chill
                        keyFunc(keyFuncInput);
                    } else if (yCoord === newYCoord) {
                        // We are in the middle of the line somewhere or something, standard procedure
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        keyFunc(keyFuncInput);
                    } else {
                        // We've either passed a space or a return that has put us one multiline or line down
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        let [finalXCoord, finalYCoord] = docs.getCoords();
                        if (finalXCoord === xCoord && finalYCoord === yCoord) {
                            // We are dealing with a "Return" and actual new line
                            keyFunc(keyFuncInput);
                        } else {
                            // We are dealing with a space and just a multiline
                            docs.pressKey(docs.codeFromKey("Backspace"));
                            keyFunc(keyFuncInput);
                        }
                    }
                }
                windowsVim.clearData();
                return true;
            }
    }

    // Past this point we add the key to the sequence, and then go checking if it matches any of the commands
    // If it doesn't, after the switch statement we see if we are building up to a command or not

    if (windowsVim.currentSequence.length === 0) {
        windowsVim.currentSequence = e.key;
    }
    else {
        windowsVim.currentSequence += KEY_SEPARATOR + e.key;
    }

    if (this.nativeKeyCheck(modifierInput)) {
        windowsVim.clearData();
        return true;
    }

    switch (true) {
        case (keyMapN.joinLine[0] === windowsVim.currentSequence && (keyMapN.joinLine[1] === true || keyMapN.joinLine[2] === modifierInput)):
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

            docs.pressKey(docs.codeFromKey("Backspace"));
            // Let's check that it's not an empty line on the bottom that we're joining to the top line
            let [initialXCoord, initialYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [finalXCoord, finalYCoord] = docs.getCoords()
            if (initialYCoord === finalYCoord && initialXCoord === finalXCoord) {
                // Empty line at end of file
                docs.pressKey(docs.codeFromKey("Backspace"));
            }
            else if (initialYCoord === finalYCoord) {
                // Not an empty line
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                docs.pressKey(docs.codeFromKey("ArrowLeft")); // Position ourselves on the space that we added
            }
            else {
                // Empty line
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("Backspace")); // Undo our space
            }

            this.clearData();
            return true;
        }
        case (keyMapN["0"][0] === this.currentSequence && (keyMapN["0"][1] === true || keyMapN["0"][2] === modifierInput)):
            {
                let regexNumMatch = /\d/;
                if (regexNumMatch.test(this.currentSequence) && windowsVim.num !== "") {
                    // If we are typing a number, we don't want to execute this command actually, but instead just keep typing our number
                    break;
                }

                windowsVim.moveToStartOfLine();
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.backspace[0] === windowsVim.currentSequence && (keyMapN.backspace[1] === true || keyMapN.backspace[2] === modifierInput)):
        case (keyMapN.arrowLeft[0] === windowsVim.currentSequence && (keyMapN.arrowLeft[1] === true || keyMapN.arrowLeft[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.arrowRight[0] === windowsVim.currentSequence && (keyMapN.arrowRight[1] === true || keyMapN.arrowRight[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.arrowUp[0] === windowsVim.currentSequence && (keyMapN.arrowUp[1] === true || keyMapN.arrowUp[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.arrowDown[0] === windowsVim.currentSequence && (keyMapN.arrowDown[1] === true || keyMapN.arrowDown[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.b[0] === windowsVim.currentSequence && (keyMapN.b[1] === true || keyMapN.b[2] === modifierInput)):
        case (keyMapN.B[0] === windowsVim.currentSequence && (keyMapN.B[1] === true || keyMapN.B[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.h[0] === windowsVim.currentSequence && (keyMapN.h[1] === true || keyMapN.h[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.j[0] === windowsVim.currentSequence && (keyMapN.j[1] === true || keyMapN.j[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.k[0] === windowsVim.currentSequence && (keyMapN.k[1] === true || keyMapN.k[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.l[0] === windowsVim.currentSequence && (keyMapN.l[1] === true || keyMapN.l[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.gg[0] === windowsVim.currentSequence && (keyMapN.gg[1] === true || keyMapN.gg[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("Home"), true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.G[0] === windowsVim.currentSequence && (keyMapN.G[1] === true || keyMapN.G[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("End"), true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapN["{"][0] === windowsVim.currentSequence && (keyMapN["{"][1] === true || keyMapN["{"][2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN["}"][0] === windowsVim.currentSequence && (keyMapN["}"][1] === true || keyMapN["}"][2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.arrowLeftCtrl[0] === windowsVim.currentSequence && (keyMapN.arrowLeftCtrl[1] === true || keyMapN.arrowLeftCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.arrowRightCtrl[0] === windowsVim.currentSequence && (keyMapN.arrowRightCtrl[1] === true || keyMapN.arrowRightCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.arrowDownCtrl[0] === windowsVim.currentSequence && (keyMapN.arrowDownCtrl[1] === true || keyMapN.arrowDownCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.arrowUpCtrl[0] === windowsVim.currentSequence && (keyMapN.arrowUpCtrl[1] === true || keyMapN.arrowUpCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.escape[0] === windowsVim.currentSequence && (keyMapN.escape[1] === true || keyMapN.escape[2] === modifierInput)):
            {
                // Remove any saved queries that the user had
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.ctrlC[0] === windowsVim.currentSequence && (keyMapN.ctrlC[1] === true || keyMapN.ctrlC[2] === modifierInput)):
            {
                // Remove any saved queries that the user had
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.slashSearch[0] === windowsVim.currentSequence && (keyMapN.slashSearch[1] === true || keyMapN.slashSearch[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("f"), true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.ctrlDPageDown[0] === windowsVim.currentSequence && (keyMapN.ctrlDPageDown[1] === true || keyMapN.ctrlDPageDown[2] === modifierInput)):
            {
                // Ctrl-d is page-down
                docs.pressKey(docs.codeFromKey("PageDown"));
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.ctrlUPageUp[0] === windowsVim.currentSequence && (keyMapN.ctrlUPageUp[1] === true || keyMapN.ctrlUPageUp[2] === modifierInput)):
            {
                // Ctrl-u is page-up
                docs.pressKey(docs.codeFromKey("PageUp"));
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.redo[0] === windowsVim.currentSequence && (keyMapN.redo[1] === true || keyMapN.redo[2] === modifierInput)):
            {
                // Redo
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("Y"), true); // Ctrl + Y is redo on windows
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapN.paste[0] === windowsVim.currentSequence && (keyMapN.paste[1] === true || keyMapN.paste[2] === modifierInput)):
            {
                this.moveRightToPasteAfterCursor();
                // Now we're in the right position to paste

                // We set a timeout because otherwise the paste may not work (from testing)
                setTimeout(() => {
                    docs.pasteRegular();
                }, 1)
                this.clearData();
                return true;
            }
        case (keyMapN.pasteNoFormatting[0] === windowsVim.currentSequence && (keyMapN.pasteNoFormatting[1] === true || keyMapN.pasteNoFormatting[2] === modifierInput)):
            {
                this.moveRightToPasteAfterCursor();
                // Now we're in the right position to paste

                docs.pastePlainText()
                this.clearData();
                return true;
            }
        case (keyMapN.pasteBeforeCursor[0] === windowsVim.currentSequence && (keyMapN.pasteBeforeCursor[1] === true || keyMapN.pasteBeforeCursor[2] === modifierInput)):
            {
                setTimeout(() => {
                    docs.pasteRegular();
                }, 1)
                this.clearData();
                return true;
            }
        case (keyMapN.pasteBeforeCursorNoFormatting[0] === windowsVim.currentSequence && (keyMapN.pasteBeforeCursorNoFormatting[1] === true || keyMapN.pasteBeforeCursorNoFormatting[2] === modifierInput)):
            {
                docs.pastePlainText()
                this.clearData();
                return true;
            }
        case (keyMapN.insert[0] === windowsVim.currentSequence && (keyMapN.insert[1] === true || keyMapN.insert[2] === modifierInput)):
            {
                // Go to insert mode where we are
                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapN.enterVisual[0] === windowsVim.currentSequence && (keyMapN.enterVisual[1] === true || keyMapN.enterVisual[2] === modifierInput)):
            {
                // Go to visual mode
                windowsVim.clearData();
                windowsVim.switchToVisualMode();
                return true;
            }
        case (keyMapN.enterVisualLine[0] === windowsVim.currentSequence && (keyMapN.enterVisualLine[1] === true || keyMapN.enterVisualLine[2] === modifierInput)):
            {
                windowsVim.clearData();
                windowsVim.switchToVisualLineMode();
                return true;
            }
        case (keyMapN.append[0] === windowsVim.currentSequence && (keyMapN.append[1] === true || keyMapN.append[2] === modifierInput)): 
            {
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let newYCoord = docs.getYCoord();
                if (initialYCoord !== newYCoord) {
                    // We're either on a new multiline or a real new line, check which scenario and adjust accordingly
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [finalXCoord, finalYCoord] = docs.getCoords();
                    if (
                        finalXCoord === initialXCoord &&
                        finalYCoord === initialYCoord
                    ) {
                        // We've encountered a new line, we don't need to move the cursor anymore
                    } else {
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                    }
                }

                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapN.appendEndOfLine[0] === windowsVim.currentSequence && (keyMapN.appendEndOfLine[1] === true || keyMapN.appendEndOfLine[2] === modifierInput)): 
        {
                windowsVim.moveToEndOfLine();
                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
        }
        case (keyMapN.newLineAbove[0] === windowsVim.currentSequence && (keyMapN.newLineAbove[1] === true || keyMapN.newLineAbove[2] === modifierInput)): 
        {
            // Insert a new line above and go to insert mode
            const numRepeats = parseInt(windowsVim.num) || 1;
            windowsVim.moveToStartOfLine();

            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("Enter"));
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
            }

            windowsVim.clearData();
            windowsVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.newLineBelow[0] === windowsVim.currentSequence && (keyMapN.newLineBelow[1] === true || keyMapN.newLineBelow[2] === modifierInput)): 
        {
            // Insert a new line below and go to insert mode
            // Move to the end of the line and press enter
            const numRepeats = parseInt(windowsVim.num) || 1;
            windowsVim.moveToEndOfLine();

            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("Enter"));
            }

            windowsVim.clearData();
            windowsVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.insertStartOfLine[0] === windowsVim.currentSequence && (keyMapN.insertStartOfLine[1] === true || keyMapN.insertStartOfLine[2] === modifierInput)): 
        {
            // Insert at the beginning of the line
            windowsVim.moveToStartOfLine();
            windowsVim.clearData();
            windowsVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.e[0] === windowsVim.currentSequence && (keyMapN.e[1] === true || keyMapN.e[2] === modifierInput)): 
        case (keyMapN.E[0] === windowsVim.currentSequence && (keyMapN.E[1] === true || keyMapN.E[2] === modifierInput)): 
        {
            // Go to the last character in the next word
            const numRepeats = parseInt(windowsVim.num) || 1;
            // We do some optimization here to make it faster
            for (let i = 0; i < numRepeats - 1; i++) {
                docs.pressKey(docs.codeFromKey("ArrowRight"), true);
            }

            docs.pressKey(docs.codeFromKey("ArrowRight"));
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowRight"), true);
            let [endXCoord, endYCoord] = docs.getCoords();
            if (startXCoord === endXCoord && startYCoord === endYCoord) {
                // End of file reached, do nothing
            } else {
                // Keep going like regular
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
            }

            windowsVim.clearData();
            return true;
        }
        case (keyMapN.endOfLine[0] === windowsVim.currentSequence && (keyMapN.endOfLine[1] === true || keyMapN.endOfLine[2] === modifierInput)): 
        {
            // Go to the end of the line
            this.moveToEndOfLine();

            windowsVim.clearData();
            return true;
        }
        case (keyMapN.w[0] === windowsVim.currentSequence && (keyMapN.w[1] === true || keyMapN.w[2] === modifierInput)): 
        case (keyMapN.W[0] === windowsVim.currentSequence && (keyMapN.W[1] === true || keyMapN.W[2] === modifierInput)): 
        {
            const numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("ArrowRight"), true);
            }
            windowsVim.clearData();
            return true;
        }
        case (keyMapN.x[0] === windowsVim.currentSequence && (keyMapN.x[1] === true || keyMapN.x[2] === modifierInput)): 
        case (keyMapN.s[0] === windowsVim.currentSequence && (keyMapN.s[1] === true || keyMapN.s[2] === modifierInput)): 
        {
            let shouldWeCut = keyMapN.x[4];
            if (keyMapN.s[0] === windowsVim.currentSequence && (keyMapN.s[1] === true || keyMapN.s[2] === modifierInput)) {
                shouldWeCut = keyMapN.s[4];
            }
            // Delete the current character (enter insert mode for "s")
            // "x" and "s" commands
            let numRepeats = parseInt(windowsVim.num) || 1;

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

            if (keyMapN.x[0] === windowsVim.currentSequence && (keyMapN.x[1] === true || keyMapN.x[2] === modifierInput)) {
                windowsVim.clearData();
            }
            else {
                // s
                windowsVim.currentSequence = "";
                windowsVim.num = "";
                windowsVim.switchToInsertMode();
            }

            return true;
        }
        case (keyMapN.deleteToEndOfLine[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLine[1] === true || keyMapN.deleteToEndOfLine[2] === modifierInput)): 
        case (keyMapN.deleteToEndOfLine2[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLine2[1] === true || keyMapN.deleteToEndOfLine2[2] === modifierInput)): 
        case (keyMapN.deleteToEndOfLineInsert[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLineInsert[1] === true || keyMapN.deleteToEndOfLineInsert[2] === modifierInput)): 
        case (keyMapN.deleteToEndOfLine2Insert[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLine2Insert[1] === true || keyMapN.deleteToEndOfLine2Insert[2] === modifierInput)): 
        {
            // Get the value for shouldWeCut
            let shouldWeCut;
            switch (true) {
                case (keyMapN.deleteToEndOfLine[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLine[1] === true || keyMapN.deleteToEndOfLine[2] === modifierInput)): 
                { shouldWeCut = keyMapN.deleteToEndOfLine[4]; break; }
                case (keyMapN.deleteToEndOfLine2[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLine2[1] === true || keyMapN.deleteToEndOfLine2[2] === modifierInput)): 
                { shouldWeCut = keyMapN.deleteToEndOfLine2[4]; break; }
                case (keyMapN.deleteToEndOfLineInsert[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLineInsert[1] === true || keyMapN.deleteToEndOfLineInsert[2] === modifierInput)): 
                { shouldWeCut = keyMapN.deleteToEndOfLineInsert[4]; break; }
                case (keyMapN.deleteToEndOfLine2Insert[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLine2Insert[1] === true || keyMapN.deleteToEndOfLine2Insert[2] === modifierInput)): 
                { shouldWeCut = keyMapN.deleteToEndOfLine2Insert[4]; break; }
            }

            // D, d$, C, c$ (delete to end of line)
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [middleXCoord, middleYCoord] = docs.getCoords();
            if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
                // We are at the end of the file already, do nothing
            } else if (startYCoord === middleYCoord) {
                // We're in the middle of a line
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
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
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));

                    // Highlight
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                    this.deleteOrCut(shouldWeCut);
                }
            }

            // Insert case
            if ((keyMapN.deleteToEndOfLineInsert[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLineInsert[1] === true || keyMapN.deleteToEndOfLineInsert[2] === modifierInput) || (
                keyMapN.deleteToEndOfLine2Insert[0] === windowsVim.currentSequence && (keyMapN.deleteToEndOfLine2Insert[1] === true || keyMapN.deleteToEndOfLine2Insert[2] === modifierInput)
            ))) 
            {
                windowsVim.num = "";
                windowsVim.currentSequence = "";
                windowsVim.switchToInsertMode();
                return true;
            }

            // Base case, stay in normal mode
            windowsVim.clearData();
            return true;
        }
        case (keyMapN.deleteToStartOfLine[0] === windowsVim.currentSequence && (keyMapN.deleteToStartOfLine[1] === true || keyMapN.deleteToStartOfLine[2] === modifierInput)): 
        case (keyMapN.deleteToStartOfLineInsert[0] === windowsVim.currentSequence && (keyMapN.deleteToStartOfLineInsert[1] === true || keyMapN.deleteToStartOfLineInsert[2] === modifierInput)): 
        {
            let shouldWeCut = keyMapN.deleteToStartOfLine[4];
            if (keyMapN.deleteToStartOfLineInsert[0] === windowsVim.currentSequence && (keyMapN.deleteToStartOfLineInsert[1] === true || keyMapN.deleteToStartOfLineInsert[2] === modifierInput)) {
                shouldWeCut = keyMapN.deleteToStartOfLineInsert[4];
            }

            // d0, c0 (delete to beginning of line)
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
            let [middleXCoord, middleYCoord] = docs.getCoords();
            if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
                // At start of file, do nothing
            } else if (startYCoord === middleYCoord) {
                // In the middle of a line
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                this.deleteOrCut(shouldWeCut);
            } else {
                // At the start of a line or multiline, figure out which one and then act accordingly
                let [tempXCoord, tempYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                let [finalXCoord, finalYCoord] = docs.getCoords();
                if (tempYCoord === finalYCoord && tempXCoord === finalXCoord) {
                    // The line above us was the start of the file on an empty line, so just go back (we only do
                    // one because the last ArrowLeft didn't do anything)
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                } else if (tempYCoord !== finalYCoord) {
                    // The line above us is empty, so just get back (we were at the start of a line)
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                } else {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                    let [finalXCoord, finalYCoord] = docs.getCoords();
                    if (
                        finalXCoord === startXCoord &&
                        finalYCoord === startYCoord
                    ) {
                        // We were at the start of a multiline, so delete
                        docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                        this.deleteOrCut(shouldWeCut);
                    } else {
                        // We are at the start of a line, so just go back
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                    }
                }
            }

            if (keyMapN.deleteToStartOfLineInsert[0] === windowsVim.currentSequence && (keyMapN.deleteToStartOfLineInsert[1] === true || keyMapN.deleteToStartOfLineInsert[2] === modifierInput)) {
                windowsVim.num = "";
                windowsVim.currentSequence = "";
                windowsVim.switchToInsertMode();
            } else {
                windowsVim.clearData();
            }

            return true;
        }
        case (keyMapN.dw[0] === windowsVim.currentSequence && (keyMapN.dw[1] === true || keyMapN.dw[2] === modifierInput)): 
        case (keyMapN.dW[0] === windowsVim.currentSequence && (keyMapN.dW[1] === true || keyMapN.dW[2] === modifierInput)): 
        {
            // "dw", "dW"
            // 2 potential choices/scenarios:

            // 1:
            // Determine if we are at the end of a line
            // If we are at the end of a line, delete one character (or none if we are on an empty line)

            // 2: 
            // If we are not at the end of a line, proceed normally (highlight to the right, then hit delete)
            // After: If we are not at the end of a line, arrow left back one to be on the right character

            let numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                // Step 1: Determining if we are the end of a line
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
                    // We are at the end of the file (and line subsequently)
                    // Just backspace
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }
                else if (initialYCoord !== middleYCoord) {
                    // We are at the end of a multiline or a line (we need to see which one)
                    // 1. Determine which one.
                    // 2. Then, take action
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
                        // We are at the end of a real line
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        let [afterBackspaceXCoord, afterBackspaceYCoord] = docs.getCoords();
                        if (afterBackspaceXCoord === endXCoord && afterBackspaceYCoord === endYCoord) {
                            // We hit backspace but didn't change position --> We are at the start of the file on an empty line then
                            // Let's move forward, and delete this empty line
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                            docs.pressKey(docs.codeFromKey("Backspace"));
                            // Now we actually deleted the empty line and are good to go
                        }
                        else if (afterBackspaceYCoord !== endYCoord) {
                            // We just deleted an empty line, so we need to move down one so our cursor is in the right position
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                        }
                    }
                    else {
                        // We are on a multiline (fake) line

                        // Get back to the original position
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));

                        // Highlight and delete
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }

                }
                else {
                    // We are in the middle of a line
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }
            }

            windowsVim.clearData();
            return true;
        }
        case (keyMapN.cw[0] === windowsVim.currentSequence && (keyMapN.cw[1] === true || keyMapN.cw[2] === modifierInput)): 
        case (keyMapN.cW[0] === windowsVim.currentSequence && (keyMapN.cW[1] === true || keyMapN.cW[2] === modifierInput)): 
        {
            // "cw", "cW"
            // Differences from "dw": 
            // When on an empty line: We don't delete that line
            // Ideally, we don't delete any whitespace
            let numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {

                let performMultilineOperation = false;
                // Step 1: Determining if we are the end of a line
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
                    // We are at the end of the file (and line subsequently)
                    // This means we should check first if the line is empty, and if it isn't, Backspace

                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endYCoord !== initialYCoord) {
                        // We went up a line, so we were on an empty line
                        // Move back and do nothing
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                    }
                    else {
                        // The line has stuff, so we can backspace after moving back to the original position
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                }
                else if (initialYCoord !== middleYCoord) {
                    // We are at the end of a multiline or a line (we need to see which one)
                    // 1. Determine which one.
                    // 2. Then, take action
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
                        // We are at the end of a real line
                        // Before we hit backspace, let's check that we don't delete an empty line

                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        let [afterLeftXCoord, afterLeftYCoord] = docs.getCoords();
                        if (afterLeftYCoord !== initialYCoord) {
                            // We went up a line, so we were on an empty line
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                        }
                        else if (afterLeftYCoord === initialYCoord && afterLeftXCoord === initialXCoord) {
                            // We are at the beginning of the file on an empty line, do nothing
                        }
                        else {
                            // We were on a non-empty line, delete
                            docs.pressKey(docs.codeFromKey("ArrowRight"));
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                    }
                    else {
                        // We are on a multiline (fake) line

                        // Get back to the original position
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));

                        // Highlight and delete
                        performMultilineOperation = true;
                    }

                }
                else {
                    // We are in the middle of a line
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    performMultilineOperation = true;
                }

                // docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                // docs.pressKey(docs.codeFromKey("Backspace"));

                if (performMultilineOperation) {
                    let [initialXPos, initialYPos] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [curXPos, curYPos] = docs.getCoords();

                    if (initialXPos === curXPos && initialYPos === curYPos) {
                        docs.pressKey(docs.codeFromKey("Delete"))
                    }
                    else {
                        while (curXPos !== initialXPos || curYPos !== initialYPos) {
                            if (curYPos < initialYPos) {
                                // In case of faultiness: This should never run but is a safeguard
                                break;
                            }
                            docs.pressKey(docs.codeFromKey("Backspace"));
                            [curXPos, curYPos] = docs.getCoords();
                        }
                    }
                }
            }

            windowsVim.clearData();
            windowsVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.deleteLine[0] === windowsVim.currentSequence && (keyMapN.deleteLine[1] === true || keyMapN.deleteLine[2] === modifierInput)):
        {
            let shouldWeCut = keyMapN.deleteLine[4];
            // !IMPORTANT: If we hit the bottom of the file for "dd", we effectively stop (we don't start deleting upwards)
            // Strategy:
            // 1. Move to the start of the line
            // 2. Count how many lines down we can delete
            // 4. Make sure we're in the right place
            // 5. Highlight up and delete
            // 6. Make sure we end at the right location and do some repositioning if need be
            this.moveToStartOfLine();
            const numRepeats = parseInt(windowsVim.num) || 1;
            let counter = numRepeats;
            let downCounter = 0;

            let endOfFile = false;
            while (counter > 0) {
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowDown"), true);
                let [endXCoord, endYCoord] = docs.getCoords();
                counter--;
                downCounter++;
                if (startXCoord === endXCoord && startYCoord === endYCoord) {
                    // We are at the end of the file on an empty line, so we can't go down anymore
                    endOfFile = true;
                    break;
                }
                else if (startYCoord === endYCoord) {
                    endOfFile = true;
                    break;
                }
            }

            if (endOfFile) {
                // We delete this enter with a backspace, but need it to properly cut the last line to the clipboard
                // Otherwise the clipboard won't have the "\n" at the end
                docs.pressKey(docs.codeFromKey("Enter"));
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

            windowsVim.clearData();
            return true;
        }
        case (keyMapN.deleteLineInsert[0] === windowsVim.currentSequence && (keyMapN.deleteLineInsert[1] === true || keyMapN.deleteLineInsert[2] === modifierInput)): 
        case (keyMapN.deleteLine2Insert[0] === windowsVim.currentSequence && (keyMapN.deleteLine2Insert[1] === true || keyMapN.deleteLine2Insert[2] === modifierInput)): 
        {
            let shouldWeCut = keyMapN.deleteLineInsert[4];
            if (keyMapN.deleteLine2Insert[0] === windowsVim.currentSequence && (keyMapN.deleteLine2Insert[1] === true || keyMapN.deleteLine2Insert[2] === modifierInput)) {
                shouldWeCut = keyMapN.deleteLine2Insert[4];
            }
            // Strategy:
            // 1. Get to start of line
            // 2. Highlight down as needed
            // 3. Copy, if required
            // 4. Shift + ArrowLeft once
            // 5. Backspace
            this.moveToStartOfLine();
            let numRepeats = parseInt(windowsVim.num) || 1;
            while (numRepeats > 0) {
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                numRepeats--;
            }
            if (shouldWeCut) {
                docs.contentDocument.execCommand("copy");
                setTimeout(() => {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                    if (docs.isTextSelected()) {
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                    // If we're trying to delete 1 empty line we're not really supposed to do anything actually then

                }, 1)
            }
            else {
                docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                if (docs.isTextSelected()) {
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }
                // If we're trying to delete 1 empty line we're not really supposed to do anything actually then
            }

            windowsVim.clearData();
            windowsVim.switchToInsertMode();
            return true;
        }
        case (keyMapN.deleteInnerWord[0] === windowsVim.currentSequence && (keyMapN.deleteInnerWord[1] === true || keyMapN.deleteInnerWord[2] === modifierInput)):
        case (keyMapN.deleteInnerWordInsert[0] === windowsVim.currentSequence && (keyMapN.deleteInnerWordInsert[1] === true || keyMapN.deleteInnerWordInsert[2] === modifierInput)):
        {
            // diw: delete a word, but don't delete any whitespace (and don't delete empty lines), tricky-tricky
            let numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                let atEndOfLine = false;
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
                    // At end of the file
                    atEndOfLine = true;
                }
                else if (initialYCoord === middleYCoord) {
                    // In the middle of a line
                    let [xCoord, yCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

                    // Delete and put the space
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                    let [newXCoord, newYCoord] = docs.getCoords();
                    if (xCoord === newXCoord && yCoord === newYCoord) {
                        // We are on a space potentially
                        let [xPos, yPos] = docs.getCoords();
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        let [newXPos, newYPos] = docs.getCoords();

                        if (xPos === newXPos && yPos === newYPos) {
                            // Do nothing
                        }
                        else if (yPos !== newYPos) {
                            // We were on the last character of a word or something (could also be a period or whatever),
                            // so we delete that completely using highlighting
                            docs.pressKey(docs.codeFromKey("ArrowLeft"));
                            docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        } 
                        else {
                            // We were actually on a space
                            docs.pressKey(docs.codeFromKey("ArrowLeft"));
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                    }
                    else {
                        docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                        docs.pressSpecialKey(" ");
                        docs.pressKey(docs.codeFromKey("ArrowLeft"))
                    }
                }
                else {
                    // We are at the end of a line or multiline
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
                        // At the end of a real line
                        atEndOfLine = true;
                    }
                    else {
                        // At the end of a multiline
                        // By definition, the thing we are on is a space (so we can just do a simple backspace to delete it)
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("Backspace"));
                    }
                }

                if (atEndOfLine) {
                    let [startXCoord, startYCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endYCoord !== startYCoord) {
                        // Empty line, do nothing
                        docs.pressKey(docs.codeFromKey("ArrowRight")); // Get back to where we were
                    }
                    else if (endYCoord === startYCoord && endXCoord === startXCoord) {
                        // Do nothing, we are the start of a file on an empty line

                    }
                    else {
                        docs.pressKey(docs.codeFromKey("ArrowRight")); // Get back to where we were

                        // Delete stuff at the end of the line 
                        docs.pressKey(docs.codeFromKey("x"));
                        docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                        docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                        if (docs.isTextSelected()) {
                            // No trailing space or period or anything to worry about
                            docs.pressKey(docs.codeFromKey("Z"), true); // Undo the "x" that we placed
                            docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                            docs.pressKey(docs.codeFromKey("Backspace"));
                        }
                        else {
                            // There is a trailing space or period
                            docs.pressKey(docs.codeFromKey("Z"), true); // Undo the "x" that we placed
                            docs.pressKey(docs.codeFromKey("Backspace")); // Now backspace to delete the space or whatever it is
                        }
                    }
                }
            }

            if (keyMapN.deleteInnerWordInsert[0] === windowsVim.currentSequence && (keyMapN.deleteInnerWordInsert[1] === true || keyMapN.deleteInnerWordInsert[2] === modifierInput)) {
                windowsVim.currentSequence = "";
                windowsVim.num = "";
                windowsVim.switchToInsertMode();
            }
            else {
                windowsVim.clearData();
            }
            return true;
        }
        case (keyMapN.deleteWord[0] === windowsVim.currentSequence && (keyMapN.deleteWord[1] === true || keyMapN.deleteWord[2] === modifierInput)): 
        case (keyMapN.deleteWordInsert[0] === windowsVim.currentSequence && (keyMapN.deleteWordInsert[1] === true || keyMapN.deleteWordInsert[2] === modifierInput)): 
        {
            // daw, caw (delete the current word we're on, whitespace also gets deleted)
            let numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                let atEndOfLine = false;
                let [initialXCoord, initialYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                let [middleXCoord, middleYCoord] = docs.getCoords();
                if (initialXCoord === middleXCoord && initialYCoord === middleYCoord) {
                    // At end of the file
                    atEndOfLine = true;
                }
                else if (initialYCoord === middleYCoord) {
                    // In the middle of a line
                    let [xCoord, yCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft")); // Get back to where we were

                    // Delete and put the space
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                    let [newXCoord, newYCoord] = docs.getCoords();
                    if (xCoord === newXCoord && yCoord === newYCoord) {
                        // On a space potentially
                        let [xPos, yPos] = docs.getCoords();
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        let [newXPos, newYPos] = docs.getCoords();
                        
                        if (xPos === newXPos && yPos === newYPos) {
                            // Do nothing
                        }
                        else if (yPos !== newYPos) {
                            // We were on the last character of a word or something, so delete it
                            docs.pressKey(docs.codeFromKey("ArrowLeft"));
                            atEndOfLine = true;

                        }
                        else {
                            docs.pressKey(docs.codeFromKey("ArrowLeft")); // Reverse our last ArrowRight


                            // We are on a space, we have to delete the space, the word, and end up in the right position at the end
                            docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                            docs.pressKey(docs.codeFromKey("Backspace"));
                            docs.pressKey(docs.codeFromKey("ArrowLeft"));
                        }
                    }
                    else {
                        docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                        docs.pressKey(docs.codeFromKey("Backspace"))
                    }
                }
                else {
                    // We are at the end of a line or multiline
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true);
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endXCoord === initialXCoord && endYCoord === initialYCoord) {
                        // At the end of a real line
                        atEndOfLine = true;
                    }
                    else {
                        // At the end of a multiline
                        // By definition, the thing we are on is a space (so we can just do a simple backspace to delete it)
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                        docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                        docs.pressKey(docs.codeFromKey("Backspace"));
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    }
                }

                if (atEndOfLine) {
                    let [startXCoord, startYCoord] = docs.getCoords();
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    let [endXCoord, endYCoord] = docs.getCoords();
                    if (endYCoord !== startYCoord) {
                        // Empty line, delete it and make sure our cursor is on the next line down
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
                        docs.pressKey(docs.codeFromKey("x"));
                        docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                        docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                        if (docs.isTextSelected()) {
                            // No trailing space or period or anything to worry about
                            docs.pressKey(docs.codeFromKey("Z"), true); // Undo the "x" that we placed
                            docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                            docs.pressKey(docs.codeFromKey("Backspace"));

                            let [startPosXCoord, startPosYCoord] = docs.getCoords();
                            docs.pressKey(docs.codeFromKey("Backspace"));
                            let [endPosXCoord, endPosYCoord] = docs.getCoords();
                            if (startPosYCoord !== endPosYCoord) {
                                docs.pressKey(docs.codeFromKey("Z"), true);
                                docs.pressKey(docs.codeFromKey("Backspace"));
                            }
                        }
                        else {
                            // There is a trailing space or period
                            docs.pressKey(docs.codeFromKey("Z"), true); // Undo the "x" that we placed
                            docs.pressKey(docs.codeFromKey("Backspace")); // Now backspace to delete the space or whatever it is
                        }
                    }
                }
            }

            if (keyMapN.deleteWordInsert[0] === windowsVim.currentSequence && (keyMapN.deleteWordInsert[1] === true || keyMapN.deleteWordInsert[2] === modifierInput)) {
                windowsVim.currentSequence = "";
                windowsVim.num = "";
                windowsVim.switchToInsertMode();
            }
            else {
                windowsVim.clearData();
            }
            return true;
        }
        case (keyMapN.copyToEndOfLine[0] === windowsVim.currentSequence && (keyMapN.copyToEndOfLine[1] === true || keyMapN.copyToEndOfLine[2] === modifierInput)): 
        {
            // y$ (copy to the end of the line)
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowRight"));
            let [middleXCoord, middleYCoord] = docs.getCoords();
            if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
                // We are at the end of the file already, good to go
                navigator.clipboard.writeText("");
            } else if (startYCoord === middleYCoord) {
                // We're in the middle of a line
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
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
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));

                    // Copy
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                    docs.contentDocument.execCommand("copy");

                    // Put cursor back at original position
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
            }

            windowsVim.clearData();
            return true;
        }
        case (keyMapN.copyToStartOfLine[0] === windowsVim.currentSequence && (keyMapN.copyToStartOfLine[1] === true || keyMapN.copyToStartOfLine[2] === modifierInput)): 
        {
            // y0 (copy to the start of the line)
            // Technically windowsVim will move up a line if you're at the start already, but that seems ugly, so we'll implement it
            // slightly different on purpose.
            let [startXCoord, startYCoord] = docs.getCoords();
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
            let [middleXCoord, middleYCoord] = docs.getCoords();
            if (startXCoord === middleXCoord && startYCoord === middleYCoord) {
                // At start of file, do nothing
                navigator.clipboard.writeText("");
            } else if (startYCoord === middleYCoord) {
                // In the middle of a line
                docs.pressKey(docs.codeFromKey("ArrowRight"));
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                docs.contentDocument.execCommand("copy");
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
            } else {
                // At the start of a line or multiline, figure out which one and then act accordingly
                let [tempXCoord, tempYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                let [finalXCoord, finalYCoord] = docs.getCoords();
                if (tempYCoord === finalYCoord && tempXCoord === finalXCoord) {
                    // The line above us was the start of the file on an empty line, so just go back (we only do
                    // one because the last ArrowLeft didn't do anything)
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    navigator.clipboard.writeText("");
                } else if (tempYCoord !== finalYCoord) {
                    // The line above us is empty, so just get back (we were at the start of a line)
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    navigator.clipboard.writeText("");
                } else {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true);
                    let [finalXCoord, finalYCoord] = docs.getCoords();
                    if (
                        finalXCoord === startXCoord &&
                        finalYCoord === startYCoord
                    ) {
                        // We were at the start of a multiline, so copy
                        docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                        docs.contentDocument.execCommand("copy");
                        docs.pressKey(docs.codeFromKey("ArrowLeft"));
                    } else {
                        // We are at the start of a line, so just go back
                        docs.pressKey(docs.codeFromKey("ArrowRight"));
                        navigator.clipboard.writeText("");
                    }
                }
            }

            windowsVim.clearData();
            return true;
        }
        case (keyMapN.copyWholeLine[0] === windowsVim.currentSequence && (keyMapN.copyWholeLine[1] === true || keyMapN.copyWholeLine[2] === modifierInput)): 
        case (keyMapN.copyWholeLine2[0] === windowsVim.currentSequence && (keyMapN.copyWholeLine2[1] === true || keyMapN.copyWholeLine2[2] === modifierInput)): 
        {
            // yy or Y (copy the whole line)
            let numRepeats = parseInt(windowsVim.num) || 1;

            let [startXCoord, startYCoord] = docs.getCoords();

            this.moveToStartOfLine();

            // Highlight what we're going to copy
            while (numRepeats > 0) {
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                numRepeats -= 1;
            }

            // Copy the text
            docs.contentDocument.execCommand("copy");
            docs.pressKey(docs.codeFromKey("ArrowLeft"));

            // Move back to our original position
            docs.moveToCoords(startXCoord, startYCoord);
            windowsVim.clearData();
            return true;
        }
        case (keyMapN.u[0] === windowsVim.currentSequence && (keyMapN.u[1] === true || keyMapN.u[2] === modifierInput)): 
        case (keyMapN.U[0] === windowsVim.currentSequence && (keyMapN.U[1] === true || keyMapN.U[2] === modifierInput)): 
        {
            const numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("Z"), true);
            }
            windowsVim.clearData();
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
        windowsVim.currentSequence.length !== 0 &&
        !keyMap.incompleteKeyMapN.includes(windowsVim.currentSequence) && !keyMap.incompleteKeyMapNative.includes(windowsVim.currentSequence)
    ) {
        // This means that the current sequence is invalid, so we have to reset it
        windowsVim.clearData();
        return true;
    }

    UI.updateUISequenceText(windowsVim.num + getCleanedSequence(windowsVim.currentSequence));
    docs.setCursorWidth(this.mode);
    return true;
};

windowsVim.visual_keydown = function (e) {
    if (e.key.match(/F\d+/)) {
        // Pass through any function keys.
        return true;
    }

    if (windowsVim.isChromeShortcut(e)) {
        return true;
    }

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

    // Past this point we add the key to the sequence, and then go checking if it matches any of the commands in our switch statement
    // If it doesn't, after the switch statement we see if we are building up to a command or not

    if (windowsVim.currentSequence.length === 0) {
        windowsVim.currentSequence = e.key;
    }
    else {
        windowsVim.currentSequence += KEY_SEPARATOR + e.key;
    }

    // Bit mask of what modifier keys are pressed
    const modifierInput = getModifierInput(e);
    const keyMapV = keyMap.keyMapV;

    if (this.nativeKeyCheck(modifierInput)) {
        windowsVim.clearData();
        return true;
    }

    switch (true) {
        case (keyMapV["0"][0] === this.currentSequence && (keyMapV["0"][1] === true || keyMapV["0"][2] === modifierInput)):
            {
                let regexNumMatch = /\d/;
                if (regexNumMatch.test(this.currentSequence) && windowsVim.num !== "") {
                    // If we are typing a number, we don't want to execute this command actually, but instead just keep typing our number
                    break;
                }

                docs.pressKey(docs.codeFromKey("Home"), false, true);
                docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                this.clearData();
                UI.updateUISequenceText(windowsVim.num + getCleanedSequence(windowsVim.currentSequence));
                docs.setCursorWidth(this.mode);
                return true;

            }
        case (keyMapV.arrowLeft[0] === windowsVim.currentSequence && (keyMapV.arrowLeft[1] === true || keyMapV.arrowLeft[2] === modifierInput)):
        case (keyMapV.backspace[0] === windowsVim.currentSequence && (keyMapV.backspace[1] === true || keyMapV.backspace[2] === modifierInput)):
        case (keyMapV.h[0] === windowsVim.currentSequence && (keyMapV.h[1] === true || keyMapV.h[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.arrowRight[0] === windowsVim.currentSequence && (keyMapV.arrowRight[1] === true || keyMapV.arrowRight[2] === modifierInput)):
        case (keyMapV.l[0] === windowsVim.currentSequence && (keyMapV.l[1] === true || keyMapV.l[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.arrowUp[0] === windowsVim.currentSequence && (keyMapV.arrowUp[1] === true || keyMapV.arrowUp[2] === modifierInput)):
        case (keyMapV.k[0] === windowsVim.currentSequence && (keyMapV.k[1] === true || keyMapV.k[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), false, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.arrowDown[0] === windowsVim.currentSequence && (keyMapV.arrowDown[1] === true || keyMapV.arrowDown[2] === modifierInput)):
        case (keyMapV.j[0] === windowsVim.currentSequence && (keyMapV.j[1] === true || keyMapV.j[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), false, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.B[0] === windowsVim.currentSequence && (keyMapV.B[1] === true || keyMapV.B[2] === modifierInput)):
        case (keyMapV.b[0] === windowsVim.currentSequence && (keyMapV.b[1] === true || keyMapV.b[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.gg[0] === windowsVim.currentSequence && (keyMapV.gg[1] === true || keyMapV.gg[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("Home"), true, true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.G[0] === windowsVim.currentSequence && (keyMapV.G[1] === true || keyMapV.G[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("End"), true, true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapV["{"][0] === windowsVim.currentSequence && (keyMapV["{"][1] === true || keyMapV["{"][2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV["}"][0] === windowsVim.currentSequence && (keyMapV["}"][1] === true || keyMapV["}"][2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.e[0] === windowsVim.currentSequence && (keyMapV.e[1] === true || keyMapV.e[2] === modifierInput)):
        case (keyMapV.E[0] === windowsVim.currentSequence && (keyMapV.E[1] === true || keyMapV.E[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.escape[0] === windowsVim.currentSequence && (keyMapV.escape[1] === true || keyMapV.escape[2] === modifierInput)):
        case (keyMapV.ctrlC[0] === windowsVim.currentSequence && (keyMapV.ctrlC[1] === true || keyMapV.ctrlC[2] === modifierInput)):
            {
                // Escape visual mode.
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                // go to the right side when the left side could be a solution as well
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.u[0] === windowsVim.currentSequence && (keyMapV.u[1] === true || keyMapV.u[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.lowercase);
                this.clearData();
                return true;
            }
        case (keyMapV.U[0] === windowsVim.currentSequence && (keyMapV.U[1] === true || keyMapV.U[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.uppercase);
                this.clearData();
                return true;
            }
        case (keyMapV.redo[0] === windowsVim.currentSequence && (keyMapV.redo[1] === true || keyMapV.redo[2] === modifierInput)):
            {
                // Escape visual mode
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                // go to the right side when the left side could be a solution as well
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.slashSearch[0] === windowsVim.currentSequence && (keyMapV.slashSearch[1] === true || keyMapV.slashSearch[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("f"), true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.paste[0] === windowsVim.currentSequence && (keyMapV.paste[1] === true || keyMapV.paste[2] === modifierInput)):
        case (keyMapV.pasteBeforeCursor[0] === windowsVim.currentSequence && (keyMapV.pasteBeforeCursor[1] === true || keyMapV.pasteBeforeCursor[2] === modifierInput)):
            {
                // Paste
                docs.pressKey(docs.codeFromKey("Backspace"));

                setTimeout(() => {
                    docs.pasteRegular();
                }, 1)
                this.clearData();
                this.switchToNormalMode();
                return true;
            }
        case (keyMapV.pasteNoFormatting[0] === windowsVim.currentSequence && (keyMapV.pasteNoFormatting[1] === true || keyMapV.pasteNoFormatting[2] === modifierInput)):
        case (keyMapV.pasteBeforeCursorNoFormatting[0] === windowsVim.currentSequence && (keyMapV.pasteBeforeCursorNoFormatting[1] === true || keyMapV.pasteBeforeCursorNoFormatting[2] === modifierInput)):
            {
                // We have to first delete the highlighted text, then paste in the clipboard
                docs.pressKey(docs.codeFromKey("Backspace"));
                this.moveRightToPasteAfterCursor();
                docs.pastePlainText();

                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.insertStartOfHighlight[0] === windowsVim.currentSequence && (keyMapV.insertStartOfHighlight[1] === true || keyMapV.insertStartOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapV.exitVisualMode[0] === windowsVim.currentSequence && (keyMapV.exitVisualMode[1] === true || keyMapV.exitVisualMode[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.exitToVisualLineMode[0] === this.currentSequence && (keyMapV.exitToVisualLineMode[1] === true || keyMapV.exitToVisualLineMode[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                windowsVim.clearData();
                windowsVim.switchToVisualLineMode();
                return true;
            }
        case (keyMapV.appendEndOfHighlight[0] === windowsVim.currentSequence && (keyMapV.appendEndOfHighlight[1] === true || keyMapV.appendEndOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowRight"));

                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapV.highlightToEndOfLine[0] === windowsVim.currentSequence && (keyMapV.highlightToEndOfLine[1] === true || keyMapV.highlightToEndOfLine[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                docs.pressKey(docs.codeFromKey("ArrowLeft"), false, true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.x[0] === windowsVim.currentSequence && (keyMapV.x[1] === true || keyMapV.x[2] === modifierInput)):
            {
                let shouldWeCut = keyMapV.x[4];
                this.deleteOrCut(shouldWeCut);
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.d[0] === windowsVim.currentSequence && (keyMapV.d[1] === true || keyMapV.d[2] === modifierInput)):
            {
                let shouldWeCut = keyMapV.d[4];
                this.deleteOrCut(shouldWeCut);
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.c[0] === windowsVim.currentSequence && (keyMapV.c[1] === true || keyMapV.c[2] === modifierInput)):
            {
                let shouldWeCut = keyMapV.c[4];
                this.deleteOrCut(shouldWeCut);
                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapV.D[0] === windowsVim.currentSequence && (keyMapV.D[1] === true || keyMapV.D[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("Backspace"));
                windowsVim.moveToEndOfLine();
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                let [midXCoord, midYCoord] = docs.getCoords();
                if (startXCoord === midXCoord && startYCoord === midYCoord) {
                    // At the start of the file
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("Backspace"));
                } else if (startYCoord === midYCoord) {
                    // In the middle of a line or something
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                    docs.pressKey(docs.codeFromKey("Backspace"));
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("Backspace"));
                } else {
                    // We are on an empty line
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("Backspace"));
                }

                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.C[0] === windowsVim.currentSequence && (keyMapV.C[1] === true || keyMapV.C[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("Backspace"));
                windowsVim.moveToEndOfLine();
                let [startXCoord, startYCoord] = docs.getCoords();
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                let [midXCoord, midYCoord] = docs.getCoords();
                if (startXCoord === midXCoord && startYCoord === midYCoord) {
                    // Do nothing
                } else if (startYCoord === midYCoord) {
                    // In the middle of a line or something
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                    docs.pressKey(docs.codeFromKey("Backspace"));
                } else {
                    // We are on an empty line
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }
                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapV.y[0] === windowsVim.currentSequence && (keyMapV.y[1] === true || keyMapV.y[2] === modifierInput)):
            {
                docs.contentDocument.execCommand("copy");
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapV.arrowLeftCtrl[0] === windowsVim.currentSequence && (keyMapV.arrowLeftCtrl[1] === true || keyMapV.arrowLeftCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowLeft"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.arrowRightCtrl[0] === windowsVim.currentSequence && (keyMapV.arrowRightCtrl[1] === true || keyMapV.arrowRightCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.arrowDownCtrl[0] === windowsVim.currentSequence && (keyMapV.arrowDownCtrl[1] === true || keyMapV.arrowDownCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.arrowUpCtrl[0] === windowsVim.currentSequence && (keyMapV.arrowUpCtrl[1] === true || keyMapV.arrowUpCtrl[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.ctrlDPageDown[0] === windowsVim.currentSequence && (keyMapV.ctrlDPageDown[1] === true || keyMapV.ctrlDPageDown[2] === modifierInput)):
            {
                // Ctrl-d is page-down
                docs.pressKey(docs.codeFromKey("PageDown"), false, true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.ctrlUPageUp[0] === windowsVim.currentSequence && (keyMapV.ctrlUPageUp[1] === true || keyMapV.ctrlUPageUp[2] === modifierInput)):
            {
                // Ctrl-u is page-up
                docs.pressKey(docs.codeFromKey("PageUp"), false, true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapV.w[0] === windowsVim.currentSequence && (keyMapV.w[1] === true || keyMapV.w[2] === modifierInput)):
        case (keyMapV.W[0] === windowsVim.currentSequence && (keyMapV.W[1] === true || keyMapV.W[2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowRight"), true, true);
                    docs.pressKey(docs.codeFromKey("ArrowRight"), false, true);
                }
                windowsVim.clearData();
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
        windowsVim.currentSequence.length !== 0 &&
        !keyMap.incompleteKeyMapV.includes(windowsVim.currentSequence) && !keyMap.incompleteKeyMapNative.includes(windowsVim.currentSequence)
    ) {
        // This means that the current sequence is invalid, so we have to reset it
        windowsVim.num = "";
        windowsVim.currentSequence = "";
    }

    UI.updateUISequenceText(windowsVim.num + getCleanedSequence(windowsVim.currentSequence));
    return true;

}

windowsVim.visual_line_keydown = function (e) {
    if (e.key.match(/F\d+/)) {
        // Pass through any function keys.
        return true;
    }

    if (windowsVim.isChromeShortcut(e)) {
        return true;
    }

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

    // Past this point we add the key to the sequence, and then go checking if it matches any of the commands in our switch statement
    // If it doesn't, after the switch statement we see if we are building up to a command or not

    if (windowsVim.currentSequence.length === 0) {
        windowsVim.currentSequence = e.key;
    }
    else {
        windowsVim.currentSequence += KEY_SEPARATOR + e.key;
    }

    // Bit mask of what modifier keys are pressed
    const modifierInput = getModifierInput(e);
    const keyMapVLine = keyMap.keyMapVLine;

    if (this.nativeKeyCheck(modifierInput)) {
        windowsVim.clearData();
        return true;
    }

    switch (true) {
        case (keyMapVLine.arrowUp[0] === windowsVim.currentSequence && (keyMapVLine.arrowUp[1] === true || keyMapVLine.arrowUp[2] === modifierInput)): 
        case (keyMapVLine.arrowUpCtrl[0] === windowsVim.currentSequence && (keyMapVLine.arrowUpCtrl[1] === true || keyMapVLine.arrowUpCtrl[2] === modifierInput)): 
        case (keyMapVLine.k[0] === windowsVim.currentSequence && (keyMapVLine.k[1] === true || keyMapVLine.k[2] === modifierInput)): 
        {
            const numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
            }
            windowsVim.clearData();
            return true;
        }
        case (keyMapVLine.arrowDown[0] === windowsVim.currentSequence && (keyMapVLine.arrowDown[1] === true || keyMapVLine.arrowDown[2] === modifierInput)): 
        case (keyMapVLine.arrowDownCtrl[0] === windowsVim.currentSequence && (keyMapVLine.arrowDownCtrl[1] === true || keyMapVLine.arrowDownCtrl[2] === modifierInput)): 
        case (keyMapVLine.j[0] === windowsVim.currentSequence && (keyMapVLine.j[1] === true || keyMapVLine.j[2] === modifierInput)): 
        {
            const numRepeats = parseInt(windowsVim.num) || 1;
            for (let i = 0; i < numRepeats; i++) {
                docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
            }
            windowsVim.clearData();
            return true;
        }
        case (keyMapVLine.ctrlDPageDown[0] === windowsVim.currentSequence && (keyMapVLine.ctrlDPageDown[1] === true || keyMapVLine.ctrlDPageDown[2] === modifierInput)): 
        {
            // Ctrl-d is page-down, so move down and then ensure we are still line-based
			docs.pressKey(docs.codeFromKey("PageDown"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
            windowsVim.clearData();
            return true;
        }
        case (keyMapVLine.ctrlUPageUp[0] === windowsVim.currentSequence && (keyMapVLine.ctrlUPageUp[1] === true || keyMapVLine.ctrlUPageUp[2] === modifierInput)): 
        {
            // Ctrl-u is page-up, so move up and then ensure we are still line-based
			docs.pressKey(docs.codeFromKey("PageUp"), false, true);
			docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
            windowsVim.clearData();
            return true;
        }
        case (keyMapVLine.gg[0] === windowsVim.currentSequence && (keyMapVLine.gg[1] === true || keyMapVLine.gg[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("Home"), true, true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapVLine.G[0] === windowsVim.currentSequence && (keyMapVLine.G[1] === true || keyMapVLine.G[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("End"), true, true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapVLine["{"][0] === windowsVim.currentSequence && (keyMapVLine["{"][1] === true || keyMapVLine["{"][2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapVLine["}"][0] === windowsVim.currentSequence && (keyMapVLine["}"][1] === true || keyMapVLine["}"][2] === modifierInput)):
            {
                const numRepeats = parseInt(windowsVim.num) || 1;
                for (let i = 0; i < numRepeats; i++) {
                    docs.pressKey(docs.codeFromKey("ArrowDown"), true, true);
                }
                windowsVim.clearData();
                return true;
            }
        case (keyMapVLine.escape[0] === windowsVim.currentSequence && (keyMapVLine.escape[1] === true || keyMapVLine.escape[2] === modifierInput)):
        case (keyMapVLine.ctrlC[0] === windowsVim.currentSequence && (keyMapVLine.ctrlC[1] === true || keyMapVLine.ctrlC[2] === modifierInput)):
        case (keyMapVLine.exitVisualLineMode[0] === windowsVim.currentSequence && (keyMapVLine.exitVisualLineMode[1] === true || keyMapVLine.exitVisualLineMode[2] === modifierInput)):
            {
                // Escape visual mode.
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                // go to the right side when the left side could be a solution as well
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.u[0] === windowsVim.currentSequence && (keyMapVLine.u[1] === true || keyMapVLine.u[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.lowercase);
                this.clearData();
                return true;
            }
        case (keyMapVLine.U[0] === windowsVim.currentSequence && (keyMapVLine.U[1] === true || keyMapVLine.U[2] === modifierInput)):
            {
                docs.clickButton(docs.toolbarMenuButtonOptions.uppercase);
                this.clearData();
                return true;
            }
        case (keyMapVLine.redo[0] === windowsVim.currentSequence && (keyMapVLine.redo[1] === true || keyMapVLine.redo[2] === modifierInput)):
            {
                // Escape visual mode
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                // go to the right side when the left side could be a solution as well
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.slashSearch[0] === windowsVim.currentSequence && (keyMapVLine.slashSearch[1] === true || keyMapVLine.slashSearch[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("f"), true);
                windowsVim.clearData();
                return true;
            }
        case (keyMapVLine.paste[0] === windowsVim.currentSequence && (keyMapVLine.paste[1] === true || keyMapVLine.paste[2] === modifierInput)):
        case (keyMapVLine.pasteBeforeCursor[0] === windowsVim.currentSequence && (keyMapVLine.pasteBeforeCursor[1] === true || keyMapVLine.pasteBeforeCursor[2] === modifierInput)):
            {
                // Paste
                docs.pressKey(docs.codeFromKey("Backspace"));

                setTimeout(() => {
                    docs.pasteRegular();
                }, 1)
                this.clearData();
                this.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.pasteNoFormatting[0] === windowsVim.currentSequence && (keyMapVLine.pasteNoFormatting[1] === true || keyMapVLine.pasteNoFormatting[2] === modifierInput)):
        case (keyMapVLine.pasteBeforeCursorNoFormatting[0] === windowsVim.currentSequence && (keyMapVLine.pasteBeforeCursorNoFormatting[1] === true || keyMapVLine.pasteBeforeCursorNoFormatting[2] === modifierInput)):
            {
                // We have to first delete the highlighted text, then paste in the clipboard
                docs.pressKey(docs.codeFromKey("Backspace"));
                docs.pastePlainText();

                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.insertStartOfHighlight[0] === windowsVim.currentSequence && (keyMapVLine.insertStartOfHighlight[1] === true || keyMapVLine.insertStartOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapVLine.exitToVisualMode[0] === windowsVim.currentSequence && (keyMapVLine.exitToVisualMode[1] === true || keyMapVLine.exitToVisualMode[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowRight")); // TODO: Make this better, right now we blindly
                windowsVim.clearData();
                windowsVim.switchToVisualMode();
                return true;
            }
        case (keyMapVLine.appendEndOfHighlight[0] === windowsVim.currentSequence && (keyMapVLine.appendEndOfHighlight[1] === true || keyMapVLine.appendEndOfHighlight[2] === modifierInput)):
            {
                docs.pressKey(docs.codeFromKey("ArrowRight"));

                // TODO: Remove eventually
                let cursorLocations = docs.getCursorLocations();
                if (!cursorLocations[3]) {
                    // If we're not at the end of a file, move left
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }

                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapVLine.x[0] === windowsVim.currentSequence && (keyMapVLine.x[1] === true || keyMapVLine.x[2] === modifierInput)):
            {
                let shouldWeCut = keyMapVLine.x[4];
                this.deleteOrCut(shouldWeCut);
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.d[0] === windowsVim.currentSequence && (keyMapVLine.d[1] === true || keyMapVLine.d[2] === modifierInput)):
        case (keyMapVLine.D[0] === windowsVim.currentSequence && (keyMapVLine.D[1] === true || keyMapVLine.D[2] === modifierInput)):
            {
                let shouldWeCut = keyMapVLine.d[4];
                if (keyMapVLine.D[0] === windowsVim.currentSequence && (keyMapVLine.D[1] === true || keyMapVLine.D[2] === modifierInput)) {
                    shouldWeCut = keyMapVLine.D[4];
                }
                this.deleteOrCut(shouldWeCut);
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
                return true;
            }
        case (keyMapVLine.c[0] === windowsVim.currentSequence && (keyMapVLine.c[1] === true || keyMapVLine.c[2] === modifierInput)):
        case (keyMapVLine.C[0] === windowsVim.currentSequence && (keyMapVLine.C[1] === true || keyMapVLine.C[2] === modifierInput)):
            {
                let shouldWeCut = keyMapVLine.c[4];
                if (keyMapVLine.C[0] === windowsVim.currentSequence && (keyMapVLine.C[1] === true || keyMapVLine.C[2] === modifierInput)) {
                    shouldWeCut = keyMapVLine.C[4];
                }
                this.deleteOrCut(shouldWeCut);
                windowsVim.clearData();
                windowsVim.switchToInsertMode();
                return true;
            }
        case (keyMapVLine.y[0] === windowsVim.currentSequence && (keyMapVLine.y[1] === true || keyMapVLine.y[2] === modifierInput)):
            {
                docs.contentDocument.execCommand("copy");
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                windowsVim.clearData();
                windowsVim.switchToNormalMode();
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

    // Check if it's a number
    if (e.key.match(/\d+/) && this.currentSequence.length === 1) {
        // We have a number
        this.currentSequence = "";
        if (this.num.length < 3) {
            this.num += e.key
        }
    }

    // Check if we are building up to a command or if the sequence is invalid
    if (
        windowsVim.currentSequence.length !== 0 &&
        !keyMap.incompleteKeyMapVLine.includes(windowsVim.currentSequence) && !keyMap.incompleteKeyMapNative.includes(windowsVim.currentSequence)
    ) {
        // This means that the current sequence is invalid, so we have to reset it
        windowsVim.num = "";
        windowsVim.currentSequence = "";
    }

    UI.updateUISequenceText(windowsVim.num + getCleanedSequence(windowsVim.currentSequence));
    return true;


}

windowsVim.insert_keydown = function (e) {
    const modifierInput = getModifierInput(e);
    const keyMapI = keyMap.keyMapI;
	// Check if current key is part of a key map
	switch (true) {
        case (keyMapI.escape[0] === e.key && (keyMapI.escape[1] === true || keyMapI.escape[2] === modifierInput)):
        case (keyMapI.ctrlC[0] === e.key && (keyMapI.ctrlC[1] === true || keyMapI.ctrlC[2] === modifierInput)):
		{
			e.preventDefault();
    		e.stopPropagation();
			windowsVim.switchToNormalMode();
			return true;
		}
	}

	// If nothing in the switch statement runs, then we just let the key pass through
};

windowsVim.replace_keydown = function (e) {
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
        case (keyMapR.escape[0] === e.key && (keyMapR.escape[1] === true || keyMapR.escape[2] === modifierInput)):
        case (keyMapR.ctrlC[0] === e.key && (keyMapR.ctrlC[1] === true || keyMapR.ctrlC[2] === modifierInput)):
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
            // Backspace should undo what we have done, character by character
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
            // Delete the character
            docs.pressKey(docs.codeFromKey("Backspace"));
            // Now we're in the right place
            this.replaceModeUndoCounterStack.push(2);
        }
    }

}

export { windowsVim };
