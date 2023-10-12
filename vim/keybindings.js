// The key separator used between keys in the keybinding (ex: "d•w" for delete word)
// The character is U+0095, and can't appear itself as a key
const KEY_SEPARATOR = "•";
export { KEY_SEPARATOR };

// Save 1 keybinding to the ultimateKeyMap in chrome.storage.local
export function saveKeyInKeyMap(keyMapStr, keyNameStr, keyValue, bitMask) {

	// If the keybinding is multiple keys, ignore the modifier keys
	let ignoreModifierKeys = false;
	if (keyValue.includes(KEY_SEPARATOR)) {
		ignoreModifierKeys = true;
	}

	// Build the actual entry
	let keyArr = [keyValue, ignoreModifierKeys, bitMask];

	getUltimateKeyMapInCallback(function (ultimateKeyMap) {
		// Get the current keyMap, change the entry we want to, then save it back
		ultimateKeyMap[keyMapStr][keyNameStr] = keyArr;

		chrome.storage.local.set({
			"ultimateKeyMap": JSON.stringify(ultimateKeyMap)
		})
	});
}

/*
* Returns a keyMap object with the default keybindings for each mode
* A few default keybindings are different for Mac vs Windows
*/
export function getDefaultKeyBindings() {
	let keyMapN = {
		// keybinding (with key separator), ignoreModifierKeys (boolean), bitmask (ctrl, shift, alt, meta), description
		// the description is used in shortcuts.html for the UI (doesn't actually do anything in the backend)
		arrowLeft: ["ArrowLeft", false, 0b0000, "move cursor left"],
		arrowRight: ["ArrowRight", false, 0b0000, "move cursor right"],
		arrowUp: ["ArrowUp", false, 0b0000, "move cursor up"],
		arrowDown: ["ArrowDown", false, 0b0000, "move cursor down"],
		backspace: ["Backspace", false, 0b0000, "move cursor left"],
		b: ["b", false, 0b0000, "jump backwards to the start of a word"],
		B: ["B", false, 0b0100, "jump backwards to the start of a word"],
		h: ["h", false, 0b0000, "move cursor left"],
		j: ["j", false, 0b0000, "move cursor down"],
		k: ["k", false, 0b0000, "move cursor up"],
		l: ["l", false, 0b0000, "move cursor right"],
		gg: ["g" + KEY_SEPARATOR + "g", true, 0b0000, "go to the first line of the document"],
		G: ["G", false, 0b0100, "go to the last line of the document"],
		"{": ["{", false, 0b0100, "jump to the previous paragraph"],
		"}": ["}", false, 0b0100, "jump to the next paragraph"],
		arrowLeftCtrl: ["ArrowLeft", false, 0b1000, "move cursor left with Ctrl (Cmd on Mac)"],
		arrowRightCtrl: ["ArrowRight", false, 0b1000, "move cursor right with Ctrl (Cmd on Mac)"],
		arrowDownCtrl: ["ArrowDown", false, 0b1000, "move cursor down with Ctrl (Cmd on Mac)"],
		arrowUpCtrl: ["ArrowUp", false, 0b1000, "move cursor up with Ctrl (Cmd on Mac)"],
		escape: ["Escape", true, 0b0000, "exit normal mode"],
		ctrlC: ["c", false, 0b1000, "exit normal mode"],
		slashSearch: ["/", false, 0b0000, "search for text"],
		ctrlDPageDown: ["d", false, 0b1000, "move cursor down half a page"],
		ctrlUPageUp: ["u", false, 0b1000, "move cursor up half a page"],
		redo: ["r", false, 0b1000, "redo"],
		paste: ["p", false, 0b0000, "paste after cursor"], // TODO: Change into 2 functions on the other side
		pasteNoFormatting: ["p", false, 0b1000, "paste after cursor with no formatting"],
		pasteBeforeCursor: ["P", false, 0b0100, "paste before cursor"],
		pasteBeforeCursorNoFormatting: ["P", false, 0b1100, "paste before cursor with no formatting"],
		insert: ["i", false, 0b0000, "enter insert mode before the cursor"],
		enterVisual: ["v", false, 0b0000, "enter visual mode"],
		enterVisualLine: ["V", false, 0b0100, "enter visual line mode"],
		append: ["a", false, 0b0000, "enter insert mode after the cursor"],
		appendEndOfLine: ["A", false, 0b0100, "enter insert mode at the end of the line"],
		newLineAbove: ["O", false, 0b0100, "add a new line above the cursor and enter insert mode"],
		newLineBelow: ["o", false, 0b0000, "add a new line below the cursor and enter insert mode"],
		insertStartOfLine: ["I", false, 0b0100, "enter insert mode at the start of the line"],
		e: ["e", false, 0b0000, "jump forwards to the end of a word"],
		E: ["E", false, 0b0100, "jump forwards to the end of a word"],
		endOfLine: ["$", false, 0b0100, "jump to the end of the line"],
		w: ["w", false, 0b0000, "jump forwards to the start of a word"],
		W: ["W", false, 0b0100, "jump forwards to the start of a word"],
		x: ["x", false, 0b0000, "delete character under cursor"],
		s: ["s", false, 0b0000, "delete character under cursor and enter insert mode"],
		deleteToEndOfLine: ["D", false, 0b0100, "delete to the end of the line"],
		deleteToEndOfLine2: ["d" + KEY_SEPARATOR + "$", true, 0b0000, "delete to the end of the line"],
		deleteToEndOfLineInsert: ["C", false, 0b0100, "delete to the end of the line and enter insert mode"],
		deleteToEndOfLine2Insert: ["c" + KEY_SEPARATOR + "$", true, 0b0000, "delete to the end of the line and enter insert mode"],
		deleteToStartOfLine: ["d" + KEY_SEPARATOR + "0", true, 0b0000, "delete to the start of the line"],
		deleteToStartOfLineInsert: ["c" + KEY_SEPARATOR + "0", true, 0b0000, "delete to the start of the line and enter insert mode"],
		dw: ["d" + KEY_SEPARATOR + "w", true, 0b0000, "delete to end of word"],
		dW: ["d" + KEY_SEPARATOR + "W", true, 0b0000, "delete to end of word"],
		cw: ["c" + KEY_SEPARATOR + "w", true, 0b0000, "delete to end of word and enter insert mode"],
		cW: ["c" + KEY_SEPARATOR + "W", true, 0b0000, "delete to end of word and enter insert mode"],
		deleteLine: ["d" + KEY_SEPARATOR + "d", true, 0b0000, "delete whole line"],
		deleteLineInsert: ["c" + KEY_SEPARATOR + "c", true, 0b0000, "delete whole line and enter insert mode"],
		deleteLine2Insert: ["S", false, 0b0100, "delete whole line and enter insert mode"],
		deleteInnerWord: ["d" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000, "delete inner word (not whitespace)"],
		deleteInnerWordInsert: ["c" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000, "delete inner word (not whitespace) and enter insert mode"],
		deleteWord: ["d" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000, "delete word (including whitespace)"],
		deleteWordInsert: ["c" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000, "delete word (including whitespace) and enter insert mode"],
		copyToEndOfLine: ["y" + KEY_SEPARATOR + "$", true, 0b0000, "yank/copy to the end of the line"],
		copyToStartOfLine: ["y" + KEY_SEPARATOR + "0", true, 0b0000, "yank/copy to the start of the line"],
		copyWholeLine: ["y" + KEY_SEPARATOR + "y", true, 0b0000, "yank/copy the whole line"],
		copyWholeLine2: ["Y", false, 0b0100, "yank/copy the whole line"],
		u: ["u", false, 0b0000, "undo"],
		U: ["U", false, 0b0100, "undo"],
		
	}

	let keyMapI = {
		// TODO: Tell user only single character mappings work in insert mode
		// TODO: if user wants to disable a keymapping (ex: ctrl - c), we will store two key separators 
		//together in the keymap so that it won't ever run
		escape: ["Escape", true, 0b0000],
		ctrlC: ["c", false, 0b1000],
	}

	let keyMapV = {
		arrowLeft: ["ArrowLeft", false, 0b0000],
		arrowRight: ["ArrowRight", false, 0b0000],
		arrowUp: ["ArrowUp", false, 0b0000],
		arrowDown: ["ArrowDown", false, 0b0000],
		backspace: ["Backspace", false, 0b0000],
		b: ["b", false, 0b0000],
		B: ["B", false, 0b0100],
		h: ["h", false, 0b0000],
		j: ["j", false, 0b0000],
		k: ["k", false, 0b0000],
		l: ["l", false, 0b0000],
		gg: ["g" + KEY_SEPARATOR + "g", true, 0b0000],
		G: ["G", false, 0b0100],
		"{": ["{", false, 0b0100],
		"}": ["}", false, 0b0100],
		e: ["e", false, 0b0000],
		E: ["E", false, 0b0100],
		escape: ["Escape", true, 0b0000],
		ctrlC: ["c", false, 0b1000],
		u: ["u", false, 0b0000],
		U: ["U", false, 0b0100],
		redo: ["r", false, 0b1000],
		slashSearch: ["/", false, 0b0000],
		paste: ["p", false, 0b0000], // TODO: Change into 2 functions on the other side
		pasteNoFormatting: ["p", false, 0b1000],
		pasteBeforeCursor: ["P", false, 0b0100],
		pasteBeforeCursorNoFormatting: ["P", false, 0b1100],
		insertStartOfHighlight: ["I", false, 0b0100],
		exitVisualMode: ["v", false, 0b0000],
		exitVisualMode2: ["V", false, 0b0100],
		appendEndOfHighlight: ["A", false, 0b0100],
		highlightToEndOfLine: ["$", false, 0b0100],
		x: ["x", false, 0b0000],
		d: ["d", false, 0b0000],
		c: ["c", false, 0b0000],
		D: ["D", false, 0b0100],
		C: ["C", false, 0b0100],
		y: ["y", false, 0b0000],
		arrowLeftCtrl: ["ArrowLeft", false, 0b1000],
		arrowRightCtrl: ["ArrowRight", false, 0b1000],
		arrowDownCtrl: ["ArrowDown", false, 0b1000],
		arrowUpCtrl: ["ArrowUp", false, 0b1000],
		ctrlDPageDown: ["d", false, 0b1000],
		ctrlUPageUp: ["u", false, 0b1000],
		w: ["w", false, 0b0000],
		W: ["W", false, 0b0100],
	}

	let keyMapVLine = {
		arrowUp: ["ArrowUp", false, 0b0000],
		arrowDown: ["ArrowDown", false, 0b0000],
		j: ["j", false, 0b0000],
		k: ["k", false, 0b0000],
		gg: ["g" + KEY_SEPARATOR + "g", true, 0b0000],
		G: ["G", false, 0b0100],
		"{": ["{", false, 0b0100],
		"}": ["}", false, 0b0100],
		escape: ["Escape", true, 0b0000],
		ctrlC: ["c", false, 0b1000],
		u: ["u", false, 0b0000],
		U: ["U", false, 0b0100],
		redo: ["r", false, 0b1000],
		slashSearch: ["/", false, 0b0000],
		paste: ["p", false, 0b0000], // TODO: Change into 2 functions on the other side
		pasteNoFormatting: ["p", false, 0b1000],
		pasteBeforeCursor: ["P", false, 0b0100],
		pasteBeforeCursorNoFormatting: ["P", false, 0b1100],
		insertStartOfHighlight: ["I", false, 0b0100],
		exitVisualMode: ["v", false, 0b0000],
		exitVisualMode2: ["V", false, 0b0100],
		appendEndOfHighlight: ["A", false, 0b0100],
		x: ["x", false, 0b0000],
		d: ["d", false, 0b0000],
		c: ["c", false, 0b0000],
		D: ["D", false, 0b0100],
		C: ["C", false, 0b0100],
		y: ["y", false, 0b0000],
		arrowDownCtrl: ["ArrowDown", false, 0b1000],
		arrowUpCtrl: ["ArrowUp", false, 0b1000],
		ctrlDPageDown: ["d", false, 0b1000],
		ctrlUPageUp: ["u", false, 0b1000],
	}


	// Determine if the user is on a Mac or not
	let macPlatforms = ["MacIntel", "MacPPC", "Mac68K", "iPhone", "iPad"];
	let isMac = false;
	if (macPlatforms.includes(navigator.platform)) {
		isMac = true;
	}

	if (isMac) {
		// A couple of the keybindings are different on Mac (primarily option (alt) for arrowCtrl keys)
		keyMapN["arrowLeftCtrl"] = ["ArrowLeft", false, 0b0010];
		keyMapN["arrowRightCtrl"] = ["ArrowRight", false, 0b0010];
		keyMapN["arrowDownCtrl"] = ["ArrowDown", false, 0b0010];
		keyMapN["arrowUpCtrl"] = ["ArrowUp", false, 0b0010];

		keyMapV["arrowLeftCtrl"] = ["ArrowLeft", false, 0b0010];
		keyMapV["arrowRightCtrl"] = ["ArrowRight", false, 0b0010];
		keyMapV["arrowDownCtrl"] = ["ArrowDown", false, 0b0010];
		keyMapV["arrowUpCtrl"] = ["ArrowUp", false, 0b0010];

		keyMapVLine["arrowDownCtrl"] = ["ArrowDown", false, 0b0010];
		keyMapVLine["arrowUpCtrl"] = ["ArrowUp", false, 0b0010];
	}

	return {
		keyMapN: keyMapN,
		keyMapI: keyMapI,
		keyMapV: keyMapV,
		keyMapVLine: keyMapVLine,
	}
}

