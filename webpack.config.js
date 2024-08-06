const path = require('path');

module.exports = [
  // UMD build
  {
    entry: './src/index.js',
    output: {
      filename: 'oops.min.js',
      path: path.resolve(__dirname, 'dist'),
      library: 'Oops',
      libraryTarget: 'umd',
      globalObject: 'this'
    },
    mode: 'development',
    devtool: 'source-map',
  },
];
