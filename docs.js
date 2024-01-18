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

}

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
            Space: 32,
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

// Edge case: Your view may scroll up or down a line if you're view is of the cursor at the very top
docs.atStartOfLine = function () {
    // We are going to get the initial Y Coordinate, move one character left, get the y coord (move back), and compare the two
    // If they are different, we are at the start of the line
    let coords = docs.userCursor.style.transform;
    let xIndex = coords.indexOf("px");
    let initialYCoord = coords.slice(xIndex + 4, coords.length - 3);
    docs.pressKey(docs.codeFromKey("ArrowLeft"));
    coords = docs.userCursor.style.transform;
    xIndex = coords.indexOf("px");
    let finalYCoord = coords.slice(xIndex + 4, coords.length - 3);
    docs.pressKey(docs.codeFromKey("ArrowRight")); // Undo our key action

    return initialYCoord !== finalYCoord;
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

/*
    Attempt to paste HTML into the document if possible (called if execCommand fa
 */
docs.pasteRegular = function () {
    let success = docs.contentDocument.execCommand("paste");
    if (success) {
        return;
    }
    console.error("execCommand(paste) failed, trying to paste plain text...");
    // execCommand failed, let's try to paste any plain text at least
    docs.pastePlainText();
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

// Execute a command that opens a popup menu, which requires us to "reactivate" our event listeners afterwards (for
// some reason)
docs._clickPopupButton = function (ariaLabel) {
    // Click whichever button we are trying to click
    docs.__clickButtonFromAriaLabel(ariaLabel, true);

    // We must detect when the menu is exited out of, and then click the "Bold" button twice
    // This is hacky, but it works. Otherwise, our event handlers for keydown events are not active for some reason.
    // We're basically refocusing the document so the event handlers are live again (Even though .hasfocus() returns true for some reason)
    let waitingForMenuClose = setInterval(() => {
        // This element is hidden when the word count menu is open, so we'll detect when we close the word count menu
        // By seeing when this element is not hidden anymore
        let element = document.querySelector('meta[itemprop="name"]');
        let elementHidden = element.getAttribute("aria-hidden");

        if (elementHidden === null) {
            // Element is not hidden anymore
            clearInterval(waitingForMenuClose); // Clear the interval we're in right now

            // We click on the bold button twice to "refocus/reactivate" the document. We click this button
            // because clicking it twice has no impact. Also, no bolding is actually visible to the end user :)
            let boldButton = document.getElementById("boldButton");
            docs._simulateClick(boldButton, true);
            docs._simulateClick(boldButton, true);
        }

    }, 10)
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
};

export {docs};
