const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    main: [
      "./docs.js",
      "./main.js",
      "./vim/baseVim.js",
      "./vim/macVim.js",
      "./vim/windowsVim.js",
      "./vim/UI.js"
    ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: [".js"]
  }
}
