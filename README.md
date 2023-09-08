# Vim-Docs-Editor
A Chrome extension that allows you to use Vim keybindings in Google Docs.

### How To Run Locally
- `webpack --watch` to have `dist/bundle.js` update automatically

### Chrome Web Store Update Procedure:
- Copy and paste everything except `.git/` into the other repo, titled `Vim-Docs-Editor-RELEASE`
- Delete `.gitignore`, `.vscode/`, `icons/base_logo.svg`, `README.md`, `webpack.config.js`, `docs.js`, and `main.js`
- Clone this into another repo, delete `.git/`, test that it works, zip it, and upload it to the Chrome Web Store
- In `Vim-Docs-Editor-RELEASE`, add the changes to git and commit them

### Technical Inspiration
Project based off both repos below (which are both open source MIT license):

- https://github.com/matthewsot/docs-plus
- https://github.com/matthewsot/docs-vim



### Not Used
- Be in the `dist` directory
terser bundle.js -c -m --mangle-props reserved=[$,macVim,baseVim,windowsVim,UI,docs,extpay,updateUIModeText,updateUISequenceText,import,ExtPay]
