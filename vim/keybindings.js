// The key separator used between keys in the keybinding (ex: "d•w" for delete word)
// The character is U+0095, and can't appear itself as a key
const KEY_SEPARATOR = "•";

export function getModifierInput(e) {
	// Get bitmask from e (keyboard event)
	// Bitmask: (ctrl, shift, alt, meta)
	return ((+ e.ctrlKey) << 3) | ((+ e.shiftKey) << 2) | ((+ e.altKey) << 1) | (+ e.metaKey)
}
export { KEY_SEPARATOR };

// Save 1 keybinding to the ultimateKeyMap in chrome.storage.local
export function saveKeyInKeyMap(keyMapStr, keyNameStr, keyValue, bitMask, cutText) {

	// If the keybinding is multiple keys, ignore the modifier keys
	let ignoreModifierKeys = false;
	if (keyValue.includes(KEY_SEPARATOR)) {
		ignoreModifierKeys = true;
	}

	// Build the actual entry
	let keyArr = [keyValue, ignoreModifierKeys, bitMask, null, cutText]; // NOTE: null is the description placeholder index value
	// It is not necessary to save the description because when we load the keymap, we are always just using the default description

	getUltimateKeyMapInCallback(function (ultimateKeyMap) {
		// Get the current keyMap, change the entry we want to, then save it back
		ultimateKeyMap[keyMapStr][keyNameStr] = keyArr;

		chrome.storage.local.set({
			"ultimateKeyMap": JSON.stringify(ultimateKeyMap)
		})
	});
}

export function resetToDefaultKeyMap(callback) {

	// Clear local storage completely and then call the callback when done
	// NOTE: The show updates toggle is stored in chrome.storage.sync, so it won't be cleared
	chrome.storage.local.clear(function (result) {
		callback();
	})
}

