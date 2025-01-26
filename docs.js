// docs is the class for interacting with Google Docs. It contains functions that abstract stuff away for us in other
// parts of the code. For example, checking if we have text highlighted, pressing a button, pressing a key, etc.
import {retry} from "./main.js";

let docs = {};

const MAC_PLATFORMS = ["MacIntel", "MacPPC", "Mac68K", "iPhone", "iPad"]; // Really only just "MacIntel"

docs.isMac = MAC_PLATFORMS.includes(navigator.platform)

docs.setUp = function () {
    docs.contentDocument = document.querySelector(
        ".docs-texteventtarget-iframe"
    ).contentDocument;

    // This is very important, and is the place where we direct all of our key events
    docs.texttarget = docs.contentDocument.querySelector(
        '[contenteditable="true"]'
    );

    docs.texttarget.addEventListener("keydown", docs.keydown_);

    // Used when we're deleting/undoing or stuff and need to add a placeholder to the document that we will then delete
    docs.placeHolderKey = "_";  // Can't be a special character/key

    docs.userCursor = document.querySelector(".kix-cursor");
    docs.cursorCaret = document.querySelector(".kix-cursor-caret");

    docs.fontSizeInput = document.querySelector(
        '.jfk-textinput.goog-toolbar-combo-button-input[aria-label="Font size"]'
    );

    docs.formatTextMenuLoaded = false;
    docs.capitalizationMenuLoaded = false;
    docs.paragraphStylesMenuLoaded = false;

    docs.pasteInstalled = true;

    // This determines whether we can use the "Paste" button in the toolbar or just plain text paste for all pastes
    chrome.storage.sync.get("togglePasteMode", function(result) {
        if (result.togglePasteMode === "false") {
            docs.pasteInstalled = false;
        }
    });

    // This determines whether we ensure that line numbers are on whenever we go in the doc
    chrome.storage.sync.get("toggleLineNumbers", function(result) {
        if (result.toggleLineNumbers === "true") {
            // Give a little bit of time to load it in
            setTimeout(() => {
                docs._activateLineNumbers();
            }, 30); // Works with 1ms actually
        }
    });

}

// Function keys (F1-F32), modifier keys (Ctrl, Alt, Shift, Meta), and "Escape" are not included
// Intended for keybindings where we input a key to add to the screen or something (like with "r" or "f", etc)
docs.passThroughKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown", "Insert", "NumLock", "ScrollLock", "AudioVolumeMute", "AudioVolumeUp", "AudioVolumeDown", "MediaTrackNext", "MediaTrackPrevious", "MediaStop", "MediaPlayPause", "Pause", "Select", "Dead", "LaunchMail", "KanjiMode"]);

// Helper method to translate keys (including a few special/command keys) to
// keyCodes for use with docs.pressKey(keyCode, ...).
if (!docs.isMac) {
    docs.codeFromKey = function (key) {
        const specialKeys = {
            Backspace: 8,
            Tab: 9,
            Enter: 13,
            Shift: 16,
            Control: 17,
            Escape: 27,
            End: 35,
            Home: 36,
            ArrowLeft: 37,
            ArrowUp: 38,
            ArrowRight: 39,
            ArrowDown: 40,
            Delete: 46,
            Z: 90,
            PageUp: 33,
            PageDown: 34,
            f: 70,
            F: 70,
        };
        if (key in specialKeys) {
            return specialKeys[key];
        }
        return key.charCodeAt(key);
    };
} else {
    docs.codeFromKey = function (key) {
        const specialKeys = {
            Backspace: 8,
            Tab: 9,
            Enter: 13,
            Shift: 16,
            Control: 18, // Critical
            Escape: 27,
            End: 35,
            Home: 36,
            ArrowLeft: 37,
            ArrowUp: 38,
            ArrowRight: 39,
            ArrowDown: 40,
            Delete: 46,
            Z: 90,
            PageUp: 33,
            PageDown: 34,
            f: 70,
            F: 70,
        };
        if (key in specialKeys) {
            return specialKeys[key];
        }
        return key.charCodeAt(key);
    };
}

docs.keydown_ = function (e) {
    if (e.docs_plus_ || !docs.keydown) {
        return;
    }
    return docs.keydown(e);
};

// Simulate a key press.
// keyCode, ctrlKey (or altKey on Mac), shiftKey, commandKey(Mac only)
docs.pressKey = function (keyCode, ctrlKey, shiftKey) {
    let is_command = keyCode <= 46 || ctrlKey;

    let data;
    if (!docs.isMac) {
        data = {keyCode: keyCode, ctrlKey: ctrlKey, shiftKey: shiftKey};
    } else {
        data = {keyCode: keyCode, altKey: ctrlKey, shiftKey: shiftKey};

        // Now we have to check for Mac-Specific modifications that may need to be done
        if (keyCode === docs.codeFromKey("Z") && ctrlKey === true) {
            // Undo
            data = {keyCode: keyCode, metaKey: true};
        } else if (keyCode === docs.codeFromKey("Home") && ctrlKey === true) {
            // Home  (to go up)
            data = {
                keyCode: docs.codeFromKey("ArrowUp"),
                shiftKey: shiftKey,
                metaKey: true,
            };
        } else if (keyCode === docs.codeFromKey("End") && ctrlKey === true) {
            // End (to go down)
            data = {
                keyCode: docs.codeFromKey("ArrowDown"),
                shiftKey: shiftKey,
                metaKey: true,
            };
        } else if (keyCode === docs.codeFromKey("Y") && ctrlKey === true) {
            data = {
                keyCode: keyCode,
                metaKey: true
            }
        } else if (keyCode === docs.codeFromKey("f") && ctrlKey === true) {
            // Works for both "F" and "f" since they both have same keycode
            data = {
                keyCode: keyCode,
                metaKey: true
            }
        }
    }

    let key_event;
    if (is_command) {
        key_event = new KeyboardEvent("keydown", data);
    } else {
        key_event = new KeyboardEvent("keypress", data);
    }
    key_event.docs_plus_ = true;

    docs.contentDocument.dispatchEvent(key_event);
};


