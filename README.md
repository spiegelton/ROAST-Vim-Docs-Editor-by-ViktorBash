# Vim-Docs-Editor
A Chrome extension that allows you to use Vim keybindings in Google Docs.

### How To Run Locally
- `npm install` to install the dependencies (just webpack basically)
- `webpack --watch` to have `dist/bundle.js` update automatically
- Make sure `Developer mode` is turned on in Chrome and then use the `Load unpacked` button to load in the project

### Chrome Web Store Update Procedure:
- Copy and paste everything into a new folder
- Delete:
  - `.git/`
  - `.vscode/`
  - `.idea/`
  - `.gitignore`
  - `icons/base_logo.svg`
  - `README.md`
  - `docs.js`
  - `main.js`,
  - `webpack.config.js`
  - `package-lock.json`
  - `package.json`
  - `vim/macVim.js`
  - `vim/windowsVim.js`
  - `vim/UI.js`
  - `node_modules/`
- Test that it works on both Windows and Mac extensively. You can zip this new folder and upload it to Google Drive
to get it to the other device.
- Zip the folder and upload the zipped folder to the Chrome Web Store, submit the update
- After updating, copy everything in the folder to `Vim-Docs-Editor-RELEASE`
  - Add everything to git
  - Commit and push the changes with the commit message mentioning the release version


### Technical Inspiration
Project based off both repos below (which are both open source MIT license):

- https://github.com/matthewsot/docs-plus
- https://github.com/matthewsot/docs-vim

SheetsKeys (open source MIT license also) was the inspiration for the docs._simulateClick() function for pressing
menu buttons.
- https://github.com/philc/sheetkeys


### Architecture:
**Core:** `docs.js` and the JavaScript in the `vim` folder
- `docs.js` interacts directly with the Google Docs to serve as a layer of abstraction, so that you can just
call functions like `docs.isTextSelected()`
- `windowsVim.js` and `macVim.js` contain the respective copies of vim and are the majority of the programming. 
Here you find the handling of keys in all the modes
- `keybindings.js` is responsible for getting the keybindings and also saving them to local storage, with functions
that other scripts can access. The default keybindings are also stored here
- `UI.js` handles the 2 UI elements: the mode bar and the command bar at the bottom of the docs screen
- `main.js` is the entry point for the extension when it is loaded onto a Google Docs page. It 
decides logic on whether the user has paid or not, and then runs the appropriate vim variant after setting it up.
    - It also handles the logic for switching modes based on mouse movement/clicks
- `background.js` runs required things in the background and also looks out for if we just installed or updated the extension
- `shortcuts.js` runs on the shortcuts page and primarily handles editing/saving keybindings to the keymap
- `popup.js` runs on the popup page for the extension that shows user info and paying/etc
- `toggleUpdate.js` runs on the changelog page and just handles whether the user has notifications for updates selected or not

### How To Use/Release On FireFox
To be able to use the extension on FireFox, `manifest.json` needs a couple of changes.
  - Change the `background` line to:
```json
"scripts": ["background.js"]
```
  - Add this code segment also
```json
"browser_specific_settings": {
  "gecko": {
    "id": "support@vimfordocs.com"
  }
}
```