/*
* Returns a keyMap object with the default keybindings for each mode
* A few default keybindings are different for Mac vs Windows
*/
export function getDefaultKeyBindings() {
	let keyMapN = {
		// keybinding (with key separator), ignoreModifierKeys (boolean), bitmask (ctrl, shift, alt, meta), description, cut (boolean)
		// the description is used in shortcuts.html for the UI (doesn't actually do anything in the backend)
		// cut is either true (cut text), false (delete, don't cut) or null (not applicable)
		arrowLeft: ["ArrowLeft", false, 0b0000, "Move cursor left", null],
		arrowRight: ["ArrowRight", false, 0b0000, "Move cursor right", null],
		arrowUp: ["ArrowUp", false, 0b0000, "Move cursor up", null],
		arrowDown: ["ArrowDown", false, 0b0000, "Move cursor down", null],
		backspace: ["Backspace", false, 0b0000, "Move cursor left", null],
		b: ["b", false, 0b0000, "Jump backwards to the start of a word", null],
		B: ["B", false, 0b0100, "Jump backwards to the start of a word", null],
		h: ["h", false, 0b0000, "Move cursor left", null],
		j: ["j", false, 0b0000, "Move cursor down", null],
		k: ["k", false, 0b0000, "Move cursor up", null],
		l: ["l", false, 0b0000, "Move cursor right", null],
		gg: ["g" + KEY_SEPARATOR + "g", true, 0b0000, "Go to the start of the document", null],
		G: ["G", false, 0b0100, "Go to the end of the document", null],
		"{": ["{", false, 0b0100, "Jump to the previous paragraph", null],
		"}": ["}", false, 0b0100, "Jump to the next paragraph", null],
		arrowLeftCtrl: ["ArrowLeft", false, 0b1000, "Move cursor left with Ctrl (Option on Mac)", null],
		arrowRightCtrl: ["ArrowRight", false, 0b1000, "Move cursor right with Ctrl (Option on Mac)", null],
		arrowDownCtrl: ["ArrowDown", false, 0b1000, "Move cursor down with Ctrl (Option on Mac)", null],
		arrowUpCtrl: ["ArrowUp", false, 0b1000, "Move cursor up with Ctrl (Option on Mac)", null],
		escape: ["Escape", true, 0b0000, "Clear any command in progress", null],
		ctrlC: ["c", false, 0b1000, "Clear any command in progress", null],
		slashSearch: ["/", false, 0b0000, "Search for text", null],
		ctrlDPageDown: ["d", false, 0b1000, "Move cursor down several lines", null],
		ctrlUPageUp: ["u", false, 0b1000, "Move cursor up several lines", null],
		redo: ["r", false, 0b1000, "Redo", null],
		paste: ["p", false, 0b0000, "Paste after cursor", null], // TODO: Change into 2 functions on the other side
		pasteNoFormatting: ["p", false, 0b1000, "Paste after cursor with no formatting", null],
		pasteBeforeCursor: ["P", false, 0b0100, "Paste before cursor", null],
		pasteBeforeCursorNoFormatting: ["P", false, 0b1100, "Paste before cursor with no formatting", null],
		insert: ["i", false, 0b0000, "Enter insert mode before the cursor", null],
		enterVisual: ["v", false, 0b0000, "Enter visual mode", null],
		enterVisualLine: ["V", false, 0b0100, "Enter visual line mode", null],
		append: ["a", false, 0b0000, "Enter insert mode after the cursor", null],
		appendEndOfLine: ["A", false, 0b0100, "Enter insert mode at the end of the line", null],
		newLineAbove: ["O", false, 0b0100, "Add an empty line above the cursor and enter insert mode on it", null],
		newLineBelow: ["o", false, 0b0000, "Add an empty line below the cursor and enter insert mode on it", null],
		insertStartOfLine: ["I", false, 0b0100, "Enter insert mode at the start of the line", null],
		e: ["e", false, 0b0000, "Jump forwards to the end of a word", null],
		E: ["E", false, 0b0100, "Jump forwards to the end of a word", null],
		endOfLine: ["$", false, 0b0100, "Jump to the end of the line", null],
		w: ["w", false, 0b0000, "Jump forwards to the start of a word", null],
		W: ["W", false, 0b0100, "Jump forwards to the start of a word", null],
		x: ["x", false, 0b0000, "Delete character under cursor", false],
		s: ["s", false, 0b0000, "Delete character under cursor and enter insert mode", false],
		deleteToEndOfLine: ["D", false, 0b0100, "Delete to the end of the line", false],
		deleteToEndOfLine2: ["d" + KEY_SEPARATOR + "$", true, 0b0000, "Delete to the end of the line", false],
		deleteToEndOfLineInsert: ["C", false, 0b0100, "Delete to the end of the line and enter insert mode", false],
		deleteToEndOfLine2Insert: ["c" + KEY_SEPARATOR + "$", true, 0b0000, "Delete to the end of the line and enter insert mode", false],
		deleteToStartOfLine: ["d" + KEY_SEPARATOR + "0", true, 0b0000, "Delete to the start of the line", false],
		deleteToStartOfLineInsert: ["c" + KEY_SEPARATOR + "0", true, 0b0000, "Delete to the start of the line and enter insert mode", false],
		dw: ["d" + KEY_SEPARATOR + "w", true, 0b0000, "Delete to end of word", null],
		dW: ["d" + KEY_SEPARATOR + "W", true, 0b0000, "Delete to end of word", null],
		cw: ["c" + KEY_SEPARATOR + "w", true, 0b0000, "Delete to end of word and enter insert mode", null],
		cW: ["c" + KEY_SEPARATOR + "W", true, 0b0000, "Delete to end of word and enter insert mode", null],
		deleteLine: ["d" + KEY_SEPARATOR + "d", true, 0b0000, "Delete whole line", false],
		deleteLineInsert: ["c" + KEY_SEPARATOR + "c", true, 0b0000, "Delete whole line and enter insert mode", false],
		deleteLine2Insert: ["S", false, 0b0100, "Delete whole line and enter insert mode", false],
		deleteInnerWord: ["d" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000, "Delete word (not whitespace)", null],
		deleteInnerWordInsert: ["c" + KEY_SEPARATOR + "i" + KEY_SEPARATOR + "w", true, 0b0000, "Delete word (not whitespace) and enter insert mode", null],
		deleteWord: ["d" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000, "Delete word (including whitespace)", null],
		deleteWordInsert: ["c" + KEY_SEPARATOR + "a" + KEY_SEPARATOR + "w", true, 0b0000, "Delete word (including whitespace) and enter insert mode", null],
		copyToEndOfLine: ["y" + KEY_SEPARATOR + "$", true, 0b0000, "Yank/copy to the end of the line", null],
		copyToStartOfLine: ["y" + KEY_SEPARATOR + "0", true, 0b0000, "Yank/copy to the start of the line", null],
		copyWholeLine: ["y" + KEY_SEPARATOR + "y", true, 0b0000, "Yank/copy the whole line", null],
		copyWholeLine2: ["Y", false, 0b0100, "Yank/copy the whole line", null],
		u: ["u", false, 0b0000, "Undo", null],
		U: ["U", false, 0b0100, "Undo", null],
		replaceCharacter: ["r", false, 0b000, "Replace a character", null],
		"0": ["0", false, 0b0000, "Go to start of the line", null],
		indent: [">" + KEY_SEPARATOR + ">", true, 0b0000, "Indent", null],
		outdent: ["<" + KEY_SEPARATOR + "<", true, 0b0000, "Outdent", null],
		replaceMode: ["R", false, 0b0100, "Enter replace mode", null],
		f: ["f", false, 0b0000, "Move cursor to next occurrence of character on current line", null],
		t: ["t", false, 0b0000, "Move cursor to right before next occurrence of character on current line"],
		F: ["F", false, 0b0100, "Move cursor to previous occurrence of character on current line", null],
		T: ["T", false, 0b0100, "Move cursor to right after previous occurrence of character on current line", null],
		joinLine: ["J", false, 0b0100, "Join current line with the line below it with a space in between", null],
		space: [" ", false, 0b0000, "Move cursor right (Spacebar)", null],
		zz: ["z" + KEY_SEPARATOR + "z", true, 0b0000, "Position cursor in middle of screen", null],
		zt: ["z" + KEY_SEPARATOR + "t", true, 0b0000, "Position cursor on top of screen", null],
		zb: ["z" + KEY_SEPARATOR + "b", true, 0b0000, "Position cursor on bottom of screen", null],
		// ctrlE: ["e", false, 0b1000, "Move screen down", null],
	}

	let keyMapI = {
		//together in the keymap so that it won't ever run
		escape: ["Escape", true, 0b0000, "Exit to normal mode", null],
		ctrlC: ["c", false, 0b1000, "Exit to normal mode", null],
	}

	let keyMapR = {
		escape: ["Escape", true, 0b0000, "Exit to normal mode", null],
		ctrlC: ["c", false, 0b1000, "Exit to normal mode", null],
		backspace: ["Backspace", false, 0b0000, "Undo last character change", null],
	}

	let keyMapV = {
		arrowLeft: ["ArrowLeft", false, 0b0000, "Highlight left", null],
		arrowRight: ["ArrowRight", false, 0b0000, "Highlight right", null],
		arrowUp: ["ArrowUp", false, 0b0000, "Highlight up", null],
		arrowDown: ["ArrowDown", false, 0b0000, "Highlight cursor down", null],
		backspace: ["Backspace", false, 0b0000, "Highlight cursor left", null],
		b: ["b", false, 0b0000, "Highlight backwards to the start of a word", null],
		B: ["B", false, 0b0100, "Highlight backwards to the start of a word", null],
		h: ["h", false, 0b0000, "Highlight left", null],
		j: ["j", false, 0b0000, "Highlight down", null],
		k: ["k", false, 0b0000, "Highlight up", null],
		l: ["l", false, 0b0000, "Highlight right", null],
		gg: ["g" + KEY_SEPARATOR + "g", true, 0b0000, "Highlight to top of document", null],
		G: ["G", false, 0b0100, "Highlight to bottom of document", null],
		e: ["e", false, 0b0000, "Highlight to end of word", null],
		E: ["E", false, 0b0100, "Highlight to end of word", null],
		escape: ["Escape", true, 0b0000, "Exit to normal mode", null],
		ctrlC: ["c", false, 0b1000, "Exit to normal mode", null],
		u: ["u", false, 0b0000, "Convert text to lowercase", null],
		U: ["U", false, 0b0100, "Convert text to uppercase", null],
		redo: ["r", false, 0b1000, "Exit to normal to redo", null],
		slashSearch: ["/", false, 0b0000, "Search for text", null],
		paste: ["p", false, 0b0000, "Paste", null], // TODO: Change into 2 functions on the other side
		pasteNoFormatting: ["p", false, 0b1000, "Paste with no formatting", null],
		pasteBeforeCursor: ["P", false, 0b0100, "Paste", null],
		pasteBeforeCursorNoFormatting: ["P", false, 0b1100, "Paste with no formatting", null],
		insertStartOfHighlight: ["I", false, 0b0100, "Insert at start of highlight", null],
		exitVisualMode: ["v", false, 0b0000, "Exit to normal mode", null],
		exitToVisualLineMode: ["V", false, 0b0100, "Exit to visual line mode", null],
		appendEndOfHighlight: ["A", false, 0b0100, "Append at end of highlight", null],
		highlightToEndOfLine: ["$", false, 0b0100, "Highlight to end of line", null],
		x: ["x", false, 0b0000, "Delete highlighted text", false],
		d: ["d", false, 0b0000, "Delete highlighted text", false],
		c: ["c", false, 0b0000, "Delete highlighted text and enter insert mode", false],
		D: ["D", false, 0b0100, "Delete all lines of the highlighted text", null],
		C: ["C", false, 0b0100, "Delete all lines of the highlighted text and enter insert mode", null],
		y: ["y", false, 0b0000, "Yank/copy the highlighted text", null],
		arrowLeftCtrl: ["ArrowLeft", false, 0b1000, "Highlight left with Ctrl (Option on Mac)", null],
		arrowRightCtrl: ["ArrowRight", false, 0b1000, "Highlight right with Ctrl (Option on Mac)", null],
		arrowDownCtrl: ["ArrowDown", false, 0b1000, "Highlight down with Ctrl (Option on Mac)", null],
		arrowUpCtrl: ["ArrowUp", false, 0b1000, "Highlight up with Ctrl (Option on Mac)", null],
		ctrlDPageDown: ["d", false, 0b1000, "Highlight down several lines", null],
		ctrlUPageUp: ["u", false, 0b1000, "Highlight up several lines", null],
		w: ["w", false, 0b0000, "Highlight forwards to the start of a word", null],
		W: ["W", false, 0b0100, "Highlight forwards to the start of a word", null],
		"0": ["0", false, 0b000, "Highlight to start of the line", null],
		indent: [">", false, 0b0100, "Indent", null],
		outdent: ["<", false, 0b0100, "Outdent", null],
		space: [" ", false, 0b0000, "Highlight right (Spacebar)", null],
	}

	let keyMapVLine = {
		arrowUp: ["ArrowUp", false, 0b0000, "Highlight up", null],
		arrowDown: ["ArrowDown", false, 0b0000, "Highlight down", null],
		j: ["j", false, 0b0000, "Highlight down", null],
		k: ["k", false, 0b0000, "Highlight up", null],
		gg: ["g" + KEY_SEPARATOR + "g", true, 0b0000, "Highlight to top of document", null],
		G: ["G", false, 0b0100, "Highlight to bottom of document", null],
		escape: ["Escape", true, 0b0000, "Exit to normal mode", null],
		ctrlC: ["c", false, 0b1000, "Exit to normal mode", null],
		u: ["u", false, 0b0000, "Convert text to lowercase", null],
		U: ["U", false, 0b0100, "Convert text to uppercase", null],
		redo: ["r", false, 0b1000, "Exit to normal to redo", null],
		slashSearch: ["/", false, 0b0000, "Search for text", null],
		paste: ["p", false, 0b0000, "Paste", null], // TODO: Change into 2 functions on the other side
		pasteNoFormatting: ["p", false, 0b1000, "Paste with no formatting", null],
		pasteBeforeCursor: ["P", false, 0b0100, "Paste", null],
		pasteBeforeCursorNoFormatting: ["P", false, 0b1100, "Paste with no formatting", null],
		insertStartOfHighlight: ["I", false, 0b0100, "Insert at start of highlight", null],
		exitToVisualMode: ["v", false, 0b0000, "Exit to visual mode", null],
		exitVisualLineMode: ["V", false, 0b0100, "Exit to normal mode", null],
		appendEndOfHighlight: ["A", false, 0b0100, "Append at end of highlight", null],
		x: ["x", false, 0b0000, "Delete highlighted text", false],
		d: ["d", false, 0b0000, "Delete highlighted text", false],
		c: ["c", false, 0b0000, "Delete highlighted text and enter insert mode", false],
		D: ["D", false, 0b0100, "Delete highlighted text", false],
		C: ["C", false, 0b0100, "Delete highlighted text and enter insert mode", false],
		y: ["y", false, 0b0000, "Copy highlighted text", null],
		arrowDownCtrl: ["ArrowDown", false, 0b1000, "Highlight down", null],
		arrowUpCtrl: ["ArrowUp", false, 0b1000, "Highlight up", null],
		ctrlDPageDown: ["d", false, 0b1000, "Highlight down several lines", null],
		ctrlUPageUp: ["u", false, 0b1000, "Highlight up several lines", null],
		indent: [">", false, 0b0100, "Indent", null],
		outdent: ["<", false, 0b0100, "Outdent", null],
	}

	// Determine if the user is on a Mac or not
	let macPlatforms = ["MacIntel", "MacPPC", "Mac68K", "iPhone", "iPad"];
	let isMac = false;
	if (macPlatforms.includes(navigator.platform)) {
		isMac = true;
	}

	// Native shortcuts
	// bitmask: (ctrl, shift, alt, meta)
	let keyMapNative;
	if (!isMac) {
		// Windows
		keyMapNative = {
			bold: ["b", false, 0b1000, "Bold text", null],
			italic: ["i", false, 0b1000, "Italicize text", null],
			underline: ["", false, 0b0000, "Underline text", null], // Default is this is not an active keybinding
			link: ["k", false, 0b1000, "Add a link", null],
			comment: ["c", false, 0b1010, "Add a comment", null],
			checkList: ["(", false, 0b1100, "Checklist", null],
			bulletedList: ["*", false, 0b1100, "Bulleted list", null],
			numberedList: ["&", false, 0b1100, "Checklist", null],
			alignLeft: ["L", false, 0b1100, "Align left", null],
			alignCenter: ["E", false, 0b1100, "Align center", null],
			alignRight: ["R", false, 0b1100, "Align right", null],
			alignJustify: ["J", false, 0b1100, "Align justify", null],
			increaseFontSize: [">", false, 0b1100, "Increase font size", null],
			decreaseFontSize: ["<", false, 0b1100, "Decrease font size", null],
			spellingAndGrammarCheck: ["x", false, 0b1010, "Spelling and grammar check", null],
			clearFormatting: ["\\", false, 0b1000, "Clear formatting", null], // Literal backspace
			normalText: ["0", false, 0b1010, "Apply 'Normal text' styling", null],
			heading1: ["1", false, 0b1010, "Apply 'Heading 1' styling", null],
			heading2: ["2", false, 0b1010, "Apply 'Heading 2' styling", null],
			heading3: ["3", false, 0b1010, "Apply 'Heading 3' styling", null],
			heading4: ["4", false, 0b1010, "Apply 'Heading 4' styling", null],
			heading5: ["5", false, 0b1010, "Apply 'Heading 5' styling", null],
			heading6: ["6", false, 0b1010, "Apply 'Heading 6' styling", null],
			strikethrough: ["%", false, 0b0110, "Strikethrough text", null],
			superscript: [".", false, 0b1000, "Superscript", null],
			subscript: [",", false, 0b1000, "Subscript", null],
			selectAll: ["a", false, 0b1000, "Select All", null],
			open: ["o", false, 0b1000, "Open a file", null],
			seeVersionHistory: ["H", false, 0b1110, "See version history", null],
			findAndReplace: ["h", false, 0b1000, "Find and replace", null],
			footNote: ["f", false, 0b1010, "Add a footnote", null],
			pageBreak: ["Enter", false, 0b1000, "Add a page break", null],
			wordCount: ["C", false, 0b1100, "See word count", null], // TODO: Breaks
			explore: ["I", false, 0b1110, "Explore tab", null],
			dictionary: ["Y", false, 0b1100, "Open dictionary", null],
			voiceTyping: ["S", false, 0b1100, "Use voice typing", null],
			searchTheMenus: ["/", false, 0b0010, "Search docs menus", null],
			hideTheMenus: ["F", false, 0b1100, "Toggle hiding the menus", null],
		}

	}
	else {
		// Mac
		keyMapNative = {
			bold: ["b", false, 0b0001, "Bold text", null],
			italic: ["i", false, 0b0001, "Italicize text", null],
			underline: ["u", false, 0b0001, "Underline text", null],
			link: ["k", false, 0b0001, "Add a link", null],
			comment: ["µ", false, 0b0011, "Add a comment", null],
			checkList: ["9", false, 0b0101, "Checklist", null],
			bulletedList: ["8", false, 0b0101, "Bulleted list", null],
			numberedList: ["7", false, 0b0101, "Checklist", null],
			alignLeft: ["l", false, 0b0101, "Align left", null],
			alignCenter: ["e", false, 0b0101, "Align center", null],
			alignRight: ["r", false, 0b0101, "Align right", null],
			alignJustify: ["j", false, 0b0101, "Align justify", null],
			increaseFontSize: [".", false, 0b0101, "Increase font size", null],
			decreaseFontSize: [",", false, 0b0101, "Decrease font size", null],
			spellingAndGrammarCheck: ["≈", false, 0b0011, "Spelling and grammar check", null],
			clearFormatting: ["\\", false, 0b0001, "Clear formatting", null], // Literal backspace
			normalText: ["º", false, 0b1010, "Apply 'Normal text' styling", null],
			heading1: ["¡", false, 0b0011, "Apply 'Heading 1' styling", null],
			heading2: ["™", false, 0b0011, "Apply 'Heading 2' styling", null],
			heading3: ["£", false, 0b0011, "Apply 'Heading 3' styling", null],
			heading4: ["¢", false, 0b0011, "Apply 'Heading 4' styling", null],
			heading5: ["∞", false, 0b0011, "Apply 'Heading 5' styling", null],
			heading6: ["§", false, 0b0011, "Apply 'Heading 6' styling", null],
			strikethrough: ["x", false, 0b0101, "Strikethrough text", null],
			superscript: [".", false, 0b0001, "Superscript", null],
			subscript: [",", false, 0b0001, "Subscript", null],
			selectAll: ["a", false, 0b0001, "Select All", null],
			open: ["o", false, 0b0001, "Open a file", null],
			seeVersionHistory: ["Ó", false, 0b0111, "See version history", null],
			findAndReplace: ["h", false, 0b0101, "Find and replace", null],
			footNote: ["ƒ", false, 0b0011, "Add a footnote", null], // Not regular "f" key, is another one
			pageBreak: ["Enter", false, 0b0001, "Add a page break", null],
			wordCount: ["c", false, 0b0101, "See word count", null],
			explore: ["ˆ", false, 0b0111, "Explore tab", null],
			dictionary: ["y", false, 0b0101, "Open dictionary", null],
			voiceTyping: ["s", false, 0b0101, "Use voice typing", null],
			searchTheMenus: ["÷", false, 0b0010, "Search docs menus", null],
			hideTheMenus: ["F", false, 0b1100, "Toggle hiding the menus", null],
		}

	}


	if (isMac) {
		// A couple of the keybindings are different on Mac (primarily option (alt) for arrowCtrl keys)
		keyMapN["arrowLeftCtrl"][2] = 0b0010;
		keyMapN["arrowRightCtrl"][2] = 0b0010;
		keyMapN["arrowDownCtrl"][2] = 0b0010;
		keyMapN["arrowUpCtrl"][2] = 0b0010;

		keyMapV["arrowLeftCtrl"][2] = 0b0010;
		keyMapV["arrowRightCtrl"][2] = 0b0010;
		keyMapV["arrowDownCtrl"][2] = 0b0010;
		keyMapV["arrowUpCtrl"][2] = 0b0010;

		keyMapVLine["arrowDownCtrl"][2] = 0b0010;
		keyMapVLine["arrowUpCtrl"][2] = 0b0010;
	}

	return {
		keyMapN: keyMapN,
		keyMapI: keyMapI,
		keyMapR: keyMapR,
		keyMapV: keyMapV,
		keyMapVLine: keyMapVLine,
		keyMapNative: keyMapNative,
	}
}