docs.pressSpecialKey = function (key) {
    let data = {key: key};
    let isCommand = false;
    switch (key) {
        case "$":
            data.keyCode = 36;
            data.shiftKey = true;
            data.code = "Digit4";
            break;
        case " ":
            data.keyCode = 32;
            data.code = "Space";
            break;
        case "Tab":
            data.keyCode = 9;
            data.code = "Tab";
            isCommand = true;
            break;
        case "#":
            data.keyCode = 35;
            data.shiftKey = true;
            data.code = "Digit3";
            break;
        case "%":
            data.keyCode = 37;
            data.shiftKey = true;
            data.code = "Digit5";
            break;
        case "&":
            data.keyCode = 38;
            data.shiftKey = true;
            data.code = "Digit7";
            break;
        case "*":
            data.keyCode = 42;
            data.shiftKey = true;
            data.code = "Digit8";
            break;
        case "(":
            data.keyCode = 40;
            data.shiftKey = true;
            data.code = "Digit9";
            break;
        case ")":
            data.keyCode = 41;
            data.shiftKey = true;
            data.code = "Digit0";
            break;
        case "+":
            data.keyCode = 43;
            data.shiftKey = true;
            data.code = "Equal";
            break;
        case "-":
            data.keyCode = 45;
            data.code = "Minus";
            break;
        case "!":
            data.keyCode = 33;
            data.shiftKey = true;
            data.code = "Digit1";
            break;
        case ",":
            data.keyCode = 44;
            data.code = "Comma";
            break;
        case ".":
            data.keyCode = 46;
            data.code = "Period";
            break;
        case "'":
            data.keyCode = 39;
            data.code = "Quote";
            break;
        case "\"":
            data.keyCode = 34;
            data.shiftKey = true;
            data.code = "Quote";
            break;
    }

    let key_event;
    if (!isCommand) {
        key_event = new KeyboardEvent("keypress", data);
    } else {
        key_event = new KeyboardEvent("keydown", data);
    }
    key_event.docs_plus_ = true;

    docs.contentDocument.dispatchEvent(key_event);
}

// Sets the width of the user's insertion point marker. @width should be a
// width value compatible with CSS border-width: @width;
docs.setCursorWidth = function (modeType) {
    // Possible inputs are "normal", "visual", "visual_line", "insert"
    if (modeType === "normal") {
        // The cursor width will be 41.5% the size of the cursor
        let cursorWidth = parseFloat(
            docs.cursorCaret.style.height.slice(0, -2) * 0.416
        );
        docs.cursorCaret.style.borderWidth = cursorWidth + "px";
    }
    else {
        // The cursor is regularly styled (for insert mode, visual, visual line modes)
        docs.cursorCaret.style.borderWidth = "2px";
    }
};


// Get the current font size (where the cursor is)
docs.getFontSize = function () {
    return docs.fontSizeInput.value;
};

// Returns an array of booleans representing the cursor's location [atStartOfLine, atEndOfLine, atStartOfFile, atEndOfFile]
// The point of coupling so many functions together is to reduce the number of times we have to move the cursor
// This function moves the cursor 3 times
// atStartofLine and atEndofLine include multi line statements and will return "true" for them too
// Additionally, once you have highlighted text, this function is completely inaccurate and useless
docs.getCursorLocations = function () {
    let result = [false, false, false, false];
    let initialCoords = docs.userCursor.style.transform;
    let initialXIndex = initialCoords.indexOf("px");
    let initialYCoord = initialCoords.slice(
        initialXIndex + 4,
        initialCoords.length - 3
    );
    docs.pressKey(docs.codeFromKey("ArrowLeft"));
    let newCoords = docs.userCursor.style.transform;
    let newXIndex = newCoords.indexOf("px");
    let newYCoord = newCoords.slice(newXIndex + 4, newCoords.length - 3);
    if (initialCoords === newCoords) {
        // We are the start of the file since going left did nothing
        // This also means we shouldn't ArrowRight, since our ArrowLeft didn't do anything
        result[2] = true;
        result[0] = true;
    } else if (initialYCoord !== newYCoord) {
        // We are at the start of a line since our Y (height), changed
        result[0] = true;
        docs.pressKey(docs.codeFromKey("ArrowRight"));
    } else {
        docs.pressKey(docs.codeFromKey("ArrowRight"));
    }

    // Now we need to check end of line/end of file
    docs.pressKey(docs.codeFromKey("ArrowRight"));
    newCoords = docs.userCursor.style.transform;
    newXIndex = newCoords.indexOf("px");
    newYCoord = newCoords.slice(newXIndex + 4, newCoords.length - 3);

    if (initialCoords === newCoords) {
        // We are at the end of the file since going right did nothing
        // This also means we shouldn't ArrowLeft, since our ArrowRight didn't do anything
        result[3] = true;
        result[1] = true;
    } else if (newYCoord !== initialYCoord) {
        // We are at the end of a line since our Y (height), changed
        result[1] = true;
        docs.pressKey(docs.codeFromKey("ArrowLeft"));
    } else {
        docs.pressKey(docs.codeFromKey("ArrowLeft"));
    }

    return result;
};

