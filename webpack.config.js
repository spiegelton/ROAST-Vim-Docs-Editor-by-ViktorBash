const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    main: [
      "./jquery_min.js",
      "./docs.js",
      "./main.js"
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
