import { docs } from "./docs.js";

let vim = {
    "mode": "insert", // Keep track of current mode, options: ["insert", "normal", "visual"]
    "num": "", // Keep track of number keys pressed by the user
    "currentSequence": "", // Keep track of key sequences
    "escapeSequence": "hn",
    "keyMaps" : {
        "Backspace": [["ArrowLeft"]],
        "x": [["Delete"]],
        "b": [["ArrowLeft", true]], // ctrl + <-
        "B": [["ArrowLeft", true]], // ctrl + <-
        "e": [["ArrowRight", true]], // ctrl + ->
        "E": [["ArrowRight", true]], // ctrl + ->
        "w": [["ArrowRight", true], ["ArrowRight", true], ["ArrowLeft", true]],  // w is same behavior as eeb
        "W": [["ArrowRight", true], ["ArrowRight", true], ["ArrowLeft", true]],  // w is same behavior as eeb
        "a": [["ArrowRight"]],
        "A": [["ArrowDown", true], ["ArrowLeft"]],
        "$": [["ArrowDown", true], ["ArrowLeft"]],
        "o": [["ArrowDown", true], ["Enter"], ["ArrowLeft"]],
        "h": [["ArrowLeft"]],
        "j": [["ArrowDown"]],
        "k": [["ArrowUp"]],
        "l": [["ArrowRight"]],
        "H": [["Home", true]],
        "gg": [["home", true]],
        "G": [["End", true]]
    },
    "needsInsert": ["a", "A", "I", "o", "O"]
};

vim.addKeyMappings = function (baseMap) {
    baseMap[vim.keys.move[0]] = "ArrowLeft";
    baseMap[vim.keys.move[1]] = "ArrowDown";
    baseMap[vim.keys.move[2]] = "ArrowUp";
    baseMap[vim.keys.move[3]] = "ArrowRight";
};

vim.switchToNormalMode = function () {
    vim.currentSequence = "";
    vim.mode = "normal";
    vim.num = "";
    docs.setCursorWidth("7px");
};

vim.switchToVisualMode = function () {
    vim.currentSequence = "";
    vim.mode = "visual";
    vim.num = "";
    docs.setCursorWidth("7px");
};

vim.switchToInsertMode = function () {
    vim.currentSequence = "";
    vim.mode = "insert";
    vim.num = "";
    docs.setCursorWidth("2px");
};