// Get the y coordinate of the cursor
docs.getYCoord = function () {
    let coords = docs.userCursor.style.transform;
    let xIndex = coords.indexOf("px");
    let yCoord = coords.slice(xIndex + 4, coords.length - 3);
    return parseInt(yCoord);
}

// Get the x and y coordinates of the cursor
docs.getCoords = function () {
    let coords = docs.userCursor.style.transform;
    let xIndex = coords.indexOf("px");
    let xCoord = coords.slice(10, xIndex);
    let yCoord = coords.slice(xIndex + 4, coords.length - 3);
    return [parseInt(xCoord), parseInt(yCoord)];
}

docs.isTextSelected = function () {
    if (docs.isMac) { // Mac Version
        return docs.contentDocument.getSelection(0).getRangeAt(0).startOffset === 0
    }
    // Windows version
    return docs.contentDocument.getSelection(0).getRangeAt(0).endOffset !== 0;

    // Old Code:
    // let cursorDisplay = docs.userCursor.style.display;
    // if (cursorDisplay === "none") {
    //     return true;
    // }
    // return false;

}

docs.lastPasteTime = Date.now();

// The paste functions:
// - pastePlainText() --> No args
// - pasteRegular() --> No args
//
// - pasteNoFormatting(moveLineFunc, moveRightToPasteAfterCursor)
// - paste(moveLineFunc, moveRightToPasteAfterCursor)
//
// - pasteBeforeCursor(moveLineFunc)
// - pasteBeforeCursorNoFormatting(moveLineFunc)

docs.paste = async function (moveToEndOfLineFunc, moveRightToPasteAfterCursor) {
    let text = await navigator.clipboard.readText();
    let containsNewLine = false;
    if (text.indexOf("\n") !== -1) {
        containsNewLine = true;
    }

    // Pasting line(s) (contains new line)
    if (containsNewLine) {
        // 225ms --> Very rarely breaks
        // 175ms --> Breaks frequently
        if (Date.now() - docs.lastPasteTime < 225) {
            // We have pasted too recently, and pasting again will break stuff
            return;
        }
        docs.lastPasteTime = Date.now();

        moveToEndOfLineFunc();
        docs.pressKey(docs.codeFromKey("Enter"));

        setTimeout(() => {
            docs.pasteRegular();

            setTimeout(() => {
                docs.pressKey(docs.codeFromKey("Backspace"));
            }, 10)
        }, 10)

    }

    // Pasting inline (no new line)
    else {
        moveRightToPasteAfterCursor();
        setTimeout(() => {
            docs.pasteRegular();
        }, 1)
    }
}

docs.pasteNoFormatting = async function (moveToEndOfLineFunc, moveRightToPasteAfterCursor) {
    let text = await navigator.clipboard.readText();
    let containsNewLine = false;
    if (text.indexOf("\n") !== -1) {
        containsNewLine = true;
    }

    // Pasting line(s) (contains new line)
    if (containsNewLine) {
        // 225ms --> Very rarely breaks
        // 175ms --> Breaks frequently
        if (Date.now() - docs.lastPasteTime < 50) {
            // We have pasted too recently, and pasting again will break stuff
            return;
        }
        docs.lastPasteTime = Date.now();

        moveToEndOfLineFunc();
        docs.pressKey(docs.codeFromKey("Enter"));

        setTimeout(() => {
            docs.pastePlainText();

            setTimeout(() => {
                docs.pressKey(docs.codeFromKey("Backspace"));
            }, 10)
        }, 10)

    }

    // Pasting inline (no new line)
    else {
        moveRightToPasteAfterCursor();
        setTimeout(() => {
            docs.pastePlainText();
        }, 1)
    }
}

docs.pasteBeforeCursor = async function (moveToStartOfLineFunc) {
    let text = await navigator.clipboard.readText();
    let containsNewLine = false;
    if (text.indexOf("\n") !== -1) {
        containsNewLine = true;
    }

    // Pasting line(s) (contains new line)
    if (containsNewLine) {
        // 225ms --> Very rarely breaks
        // 175ms --> Breaks frequently
        if (Date.now() - docs.lastPasteTime < 225) {
            // We have pasted too recently, and pasting again will break stuff
            return;
        }
        docs.lastPasteTime = Date.now();

        moveToStartOfLineFunc();
        docs.pasteRegular();
    }

    // Pasting inline (no new line)
    else {
        setTimeout(() => {
            docs.pasteRegular();
        }, 1)
    }
}

docs.pasteBeforeCursorNoFormatting = async function (moveToStartOfLineFunc) {
    let text = await navigator.clipboard.readText();
    let containsNewLine = false;
    if (text.indexOf("\n") !== -1) {
        containsNewLine = true;
    }

    // Pasting line(s) (contains new line)
    if (containsNewLine) {
        // 225ms --> Very rarely breaks
        // 175ms --> Breaks frequently
        if (Date.now() - docs.lastPasteTime < 50) {
            // We have pasted too recently, and pasting again will break stuff
            return;
        }
        docs.lastPasteTime = Date.now();

        moveToStartOfLineFunc();
        docs.pastePlainText();
    }

    // Pasting inline (no new line)
    else {
        docs.pastePlainText();
    }
}

// Paste with formatting if possible, or just paste plain text then
docs.pasteRegular = function () {
    if (docs.pasteInstalled) {
        docs.clickButton(docs.toolbarMenuButtonOptions.paste);
    }
    else {
        docs.pastePlainText();
    }
}

// Pastes plain text into the document using the navigator.clipboard API
docs.pastePlainText = async function () {
    let data = new DataTransfer();
    data.setData("text/plain", await navigator.clipboard.readText());
    let paste = new ClipboardEvent("paste", {
        clipboardData: data,
        dataType: "text",
    });
    paste.docs_plus_ = true;

    docs.texttarget.dispatchEvent(paste);
};


