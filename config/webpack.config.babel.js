const path = require('path');
const uglify = require('uglifyjs-webpack-plugin');

const ROOT_PATH = path.resolve(__dirname);

module.exports = {
  mode: 'none',

  entry: path.resolve(ROOT_PATH, '../polyv-upload.js'),
  output: {
    path: path.resolve(ROOT_PATH, '../'),
    filename: 'polyv-upload.min.js',
    library: undefined,
    libraryTarget: 'umd'
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }]
  },

  plugins: [
    new uglify()
  ]
};