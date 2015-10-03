var path = require('path');
module.exports = {
  entry: './lib/newP.js',
  output: {
    path: __dirname,
    filename: './dist/bundle.js',
    library: 'doubleW',
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  module: {
    loaders: [
      { test: path.join(__dirname, 'lib'),
        loader: 'babel-loader',
      },
    ],
  },

  // devServer: {
  //   historyApiFallback: true,
  //   hot: true,
  //   inline: true,
  //   progress: true,
  //   port: 8090,
  // },
};