docs._clickMainToolBarButton = function (buttonID) {
    let buttonElem = document.getElementById(buttonID);
    docs._simulateClick(buttonElem, true);
};

docs._clickTextFormatButton = function (spanAriaLabel) {
    if (!docs.formatTextMenuLoaded) {
        let formatButton = document.getElementById("docs-format-menu");
        docs._simulateClick(formatButton);
        let textButton = document.querySelector(".goog-menuitem-label[aria-label='Text s']").parentElement.parentElement;
        docs._simulateClick(textButton);

        docs.formatTextMenuLoaded = true;
    }

    let buttonElem;

    retry(() => {
        buttonElem = document.querySelector(
            `.goog-menuitem-label[aria-label="${spanAriaLabel}"]`
        );
        if (buttonElem === null) {
            throw Error(`Could not find button with aria-label ${spanAriaLabel}`);
        }
    }, {retries: 200, retryIntervalMs: 10}).then(() => {
        docs._simulateClick(buttonElem);
    });

}

docs._clickCapitalizationButton = async function (spanAriaLabel) {
    if (!docs.capitalizationMenuLoaded) {
        let formatButton = document.getElementById("docs-format-menu");
        docs._simulateClick(formatButton);
        let textButton = document.querySelector(".goog-menuitem-label[aria-label='Text s']").parentElement.parentElement;
        docs._simulateClick(textButton);

        docs.capitalizationMenuLoaded = true;

        let capitalizationButton;
        await retry(() => {
            capitalizationButton = document.querySelector(".goog-menuitem-label[aria-label='Capitalization 1']").parentElement.parentElement;
            if (capitalizationButton === null) {
                throw Error(`Could not find button with aria-label ${spanAriaLabel}`);
            }
        }, {retries: 200, retryIntervalMs: 10});

        docs._simulateClick(capitalizationButton);
    }

    let buttonElem;
    await retry(() => {
        buttonElem = document.querySelector(`.goog-menuitem-label[aria-label='${spanAriaLabel}']`).parentElement.parentElement;
        if (buttonElem === null) {
            throw Error(`Could not find button with aria-label ${spanAriaLabel}`);
        }
    }, {retries: 200, retryIntervalMs: 10});

    docs._simulateClick(buttonElem);
}

docs._clickParagraphStylesButton = async function (elementIndex) {
    // Open the menu
    let headingStyleSelectButton = document.getElementById("headingStyleSelect")
    docs._simulateClick(headingStyleSelectButton, true);

    // Click the specific style we want in the menu, note: elems is of length 9 (0-8)
    let elems = document.querySelectorAll('div.goog-menuitem.goog-option.goog-submenu.docs-submenuitem.apps-menuitem[role="menuitemradio"]');
    for (let i = 0; i < elems.length; i++) {
        if (i === elementIndex) {
            let elem = elems[i];
            docs._simulateClick(elem);
            break;
        }
    }

}

docs._clickEditButton = function (ariaLabel) {
    docs.__clickButtonFromAriaLabel(ariaLabel);
}

docs.__clickButtonFromAriaLabel = function (ariaLabel) {
    let buttonElem = document.querySelector(
        `.goog-menuitem-label[aria-label="${ariaLabel}"]`
    ).parentElement.parentElement;
    docs._simulateClick(buttonElem);
}

docs._clickFileButton = function (ariaLabel) {
    docs.__clickButtonFromAriaLabel(ariaLabel);
}

docs._clickVersionHistoryButton = async function (ariaLabel) {
    let fileButtonElem = document.getElementById("docs-file-menu");
    docs._simulateClick(fileButtonElem);

    let versionHistoryElem = document.querySelector(`.goog-menuitem-label[aria-label="Version history h"]`).parentElement.parentElement;
    docs._simulateClick(versionHistoryElem);

    let buttonElem;
    await retry(() => {
        buttonElem = document.querySelector(
            `.goog-menuitem-label[aria-label="${ariaLabel}"]`
        ).parentElement.parentElement;
    }, {retries: 200, retryIntervalMs: 10});
    docs._simulateClick(buttonElem);
}

docs._clickInsertButton = function (ariaLabel) {
    docs.__clickButtonFromAriaLabel(ariaLabel);
}

docs._clickPageBreakButton = async function (ariaLabel) {
    let insertButtonElem = document.getElementById("docs-insert-menu");
    docs._simulateClick(insertButtonElem);

    let pageBreakMenuButton = document.querySelector(`.goog-menuitem-label[aria-label="Break k"]`).parentElement.parentElement;
    docs._simulateClick(pageBreakMenuButton);

    let buttonElem;
    await retry(() => {
        buttonElem = document.querySelector(
            `.goog-menuitem-label[aria-label="${ariaLabel}"]`
        ).parentElement.parentElement;
    }, {retries: 200, retryIntervalMs: 10});

    docs._simulateClick(buttonElem);
}