// Called in normal mode.
vim.normal_keydown = function (e) {
    if (e.key.match(/F\d+/)) {
        // Let function keys (F1 to F12), go through normally
        return true;
    }
    

    e.preventDefault();
    e.stopPropagation();

    if (e.key == "Escape") {
        // Remove any saved queries that the user had
        vim.num = "";
        vim.currentSequence = "";
    }

    if (e.key === "i") {
        vim.switchToInsertMode();
        return true;
    }

    if (e.key === "v") {
        vim.switchToVisualMode();
        return true;
    }

    if (e.key.match(/\d+/)) {
        if (e.key === "0" && vim.num.length !== 0) {
            // 0 is part of the number being typed (ex: "100")
            if (vim.num.length < 3) {
                // We don't want to crash, so max you can type in is a 3 digit number (999)
                vim.num += e.key
            }
            return true;
        }
        else if (e.key !== "0") {
            // We have any digit besides 0 being typed (ex: "1" or "11")
            if (vim.num.length < 3) {
                vim.num += e.key
            }
            return true;
        }
        else {
            // else, 0 is the actual command (ex: "0"), so continue to down below
            if (docs.atStartOfLine()) {
                docs.pressKey(docs.codeFromKey("ArrowRight")); // This helps immensely to gauge where we are
                if (docs.atStartOfLine()) {
                    // We are on an empty line, so reverse, and that's it
                    docs.pressKey(docs.codeFromKey("ArrowLeft"));
                }
                else {
                    // We are at the start of a line but not the start of the paragraph, so business as usual
                    docs.pressKey(docs.codeFromKey("ArrowUp"), true);
                }
            }
            else {
                // We are not at the start of a line, so go to the start
                docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            }
            return true;
        }

    }

    if (e.key === "O") {
        // The edge cases here that we handle: If we are at the start of a line and start of a paragraph 
        // (which is different than just being at the start of a line)
        // Also if we are on an empty line
        if (docs.atStartOfLine()) {
            docs.pressKey(docs.codeFromKey("ArrowRight")); // This helps immensely to gauge where we are
            if (docs.atStartOfLine()) {
                // We are on an empty line, so reverse and insert a new line
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("Enter"));
            }
            else {
                // We are at the start of a line but not the start of the paragraph, so business as usual
                docs.pressKey(docs.codeFromKey("ArrowUp"), true);
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
                docs.pressKey(docs.codeFromKey("Enter"));
            }
        }
        else {
            // We are not at the start of a line, so just insert a new line
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
            docs.pressKey(docs.codeFromKey("Enter"));
        }
        vim.switchToInsertMode();
        return true;
    }

    if (e.key === "I") { // (Same logic as "O" above)
        // The edge cases here that we handle: If we are at the start of a line and start of a paragraph 
        // (which is different than just being at the start of a line)
        // Also if we are on an empty line
        if (docs.atStartOfLine()) {
            docs.pressKey(docs.codeFromKey("ArrowRight")); // This helps immensely to gauge where we are
            if (docs.atStartOfLine()) {
                // We are on an empty line, so reverse and insert a new line
                docs.pressKey(docs.codeFromKey("ArrowLeft"));
            }
            else {
                // We are at the start of a line but not the start of the paragraph, so business as usual
                docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            }
        }
        else {
            // We are not at the start of a line, so just insert a new line
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
        }
        vim.switchToInsertMode();
        return true;
    }


    vim.keyMaps[e.key]?.forEach(([key, ...args]) => {
        const numRepeats = parseInt(vim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            docs.pressKey(docs.codeFromKey(key), ...args);
        }
        vim.num = "";
    });

    if (vim.needsInsert.includes(e.key)) {
        vim.switchToInsertMode();
        return true;
    }

    return false;
};

// Called in visual mode.
vim.visual_keydown = function (e) {
    if (e.key.match(/F\d+/)) {
        // Pass through any function keys.
        return true;
    }

    if (e.key == "Escape") {
        // Escape visual mode.
        vim.switchToNormalMode();
    }

    vim.currentSequence += e.key;
    if (vim.currentSequence == vim.escapeSequence) {
        e.preventDefault();
        e.stopPropagation();

        vim.switchToNormalMode();
        return false;
    }
    if (vim.escapeSequence.indexOf(vim.currentSequence) != 0) {
        vim.currentSequence = e.key;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.key.match(/\d+/)) {
        vim.num += e.key.toString();
    }

    vim.keyMaps[e.key]?.forEach(([key, ...args]) => {
        const numRepeats = parseInt(vim.num) || 1;
        for (let i = 0; i < numRepeats; i++) {
            if (key.indexOf("Arrow") == 0) {
                // get the special keys pressed and default to false
                const keyArgs = [...args, false, false].slice(0, 2);
                keyArgs[1] = true;
                docs.pressKey(docs.codeFromKey(key), ...keyArgs);
            } else {
                docs.pressKey(docs.codeFromKey(key), ...args);
                vim.switchToNormalMode();
            }
        }
        vim.num = "";
    });

    return false;
};

// Called in insert mode.
vim.insert_keydown = function (e) {
    if (e.key == "Escape") {
        vim.switchToNormalMode();
    }

    vim.currentSequence += e.key;
    if (vim.currentSequence == vim.escapeSequence) {
        e.preventDefault();
        e.stopPropagation();

        // We need to delete the first character already typed in the escape
        // sequence.
        for (var i = 0; i < (vim.currentSequence.length - 1); i++) {
            docs.pressKey(docs.codeFromKey("Backspace")); // changed from original way
        }

        vim.switchToNormalMode();
        return false;
    }
    if (vim.escapeSequence.indexOf(vim.currentSequence) != 0) {
        vim.currentSequence = e.key;
    }
};

docs.keydown = function (e) {
    if (vim.mode == "insert") {
        return vim.insert_keydown(e);
    }
    if (vim.mode == "normal") {
        return vim.normal_keydown(e);
    }
    if (vim.mode == "visual") {
        return vim.visual_keydown(e);
    }
};

console.log("Vim Docs Editor Loaded");