/*
* Returns the current keymap of the user as a argument to a callback function
* We first get the default keymap, then we go through and set any keybindings that are in the local storage keymap
* After effectively "merging" both, we call the callback with the merged keymap as the argument
*/
export function getUltimateKeyMapInCallback(callback) {
	chrome.storage.local.get("ultimateKeyMap", function (result) {
		let savedKeyMap; // The version in storage
		if (result.ultimateKeyMap === undefined || result.ultimateKeyMap === null) {
			// No settings are saved or anything
			savedKeyMap = {};
		}
		else {
			savedKeyMap = JSON.parse(result.ultimateKeyMap);
		}

		// Now, let's go through keyMapN, keyMapI, keyMapV, and keyMapVLine and set any keybindings that aren't present
		// Also, if one of these isn't present (ex: keyMapVLine), we would set that as well
		let keyMapNames = ["keyMapN", "keyMapI", "keyMapV", "keyMapVLine"];

		// Set the keymaps as properties of savedKeyMap if they don't exist
		for (let i = 0; i < keyMapNames.length; i++) {
			if (!(keyMapNames[i] in savedKeyMap)) {
				savedKeyMap[keyMapNames[i]] = {};
			}
		}

		// This is the default keymap
		let defaultKeyMap = getDefaultKeyBindings();

		// Our outputKeyMap will be both keymaps merged
		let outputKeyMap = {
			keyMapN: {},
			keyMapI: {},
			keyMapV: {},
			keyMapVLine: {},
			incompleteKeyMapN: [],
			// Note: no incompleteKeyMapI because keybindings in insert mode are limited to 1 key
			incompleteKeyMapV: [],
			incompleteKeyMapVLine: [],
		}

		// We are going to loop through each keyMap (keyMapN, keyMapI, keyMapV, keyMapVLine)
		// In each keyMap, we will loop through each key entry and either populate outputKeyMap with the 
		// saved keybinding if it exists or the default keybinding

		// keyMapN
		const keyMapNKeys = Object.keys(defaultKeyMap.keyMapN);
		keyMapNKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapN) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapN[key] = savedKeyMap.keyMapN[key];
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapN[key] = defaultKeyMap.keyMapN[key];
			}

			// Add to incompleteKeyMapN if it's a multi-key keybinding
			// EX: D*i*W gets D and D*I stored
			let keyVal = outputKeyMap.keyMapN[key][0];
			for (let i = 0; i < keyVal.length; i++) {
				if (keyVal[i] === KEY_SEPARATOR) {
					outputKeyMap.incompleteKeyMapN.push(keyVal.slice(0, i));
				}
			}
			
		});

		// keyMapI
		const keyMapIKeys = Object.keys(defaultKeyMap.keyMapI);
		keyMapIKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapI) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapI[key] = savedKeyMap.keyMapI[key];
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapI[key] = defaultKeyMap.keyMapI[key];
			}
		});

		// keyMapV
		const keyMapVKeys = Object.keys(defaultKeyMap.keyMapV);
		keyMapVKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapV) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapV[key] = savedKeyMap.keyMapV[key];
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapV[key] = defaultKeyMap.keyMapV[key];
			}

			// Add to incompleteKeyMapV if it's a multi-key keybinding
			let keyVal = outputKeyMap.keyMapV[key][0];
			for (let i = 0; i < keyVal.length; i++) {
				if (keyVal[i] === KEY_SEPARATOR) {
					outputKeyMap.incompleteKeyMapV.push(keyVal.slice(0, i));
				}
			}
		});

		// keyMapVLine
		const keyMapVLineKeys = Object.keys(defaultKeyMap.keyMapVLine);
		keyMapVLineKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapVLine) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapVLine[key] = savedKeyMap.keyMapVLine[key];
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapVLine[key] = defaultKeyMap.keyMapVLine[key];
			}

			// Add to incompleteKeyMapVLine if it's a multi-key keybinding
			let keyVal = outputKeyMap.keyMapVLine[key][0];
			for (let i = 0; i < keyVal.length; i++) {
				if (keyVal[i] === KEY_SEPARATOR) {
					outputKeyMap.incompleteKeyMapVLine.push(keyVal.slice(0, i));
				}
			}
		});

		// Now, outputKeyMap is fully populated with the keybindings
		// Call the callback function with outputKeyMap as an argument
        callback(outputKeyMap);

    });

}