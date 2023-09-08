const path = require('path');

// We will use this to insert a comment into the beginning of our bundle.js
class BannerPlugin {
  constructor(options) {
    this.banner = options.banner;
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, callback) => {
      compilation.chunks.forEach(chunk => {
        chunk.files.forEach(filename => {
          const asset = compilation.assets[filename];
          asset._value = this.banner + asset._value; // append banner
        });
      });

      callback();
    });
  }
}

// This must have the "//" and "\n" components to work properly (otherwise code will fail)
let banner = "// Vim for Google Docs. By using this extension you agree to the Terms and Conditions (vimfordocs.com/terms) and Privacy Policy (vimfordocs.com/privacy-policy). Sharing, or publication of any form of this code with others is not permitted. \n";

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
  },
  plugins: [
    new BannerPlugin({banner}),
  ]
}
