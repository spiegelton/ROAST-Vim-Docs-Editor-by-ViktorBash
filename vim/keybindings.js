// The current keybindings get exported from this file as ultimateKeyMap
// Also KEY_SEPARATOR is exported

const KEY_SEPARATOR = "•";
export { KEY_SEPARATOR };

function getDefaultKeyBindings() {

}

// callback runs with ultimateKeyMap as the argument
export function getUltimateKeyMapInCallback(callback) {
	chrome.storage.sync.get("ultimateKeyMap", function (result) {
		let ultimateKeyMap;
		if (result.ultimateKeyMap === undefined) {
			// No settings are saved or anything
			ultimateKeyMap = {};
		}
		else {
			ultimateKeyMap = JSON.parse(result.ultimateKeyMap);
		}

		// Now, let's go through keyMapN, keyMapI, keyMapV, and keyMapVLine and set any keybindings that aren't present
		// Also, if one of these isn't present (ex: keyMapVLine), we would set that as well
		let keyMapNames = ["keyMapN", "keyMapI", "keyMapV", "keyMapVLine"];

		// Set the keymaps as properties of ultimateKeyMap if they don't exist
		for (let i = 0; i < keyMapNames.length; i++) {
			if (!(keyMapNames[i] in ultimateKeyMap)) {
				ultimateKeyMap[keyMapNames[i]] = {};
			}
		}

		let keyMapN = {
			// keybinding (with key separator), ignoreModifierKeys (boolean), bitmask (ctrl, shift, alt, meta), description
			// the description is used in shortcuts.html for the UI (doesn't actually do anything in the backend)
			arrowLeft: ["ArrowLeft", false, 0b0000, "move arrow down"],
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
			arrowLeftCtrl: ["ArrowLeft", false, 0b1000],
			arrowRightCtrl: ["ArrowRight", false, 0b1000],
			arrowDownCtrl: ["ArrowDown", false, 0b1000],
			arrowUpCtrl: ["ArrowUp", false, 0b1000],
			escape: ["Escape", true, 0b0000],
			ctrlC: ["c", false, 0b1000],
			slashSearch: ["/", false, 0b0000],
			ctrlDPageDown: ["d", false, 0b1000],
			ctrlUPageUp: ["u", false, 0b1000],
			redo: ["r", false, 0b1000],
			paste: ["p", false, 0b0000], // TODO: Change into 2 functions on the other side
			pasteNoFormatting: ["p", false, 0b1000],
			pasteBeforeCursor: ["P", false, 0b0100],
			pasteBeforeCursorNoFormatting: ["P", false, 0b1100],
			insert: ["i", false, 0b0000],
			enterVisual: ["v", false, 0b0000],
			enterVisualLine: ["V", false, 0b0100],
			append: ["a", false, 0b0000],
			appendEndOfLine: ["A", false, 0b0100],
			newLineAbove: ["O", false, 0b0100],
			newLineBelow: ["o", false, 0b0000],
			insertStartOfLine: ["I", false, 0b0100],
			e: ["e", false, 0b0000],
			E: ["E", false, 0b0100],
			endOfLine: ["$", false, 0b0100],
			w: ["w", false, 0b0000],
			W: ["W", false, 0b0100],
			x: ["x", false, 0b0000],
			s: ["s", false, 0b0000],
			deleteToEndOfLine: ["D", false, 0b0100],
			deleteToEndOfLine2: ["d" + KEY_SEPARATOR + "$", true, 0b0000],
			deleteToEndOfLineInsert: ["C", false, 0b0100],
			deleteToEndOfLine2Insert: ["c" + KEY_SEPARATOR + "$", true, 0b0000],
			deleteToStartOfLine: ["d" + KEY_SEPARATOR + "0", true, 0b0000],
			deleteToStartOfLineInsert: ["c" + KEY_SEPARATOR + "0", true, 0b0000],
			dw: ["d" + KEY_SEPARATOR + "w", true, 0b0000],
			dW: ["d" + KEY_SEPARATOR + "W", true, 0b0000],
			cw: ["c" + KEY_SEPARATOR + "w", true, 0b0000],
			cW: ["c" + KEY_SEPARATOR + "W", true, 0b0000],
			deleteLine: ["d" + KEY_SEPARATOR + "d", true, 0b0000],
			deleteLineInsert: ["c" + KEY_SEPARATOR + "c", true, 0b0000],
			deleteLine2Insert: ["S", false, 0b0100],
			deleteInnerWord: ["d" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000],
			deleteInnerWordInsert: ["c" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000],
			deleteWord: ["d" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000],
			deleteWordInsert: ["c" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000],
			copyToEndOfLine: ["y" + KEY_SEPARATOR + "$", true, 0b0000],
			copyToStartOfLine: ["y" + KEY_SEPARATOR + "0", true, 0b0000],
			copyWholeLine: ["y" + KEY_SEPARATOR + "y", true, 0b0000],
			copyWholeLine2: ["Y", false, 0b0100],
			u: ["u", false, 0b0000],
			U: ["U", false, 0b0100],
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

		// Now we can set the keybindings that aren't present
		// We are going to loop through each keyMap (keyMapN, keyMapI, keyMapV, keyMapVLine), and set any keybindings that are in the storage keymap

		// keyMapN
		const keyMapNKeys = Object.keys(keyMapN);
		keyMapNKeys.forEach((key) => {
			if (key in ultimateKeyMap.keyMapN) {
				// Set the keybinding to the one in the storage keymap
				keyMapN[key] = ultimateKeyMap.keyMapN[key];
			}
		});

		// keyMapI
		const keyMapIKeys = Object.keys(keyMapI);
		keyMapIKeys.forEach((key) => {
			if (key in ultimateKeyMap.keyMapI) {
				// Set the keybinding to the one in the storage keymap
				keyMapI[key] = ultimateKeyMap.keyMapI[key];
			}
		});

		// keyMapV
		const keyMapVKeys = Object.keys(keyMapV);
		keyMapVKeys.forEach((key) => {
			if (key in ultimateKeyMap.keyMapV) {
				// Set the keybinding to the one in the storage keymap
				keyMapV[key] = ultimateKeyMap.keyMapV[key];
			}
		});

		// keyMapVLine
		const keyMapVLineKeys = Object.keys(keyMapVLine);
		keyMapVLineKeys.forEach((key) => {
			if (key in ultimateKeyMap.keyMapVLine) {
				// Set the keybinding to the one in the storage keymap
				keyMapVLine[key] = ultimateKeyMap.keyMapVLine[key];
			}
		});

		// ultimateKeyMap declared/defined above
		ultimateKeyMap.keyMapN = keyMapN;
		ultimateKeyMap.keyMapI = keyMapI;
		ultimateKeyMap.keyMapV = keyMapV;
		ultimateKeyMap.keyMapVLine = keyMapVLine;

        callback(ultimateKeyMap);

    });

}