docs.reactivateAfterPopupButton = function () {
    // We must detect when the menu is exited out of, and then click the "Bold" button twice
    // This is hacky, but it works. Otherwise, our event handlers for keydown events are not active for some reason.
    // We're basically refocusing the document so the event handlers are live again (Even though .hasfocus() returns true for some reason)
    let waitingForMenuClose = setInterval(() => {
        // This element is hidden when the word count menu is open, so we'll detect when we close the word count menu
        // By seeing when this element is not hidden anymore
        let element = document.querySelector('meta[itemprop="faviconUrl"]');
        let elementHidden = element.getAttribute("aria-hidden");

        if (elementHidden === null) {
            // Element is not hidden anymore
            clearInterval(waitingForMenuClose); // Clear the interval we're in right now

            // We click on buttons to "refocus/reactive" the document (and make sure clicking the buttons doesn't
            // actually do anything)
            let fontSizeDecrement = document.getElementById("fontSizeDecrement");
            let fontSizeIncrement = document.getElementById("fontSizeIncrement");

            if (fontSizeDecrement.parentElement.classList.contains("goog-toolbar-horizontal")) {
                // We can't increase/decrease font size quickly because the window is too small and it's not on the
                // toolbar, let's just hide/un-hide the menu (slightly visible to end user, but it's okay)
                let toggleMenu = document.getElementById("viewModeButton");
                docs._simulateClick(toggleMenu, true);
                docs._simulateClick(toggleMenu, true);
            }
            else {
                // Base case, just increase/decrease font size (user doesn't even see it)
                docs._simulateClick(fontSizeDecrement, true);
                docs._simulateClick(fontSizeIncrement, true);
            }
        }

    }, 10)
}

// Execute a command that opens a popup menu, which requires us to "reactivate" our event listeners afterwards (for
// some reason)
docs._clickPopupButton = function (ariaLabel) {
    // Click whichever button we are trying to click
    docs.__clickButtonFromAriaLabel(ariaLabel, true);
    docs.reactivateAfterPopupButton();
}

docs._clickToolsButton = function (ariaLabel) {
    docs.__clickButtonFromAriaLabel(ariaLabel);
}

docs._clickHelpButton = function (ariaLabel) {
    docs.__clickButtonFromAriaLabel(ariaLabel);
}


docs._simulateClick = function (el, mouseout= false) {
    let x = 0;
    let y = 0;
    let eventSequence;

    if (mouseout) {
        eventSequence = ["mouseover", "mousedown", "mouseup", "click", "mouseout"];
    }
    else {
        eventSequence = ["mouseover", "mousedown", "mouseup", "click"];
    }

    for (const eventName of eventSequence) {
        const event = document.createEvent("MouseEvents");
        event.initMouseEvent(
            eventName,
            true, // bubbles
            true, // cancelable
            window, //view
            1, // event-detail
            x, // screenX
            y, // screenY
            x, // clientX
            y, // clientY
            false, // ctrl
            false, // alt
            false, // shift
            false, // meta
            0, // button
            null, // relatedTarget
        );
        el.dispatchEvent(event);
    }
}

docs.clickButton = function (buttonOption) {
    buttonOption[1](buttonOption[0]);
}

docs._activateLineNumbers = function() {
    // First we must click the button in the toolbar menu
    docs._clickToolsButton("Line numbers f1");

    // Next we must get the checkbox (first get the parent)
    let checkBoxElem = document.querySelector(".kix-linenumbers-checkbox-container").firstChild.firstChild;
    // Check whether the checkbox is checked or not
    let checked = checkBoxElem.getAttribute("aria-checked");

    // If line numbers are not on, activate them
    if (checked === "false") {
        docs._simulateClick(checkBoxElem);
    }

    // Now we must close the window
    let closeButton = document.querySelector("div.docs-material[aria-label='Close line numbers sidebar']");
    docs._simulateClick(closeButton);

}

docs._handleAfterSearchCapital = function (coords, searchLineOption) {
    // For F and T commands

    // Now we either have highlighted a character (that may or may not be on the line we want), or we have not
    let checkCounter = 0;
    let checkingForHighlightedText = setInterval(() => {
        if (checkCounter > 150) {
            // We have waited for 1500 ms, and still have not found any highlighted text
            // This likely means the key we were searching for was not found (so just do nothing and stay where we are)
            clearInterval(checkingForHighlightedText);
        }
        else if (docs.isTextSelected()) {
            clearInterval(checkingForHighlightedText);
            docs.pressKey(docs.codeFromKey("ArrowLeft"));

            // Now we are cooking and must handle the stuff

            let belowTheTopBoundary = false;
            let aboveTheBottomBoundary = false;
            let [curXCoord, curYCoord] = docs.getCoords();

            // Check the top boundary (that we're below it)
            if (curYCoord > coords.lineStartYCoord || (curYCoord === coords.lineStartYCoord && curXCoord >= coords.lineStartXCoord)) {
                belowTheTopBoundary = true;
            }

            // Check the bottom boundary (that we're above it)
            if (curYCoord < coords.yCoord || (curYCoord === coords.yCoord && curXCoord <= coords.xCoord)) {
                aboveTheBottomBoundary = true;
            }

            if (belowTheTopBoundary && aboveTheBottomBoundary) {
                // The character is in bounds

                if (searchLineOption === docs.searchLineOptions.T) {
                    // We must be on the character before the one we want for "T" command
                    docs.pressKey(docs.codeFromKey("ArrowRight"));
                }

            }
            else {
                // We must move back to the original position because the character was out of bounds
                this.moveToCoords(coords.xCoord, coords.yCoord);
            }

        }
        else {
            checkCounter++;
        }
    }, 10)
}