/*
* Returns the current keymap of the user as an argument to a callback function
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
		let keyMapNames = ["keyMapN", "keyMapI", "keyMapR", "keyMapV", "keyMapVLine", "keyMapNative"];

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
			keyMapR: {},
			keyMapV: {},
			keyMapVLine: {},
			keyMapNative: {},
			incompleteKeyMapN: [],
			// Note: no incompleteKeyMapI because keybindings in insert mode are limited to 1 key
			// Note: no incompleteKeyMapNative for same reasons
			incompleteKeyMapV: [],
			incompleteKeyMapVLine: [],
			incompleteKeyMapNative: [],
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
				outputKeyMap.keyMapN[key][3] = defaultKeyMap.keyMapN[key][3]; // Set the description to the default (in case it was updated)
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapN[key] = defaultKeyMap.keyMapN[key];
			}

			// Add to incompleteKeyMapN if it's a multi-key keybinding
			// EX: D*i*W gets D and D*I stored
			let keyVal = outputKeyMap.keyMapN[key][0];
			// Base case, checking and adding the incomplete key map
			for (let i = 0; i < keyVal.length; i++) {
				if (keyVal[i] === KEY_SEPARATOR) {
					outputKeyMap.incompleteKeyMapN.push(keyVal.slice(0, i));
				}
			}

			// Edge case: For the replace command we also want to just add the whole command as an
			// incomplete key map
			if (key === "replaceCharacter" || key === "f" || key === "t" || key === "F" || key === "T") {
				outputKeyMap.incompleteKeyMapN.push(keyVal);
			}
			
		});

		// keyMapI
		const keyMapIKeys = Object.keys(defaultKeyMap.keyMapI);
		keyMapIKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapI) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapI[key] = savedKeyMap.keyMapI[key];
				outputKeyMap.keyMapI[key][3] = defaultKeyMap.keyMapI[key][3]; // Set the description to the default (in case it was updated)
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapI[key] = defaultKeyMap.keyMapI[key];
			}
		});

		// keyMapR
		const keyMapRKeys = Object.keys(defaultKeyMap.keyMapR);
		keyMapRKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapR) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapR[key] = savedKeyMap.keyMapR[key];
				outputKeyMap.keyMapR[key][3] = defaultKeyMap.keyMapR[key][3]; // Set the description to the default (in case it was updated)
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapR[key] = defaultKeyMap.keyMapR[key];
			}
		});

		// keyMapV
		const keyMapVKeys = Object.keys(defaultKeyMap.keyMapV);
		keyMapVKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapV) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapV[key] = savedKeyMap.keyMapV[key];
				outputKeyMap.keyMapV[key][3] = defaultKeyMap.keyMapV[key][3]; // Set the description to the default (in case it was updated)
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
				outputKeyMap.keyMapVLine[key][3] = defaultKeyMap.keyMapVLine[key][3]; // Set the description to the default (in case it was updated)
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

		// keymapNative
		const keyMapNativeKeys = Object.keys(defaultKeyMap.keyMapNative);
		keyMapNativeKeys.forEach((key) => {
			if (key in savedKeyMap.keyMapNative) {
				// Set the keybinding to the one in the storage keymap
				outputKeyMap.keyMapNative[key] = savedKeyMap.keyMapNative[key];
				outputKeyMap.keyMapNative[key][3] = defaultKeyMap.keyMapNative[key][3]; // Set the description to the default (in case it was updated)
			}
			else {
				// Set the keybinding to the default
				outputKeyMap.keyMapNative[key] = defaultKeyMap.keyMapNative[key];
			}

			// Add to incompleteKeyMapNative if it's a multi-key keybinding
			let keyVal = outputKeyMap.keyMapNative[key][0];
			for (let i = 0; i < keyVal.length; i++) {
				if (keyVal[i] === KEY_SEPARATOR) {
					outputKeyMap.incompleteKeyMapNative.push(keyVal.slice(0, i));
				}
			}

		});

		// Now, outputKeyMap is fully populated with the keybindings
		// Call the callback function with outputKeyMap as an argument
		callback(outputKeyMap);

    });

}