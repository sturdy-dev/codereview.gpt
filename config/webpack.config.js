'use strict';

const { merge } = require('webpack-merge');
const webpack = require('webpack');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
  merge(common, {
    entry: {
      popup: PATHS.src + '/popup.js',
      options: PATHS.src + '/options.js',
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
    experiments: {
      asyncWebAssembly: true,
    },
    plugins: [
      // Work around for Buffer is undefined:
      // https://github.com/webpack/changelog-v5/issues/10
      new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
      })      
    ],    
  });

module.exports = config;