docs._handleAfterSearch = function (coords, searchLineOption) {
    // Now we either have highlighted a character (that may or may not be on the line we want), or we have not
    let checkCounter = 0;
    let checkingForHighlightedText = setInterval(() => {
        if (checkCounter > 150) {
            // We have waited for 1500 ms, and still have not found any highlighted text
            // This likely means the key we were searching for was not found (so just do nothing and stay where we are)
            clearInterval(checkingForHighlightedText);
        }
        else if (docs.isTextSelected()) {
            clearInterval(checkingForHighlightedText);
            docs.pressKey(docs.codeFromKey("ArrowLeft"));

            // Now we are cooking and must handle the stuff

            let belowTheTopBoundary = false;
            let aboveTheBottomBoundary = false;
            let [curXCoord, curYCoord] = docs.getCoords();

            // Check the top boundary (that we're below it)
            if (curYCoord > coords.yCoord || (curYCoord === coords.yCoord && curXCoord >= coords.xCoord)) {
                belowTheTopBoundary = true;
            }
            // Check the bottom boundary (that we're above it)
            if (curYCoord < coords.lineEndYCoord || (curYCoord === coords.lineEndYCoord && curXCoord <= coords.lineEndXCoord)) {
                aboveTheBottomBoundary = true;
            }

            if (belowTheTopBoundary && aboveTheBottomBoundary) {
                // The character is in bounds

                if (searchLineOption === docs.searchLineOptions.t) {
                    // We must be on the character before the one we want for "t" command
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }

            }
            else {
                // We must move back to the original position because the character was out of bounds
                this.moveToCoords(coords.xCoord, coords.yCoord);
            }

        }
        else {
            checkCounter++;
        }
    }, 10)

}

docs.searchLineOptions = {
    f: "f",
    t: "t",
    F: "F",
    T: "T",
}

docs.inputIntoSearchBox = function (text, coords, searchLineOption) {
    let findBox = document.getElementById("docs-findandreplacedialog-input");
    if (findBox === null) {
        // The find box is not loaded in yet, so we're actually good to go and there are no edge cases whatsoever
        docs.clickButton(docs.toolbarMenuButtonOptions.findAndReplace);

        document.querySelector(".modal-dialog.docs-dialog.docs-findandreplacedialog").style.display = "none";

        let findBox = document.getElementById("docs-findandreplacedialog-input");
        findBox.value = text;

        let matchCaseCheckbox = document.getElementById("docs-findandreplacedialog-match-case");

        let checkedOriginallyStr = matchCaseCheckbox.getAttribute("aria-checked");
        let checkedOriginally = checkedOriginallyStr === "true";

        if (!checkedOriginally) {
            // If match case is not checked we must check it
            docs._simulateClick(matchCaseCheckbox, true);
        }

        if (searchLineOption === docs.searchLineOptions.T || searchLineOption === docs.searchLineOptions.F) {
            // We must go backwards
            let previousButton = document.getElementById("docs-findandreplacedialog-button-previous");
            docs._simulateClick(previousButton, true);
        }

        let exitSpan = document.querySelector(".modal-dialog-title-close");
        docs._simulateClick(exitSpan, true);

        if (searchLineOption === docs.searchLineOptions.T || searchLineOption === docs.searchLineOptions.F) {
            docs._handleAfterSearchCapital(coords, searchLineOption);
        }
        else {
            docs._handleAfterSearch(coords, searchLineOption);
        }
        return;
    }

    // Beyond this point means the find box has already been loaded in, and may have some stuff in it already (edge
    // case), so we must check for that

    if (findBox.value !== "") {
        findBox.value = "";
    }

    // Open the search box and add our stuff to it
    docs.clickButton(docs.toolbarMenuButtonOptions.findAndReplace);

    document.querySelector(".modal-dialog.docs-dialog.docs-findandreplacedialog").style.display = "none";

    findBox.value = text;

    let matchCaseCheckbox = document.getElementById("docs-findandreplacedialog-match-case");

    let checkedOriginallyStr = matchCaseCheckbox.getAttribute("aria-checked");
    let checkedOriginally = checkedOriginallyStr === "true";

    if (!checkedOriginally) {
        // If match case is not checked we must check it
        docs._simulateClick(matchCaseCheckbox, true);
    }

    let previousButton = document.getElementById("docs-findandreplacedialog-button-previous");

    // These 3 lines below are critical to get the search to register properly, otherwise it's possible
    // that nothing will happen or the old search will have been executed after we exit the search box
    let ignoreLatin = document.getElementById("docs-findandreplacedialog-ignore-diacritics");
    docs._simulateClick(ignoreLatin, true);
    docs._simulateClick(ignoreLatin, true);
    docs._simulateClick(previousButton, true);

    if (searchLineOption === docs.searchLineOptions.T || searchLineOption === docs.searchLineOptions.F) {
        docs._simulateClick(previousButton, true);
    }

    // Exit the search box
    let exitSpan = document.querySelector(".modal-dialog-title-close");
    docs._simulateClick(exitSpan, true);

    if (searchLineOption === docs.searchLineOptions.T || searchLineOption === docs.searchLineOptions.F) {
        docs._handleAfterSearchCapital(coords, searchLineOption);
    }
    else {
        docs._handleAfterSearch(coords, searchLineOption);
    }
}

