'use strict';
const log = require('npmlog');
log.level = 'silly';
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const common = require('./common');
const myLocalIp = require('my-local-ip');
const plugins = [];

const root = __dirname;

const MODE_DEV_SERVER = process.argv[1].indexOf('webpack-dev-server') > -1 ? true : false;
const LAZY_MODE = process.argv.indexOf('--lazy') > -1 ? true : false;
const CLEAN_ONLY = process.argv.indexOf('--clean-only') > -1 ? true : false;// webpack --clean-only (useful to cleanup the build folder)

log.info('webpack', 'Launched in ' + (MODE_DEV_SERVER ? 'dev-server' : 'build') + ' mode');

/** environment setup */

const NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : 'dev';
const DEVTOOLS = process.env.DEVTOOLS ? JSON.parse(process.env.DEVTOOLS) : false;
const API_ROOT_URL = process.env.API_ROOT_URL ? process.env.API_ROOT_URL : 'https://api.github.com';
const DISABLE_LINTER = process.env.DISABLE_LINTER ? JSON.parse(process.env.DISABLE_LINTER) : false;
const TRAVIS = process.env.TRAVIS ? JSON.parse(process.env.TRAVIS) : false;
const LOCALHOST = process.env.LOCALHOST ? JSON.parse(process.env.LOCALHOST) : true;

const SOURCEMAPS_ACTIVE = NODE_ENV !== 'production' || DEVTOOLS === true;

if(TRAVIS) {
  log.info('webpack', 'TRAVIS mode (will fail on error)');
}
if(NODE_ENV === 'production'){
  log.info('webpack', 'PRODUCTION mode');
}
else if(NODE_ENV === 'mock'){
  log.info('webpack', 'MOCK mode');
}
else{
  log.info('webpack', 'DEVELOPMENT mode');
}
if(DEVTOOLS){
  log.info('webpack', 'DEVTOOLS active');
}
if(LAZY_MODE){
  log.info('webpack', 'LAZY_MODE active (won\'t hot reload - will only build on request)');
}

if( !(/^https?:\/\/.*(?!\/).$/.test(API_ROOT_URL)) ) {
  log.warn('webpack', 'Your API_ROOT_URL should not have any trailing slash');
}
log.info('webpack', `API_ROOT_URL ${API_ROOT_URL}`);
if(SOURCEMAPS_ACTIVE){
  log.info('webpack', 'SOURCEMAPS activated');
}

const hash = (NODE_ENV === 'production' && DEVTOOLS ? '-devtools' : '') + (NODE_ENV === 'production' ? '-[hash]' : '');

/** plugins setup */

if(!TRAVIS) {
  plugins.push(new webpack.NoErrorsPlugin());
}
// extract css into one main.css file
plugins.push(new ExtractTextPlugin('css/main' + hash + '.css',{
  disable: false,
  allChunks: true
}));
plugins.push(new webpack.BannerPlugin(common.getBanner()));
plugins.push(new webpack.DefinePlugin({
  // React library code is based on process.env.NODE_ENV (all development related code is wrapped inside
  // a conditional that can be dropped if equal to "production" - this way you get your own react.min.js build)
  'process.env':{
    'NODE_ENV': JSON.stringify(NODE_ENV),
    'DEVTOOLS': DEVTOOLS, // I rely on the variable bellow to make a bundle with the redux devtools (or not)
    'API_ROOT_URL': JSON.stringify(API_ROOT_URL), // The httpClient will rely on that (change it at will)
    'DISABLE_LINTER': DISABLE_LINTER // Simply to log in browser console if linting is on or off
  }
}));

if(NODE_ENV === 'production' && DEVTOOLS !== true){
  plugins.push(new webpack.optimize.DedupePlugin());
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress:{
      warnings: true
    }
  }));
}

if(MODE_DEV_SERVER === false){
  log.info('webpackbuild', `rootdir: ${root}`);
  //write infos about the build (to retrieve the hash) https://webpack.github.io/docs/long-term-caching.html#get-filenames-from-stats
  plugins.push(function() {
    this.plugin("done", function(stats) {
      require("fs").writeFileSync(
        path.join(__dirname, "build", "stats.json"),
        JSON.stringify(stats.toJson()));
    });
  });
}
else {
  if(LOCALHOST) {
    log.info('webpack', 'Check http://localhost:8080');
  }
  else {
    log.info('webpack', 'Check http://' + myLocalIp() + ':8080');
  }
}

/** preloaders */

const preloaders = [];

if(DISABLE_LINTER) {
  log.info('webpack', 'LINTER DISABLED');
}
else{
  log.info('webpack', 'LINTER ENABLED');
  preloaders.push({
    test: /\.js(x?)$/,
    exclude: /node_modules/,
    loader: 'eslint-loader'
  });
}

/** before build */

//in build mode, cleanup build folder before - since we can build two versions (production & devtools) in a row, skip delete for the devtools
if(MODE_DEV_SERVER === false && DEVTOOLS === false){
  log.info('webpackbuild', 'Cleaning ...');
  const deleted = require('del').sync([
    root + '/build/*',
    root + '/build/**/*',
    root + '/build/!.git/**/*'
  ]);
  deleted.forEach(function(e){
    console.log(e);
  });
  if (CLEAN_ONLY) {
    log.info('webpackbuild', 'CLEAN_ONLY mode, exiting clean without going further');
    process.exit(0);
  }
}
else if(MODE_DEV_SERVER === false && DEVTOOLS === true){
  log.info('webpackbuild', 'Not cleaning up build/ folder for this pass (not in devtools mode)');
}

/** webpack config */

var config = {
  bail: TRAVIS,
  entry: {
    "js/bundle": "./src/bootstrap.js",
    "css/main": "./src/style/main.scss"
  },
  output: {
    publicPath: "assets/",
    filename: "[name]" + hash + ".js",
    chunkFilename: 'js/[id]'  + hash + '.chunk.js',
    path: "./build/assets"
  },
  cache: true,
  debug: NODE_ENV === 'production' ? false : true,
  devtool: SOURCEMAPS_ACTIVE ? "sourcemap" : false,
  devServer: {
    contentBase: './public',
    inline: true,
    host: LOCALHOST ? 'localhost' : myLocalIp()
},
  module: {
    preLoaders: preloaders,
    loaders: [
      {
        test: /\.js(x?)$/,
        exclude: /node_modules/,
        loader: (MODE_DEV_SERVER && !TRAVIS ? 'react-hot!' : '') + 'babel-loader'
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.scss/,
        loader: ExtractTextPlugin.extract("style-loader",
          "css-loader?sourceMap!sass-loader?sourceMap=true&sourceMapContents=true&outputStyle=expanded&" +
          "includePaths[]=" + (path.resolve(__dirname, "./node_modules"))
        )
      },
      {
        test: /\.css/,
        loader: 'style-loader!css-loader'
      },
      {test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" },
      { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
    ]
  },
  plugins: plugins,
  node:{
    console: true,
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
};

module.exports = config;
