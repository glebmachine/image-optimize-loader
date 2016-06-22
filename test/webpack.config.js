'use strict';

var path = require('path');

module.exports = [
  {
    name: 'browser',
    entry: './app.js',
    output: {
      path: path.join(__dirname, 'public/assets'),
      publicPath: 'assets/',
      filename: 'app.js'
    },
    resolve: {
      extensions: ['', '.js']
    },
    module: {
      loaders: [
        {
          test: /.*\.(gif|png|jpe?g|svg)$/i,
          loaders: [
            'file?name=[name].[ext]',
            '../index.js',
          ],
        },
      ],
    },
  },
];