docs.toolbarMenuButtonOptions = {
    bold: ["boldButton", docs._clickMainToolBarButton],
    italic: ["italicButton", docs._clickMainToolBarButton],
    underline: ["underlineButton", docs._clickMainToolBarButton],
    link: ["insertLinkButton", docs._clickMainToolBarButton],
    comment: ["insertCommentButton", docs._clickMainToolBarButton],
    checkList: ["addChecklistButton", docs._clickMainToolBarButton],
    bulletedList: ["addBulletButton", docs._clickMainToolBarButton],
    numberedList: ["addNumberedBulletButton", docs._clickMainToolBarButton],
    outdent: ["outdentButton", docs._clickMainToolBarButton],
    undoButton: ["undoButton", docs._clickMainToolBarButton],
    indent: ["indentButton", docs._clickMainToolBarButton],
    alignLeft: ["alignLeftButton", docs._clickMainToolBarButton],
    alignCenter: ["alignCenterButton", docs._clickMainToolBarButton],
    alignRight: ["alignRightButton", docs._clickMainToolBarButton],
    alignJustify: ["alignJustifyButton", docs._clickMainToolBarButton],
    increaseFontSize: ["fontSizeIncrement", docs._clickMainToolBarButton],
    decreaseFontSize: ["fontSizeDecrement", docs._clickMainToolBarButton],
    // print: ["printButton", docs._clickMainToolBarButton],
    spellingAndGrammarCheck: ["spellGrammarCheckButton", docs._clickMainToolBarButton],
    clearFormatting: ["clearFormattingButton", docs._clickMainToolBarButton],
    hideTheMenus: ["viewModeButton", docs._clickMainToolBarButton],
    normalText: [0, docs._clickParagraphStylesButton],
    // title: [1, docs._clickParagraphStylesButton],
    // subtitle: [2, docs._clickParagraphStylesButton],
    heading1: [3, docs._clickParagraphStylesButton],
    heading2: [4, docs._clickParagraphStylesButton],
    heading3: [5, docs._clickParagraphStylesButton],
    heading4: [6, docs._clickParagraphStylesButton],
    heading5: [7, docs._clickParagraphStylesButton],
    heading6: [8, docs._clickParagraphStylesButton],
    strikethrough: ["Strikethrough k", docs._clickTextFormatButton],
    superscript: ["Superscript s", docs._clickTextFormatButton],
    subscript: ["Subscript r", docs._clickTextFormatButton],
    uppercase: ["UPPERCASE u", docs._clickCapitalizationButton],
    lowercase: ["lowercase l", docs._clickCapitalizationButton],
    selectAll: ["Select all a", docs._clickEditButton],
    open: ["Open o", docs._clickFileButton],
    seeVersionHistory: ["See version history s", docs._clickVersionHistoryButton],
    findAndReplace: ["Find and replace f", docs._clickPopupButton],
    footNote: ["Footnote n", docs._clickInsertButton],
    pageBreak: ["Page break p", docs._clickPageBreakButton],
    wordCount: ["Word count w", docs._clickPopupButton],
    explore: ["Explore r", docs._clickToolsButton],
    dictionary: ["Dictionary d", docs._clickToolsButton],
    voiceTyping: ["Voice typing v", docs._clickToolsButton],
    searchTheMenus: ["Search the menus m", docs._clickHelpButton], // Clicking via main toolbar doesn't work
    cut: ["Cut t", docs._clickEditButton], // Cut button
    paste: ["Paste p", docs._clickEditButton], // Paste button
    // "Paste without formatting o" is the identifier for the other paste button
};

