import { docs } from "./docs.js";

let vim = {
    "mode": "insert", // Keep track of current mode, options: ["insert", "normal", "visual"]
    "num": "", // Keep track of number keys pressed by the user
    "currentSequence": "", // Keep track of key sequences (ex: "gg")
    "keyMaps" : {
        "Backspace": [["ArrowLeft"]],
        "x": [["Delete"]],
        "b": [["ArrowLeft", true]], // ctrl + <-
        "B": [["ArrowLeft", true]], // ctrl + <-
        "e": [["ArrowRight", true]], // ctrl + ->
        "E": [["ArrowRight", true]], // ctrl + ->
        "w": [["ArrowRight", true], ["ArrowRight", true], ["ArrowLeft", true]],  // w is same behavior as eeb
        "W": [["ArrowRight", true], ["ArrowRight", true], ["ArrowLeft", true]],  // w is same behavior as eeb
        "h": [["ArrowLeft"]],
        "j": [["ArrowDown"]],
        "k": [["ArrowUp"]],
        "l": [["ArrowRight"]],
        "H": [["Home", true]],
        "gg": [["home", true]],
        "G": [["End", true]]
    },
    "needsInsert": ["o"] // "I" and "O" also need insert, but they are handled manually
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
            let cursorLocations = docs.getCursorLocations();
            if (cursorLocations[0] && cursorLocations[1]) {
                // Do nothing
            }
            else if (cursorLocations[0]) {
                docs.pressKey(docs.codeFromKey("ArrowRight")); // This helps immensely to gauge where we are
                docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            }
            else {
                docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            }

            return true;
        }

    }

    if (e.key === "a") {
        let cursorLocations = docs.getCursorLocations();
        if (!cursorLocations[1]) {
            // If we're not at the end of the line, move right
            docs.pressKey(docs.codeFromKey("ArrowRight"));
        }

        vim.switchToInsertMode();
        return true;
    }

    if (e.key === "A") {
        let cursorLocations = docs.getCursorLocations();
        docs.pressKey(docs.codeFromKey("ArrowDown"), true);
        if (!cursorLocations[3]) {
            // If we're not at the end of the file, move left
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }

        vim.switchToInsertMode();
        return true;
    }

    if (e.key === "O") {
        let cursorLocations = docs.getCursorLocations();
        if (cursorLocations[2]) {
            // At start of file
            docs.pressKey(docs.codeFromKey("Enter"));
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
        else if (cursorLocations[3] && cursorLocations[0]) {
            // At end of file on an empty line
            docs.pressKey(docs.codeFromKey("Enter"));
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
        else if (cursorLocations[3]) {
            // At end of file on non-empty line
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            docs.pressKey(docs.codeFromKey("Enter"));
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        } // Past this point we are guaranteed to not be at the start or end of the file
        else if (cursorLocations[0] && cursorLocations[1]) {
            // We are on an empty line
            docs.pressKey(docs.codeFromKey("Enter"));
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
        else if (cursorLocations[0]) {
            docs.pressKey(docs.codeFromKey("ArrowRight")); // This helps immensely to gauge where we are
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            docs.pressKey(docs.codeFromKey("Enter"));
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
        else {
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
            docs.pressKey(docs.codeFromKey("Enter"));
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }

        vim.switchToInsertMode();
        return true;
    }

    if (e.key === "o") {
        docs.pressKey(docs.codeFromKey("ArrowDown"), true);
        let cursorLocations = docs.getCursorLocations();
        if (!cursorLocations[3]) {
            // If after going down we are not at the end of the file, go back 1
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
        // Hit enter for the new line
        docs.pressKey(docs.codeFromKey("Enter"));
        vim.switchToInsertMode();
        return true;
    }

    if (e.key === "I") { 
        let cursorLocations = docs.getCursorLocations();
        if (!cursorLocations[0]) {
            // We are not at the start of a line
            docs.pressKey(docs.codeFromKey("ArrowUp"), true);
        }
        vim.switchToInsertMode();
        return true;
    }

    if (e.key === "$") {
        let cursorLocations = docs.getCursorLocations();
        docs.pressKey(docs.codeFromKey("ArrowDown"), true);
        if (!cursorLocations[3]) {
            // If we're not at the end of a file, move back left
            docs.pressKey(docs.codeFromKey("ArrowLeft"));
        }
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

    e.preventDefault();
    e.stopPropagation();

    if (e.key == "Escape") {
        // Escape visual mode.
        vim.switchToNormalMode();
        return true;
    }

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
    // Let all characters flow freely (except for escape)
    if (e.key == "Escape") {
        vim.switchToNormalMode();
        return true;
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