docs.moveToCoords = function(xCoord, yCoord) {
    let [newXCoord, newYCoord] = docs.getCoords();

    let startTime = Date.now();
    while (newXCoord !== xCoord || newYCoord !== yCoord) {
        let curTime = Date.now();

        if (curTime - startTime > 1500) {
            // This is a safeguard to prevent freezing. If traversing back takes more than 1500 milliseconds,
            // (1.5 seconds), we break out
            break;
        }
        if (newYCoord < yCoord) {
            docs.pressKey(docs.codeFromKey("ArrowDown"));
        }
        else if (newYCoord > yCoord) {
            docs.pressKey(docs.codeFromKey("ArrowUp"));
        }
        else if (newXCoord < xCoord) {
            docs.pressKey(docs.codeFromKey("ArrowRight"));
        }
        else if (newXCoord > xCoord) {
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
        [newXCoord, newYCoord] = docs.getCoords();
    }
}

docs._getLineHeight = function () {
    let lineHeight = 1;
    // Parent element is the container/parent-div for the line height menu options
    let parentElem = document.querySelectorAll("span[aria-label='1.15 1']")[0].parentElement.parentElement.parentElement;
    for (let i = 0; i < parentElem.children.length; i++) {
        // Loop through each child and find the one that is selected (the actual line height we are using)
        let child = parentElem.children[i];
        if (child.classList.contains("goog-option-selected") && child.role === "menuitemradio") {
            // We have found the selected line height child

            // Now let's get the span element that contains the actual line height as an aria-label property
            let label = child.children[0].children[1].getAttribute("aria-label");
            // We are going to parse the label to get the line height (default is 1 if none of these hit, also
            // we don't need to check for the "1" label then since it's the default)
            if (label === "1.15 1") {
                lineHeight = 1.15;
            }
            else if (label === "1.5 5") {
                lineHeight = 1.5;
            }
            else if (label === "Double d") {
                lineHeight = 2;
            }
            else if (label.charAt(0) === "C") {
                // Custom
                lineHeight = parseFloat(label.slice(8, label.length - 1));
            }
        }
    }

    let cursorHeight = Math.round(parseFloat(docs.cursorCaret.style.height.slice(0, -2)));
    return lineHeight * cursorHeight;
}

docs.scrollSoCursorIsTop = function () {
    // We will scroll and leave 2 lines above where the cursor
    let scrollElem = document.querySelector(".kix-appview-editor");
    // Our height to scroll to as the cursor's y coordinate means scroll to the cursor
    let heightToScrollTo = docs.getYCoord();
    let lineHeight = docs._getLineHeight()

    // To leave 2 lines above us, we will need to calculate the width of 2 lines in pixels.
    // This is done by taking the cursor height, multiplying it by the line formatting height, and then multiplying by 2
    let linesToLeaveAbove = 2;

    // Now we can add 2 lines of space above our cursor
    heightToScrollTo -= lineHeight * linesToLeaveAbove;

    // Finally scroll
    scrollElem.scrollTo(0, heightToScrollTo);
}

docs.scrollSoCursorIsCenter = function () {
    let scrollElem = document.querySelector(".kix-appview-editor");
    let heightToScrollTo = docs.getYCoord();
    let cursorHeight = Math.round(parseFloat(docs.cursorCaret.style.height.slice(0, -2)));

    let topBar = document.getElementById("docs-bars");
    if (topBar.offsetHeight > 70) {
        heightToScrollTo -= Math.round((window.innerHeight - 105 - cursorHeight) / 2);
    }
    else {
        heightToScrollTo -= Math.round((window.innerHeight - 46 - cursorHeight) / 2);
    }

    scrollElem.scrollTo(0, heightToScrollTo);
}

docs.scrollSoCursorIsBottom = function () {
    // We will scroll and leave 2 lines below where the cursor is
    let scrollElem = document.querySelector(".kix-appview-editor");
    let heightToScrollTo = docs.getYCoord();

    let lineHeight = docs._getLineHeight()
    let cursorHeight = Math.round(parseFloat(docs.cursorCaret.style.height.slice(0, -2)));
    let linesToLeaveAbove = 2;

    // Let's subtract so the cursor is the very last line visible
    let topBar = document.getElementById("docs-bars");
    if (topBar.offsetHeight > 70) {
        heightToScrollTo -= Math.round((window.innerHeight - 105 - cursorHeight));
    }
    else {
        heightToScrollTo -= Math.round((window.innerHeight - 46 - cursorHeight));
    }

    // Let's add 2 lines of space below our cursor
    heightToScrollTo += lineHeight * linesToLeaveAbove;

    // Finally scroll
    scrollElem.scrollTo(0, heightToScrollTo);
}

docs.moveToYCoordQuitEarly = function (yCoord) {
    // TODO: Still have a timer just in case we get stuck in an infinite loop somehow
    // We are going to traverse up/down and quit immediately once we hit or are just going back and forth between a line
    let newYCoord = docs.getCoords();
    let lastMoveUp = null;

    while (newYCoord !== yCoord) {
        if ((newYCoord < yCoord && lastMoveUp === true) || (newYCoord > yCoord && lastMoveUp === false)) {
            break;
        }
        if (newYCoord < yCoord) {
            lastMoveUp = false;
            docs.pressKey(docs.codeFromKey("ArrowDown"));
        }
        else if (newYCoord > yCoord) {
            lastMoveUp = true;
            docs.pressKey(docs.codeFromKey("ArrowUp"));
        }
        newYCoord = docs.getCoords();
    }


}

docs.scrollDownWithCursor = function () {
    // Ctrl + E functionality

    // Step 1: Calculate where we want to be and where we want our cursor to be
    let scrollElem = document.querySelector(".kix-appview-editor");

    let visualHeightElem = document.querySelector(".kix-appview-editor");
    let visualHeight = visualHeightElem.scrollTop;
    let linesToMove = 1;
    let lineHeight = docs._getLineHeight();

    let linesOfBuffer = 2;
    let wantedVisualHeight = visualHeight + linesToMove * lineHeight;
    let wantedCursorPosition = wantedVisualHeight + linesOfBuffer * lineHeight;

    // Step 2: Move the cursor as needed
    // console.log(wantedVisualHeight, wantedCursorPosition);
    docs.moveToYCoordQuitEarly(wantedCursorPosition); // TODO: Ensure that this works properly

    // Step 3: Scroll to the new position
    scrollElem.scrollTo(0, wantedVisualHeight);


    // REVISED STEPS:
    // 1. Figure out where the cursor should be
    // 2. Ensure that the cursor is there
    // 3. use .scrollTo() to ensure the visual page is also where it should be

    // STEPS:
    // 1. Move the visual page to where it should be (we go down a little bit basically)
    // 2. Ensure that the cursor is in a good place, modify if need be
    // 3. Readjust so we're still at the spot from #1 if need be (if the cursor was off the screen for example)

}

// docs.simulateMouseScroll = function () {
    // We will scroll using the scrollElem

    // One page = 1056 px
    // Area between each page: 10px

    // We can calculate based on the current cursor position where we are on the page (near the top, near the middle,
    // near the bottom, etc);

    // We can calculate our visual position based on the heightElem (style.top = 0px when the screen starts with the page
    // directly at the top). NOTE: As long as our cursor is on the current page
    // If style.top > 500px or style.top < -1000px, it is likely we are not where our cursor is

    // // Base case: Cursor is near the top of the screen already
    // let [startXCoord, startYCoord] = docs.getCoords();
    // docs.pressKey(docs.codeFromKey("ArrowRight"));
    // let [endXCoord, endYCoord] = docs.getCoords();
    // if (startXCoord === endXCoord && startYCoord === endYCoord) {
    //     // At end of file
    // }
    // else {
    //     // Undo our arrow right
    //     docs.pressKey(docs.codeFromKey("ArrowLeft"));
    // }

// };

docs.monitorForPastePopup = function() {
    const target = document.body;
    let subtitle_1 = "To paste with formatting via <b>Vim for Docs</b>, either install the Google Docs Offline Chrome extension, or turn off paste with formatting in the remapping menu.";
    let subtitle_2 = "Alternatively, you can always use your keyboard shortcuts in insert mode:";

    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (node.hasChildNodes() && node.textContent.includes("Enable copy, cut, and paste?")) {
                        setTimeout(() => {

                        let rootDiv = node.childNodes[0].childNodes[0].childNodes[2];
                        let subtitle_1_elem = rootDiv.childNodes[0];
                        let subtitle_2_elem = rootDiv.childNodes[1];

                        subtitle_1_elem.innerHTML = subtitle_1;
                        subtitle_2_elem.textContent = subtitle_2;
                        }, 1);
                    }
                });
            }
        });
    });

    const config = {

        childList: true,
        subtree: false, // Big performance savings by not observing the subtrees
    };

    observer.observe(target, config);
}

export {docs};

