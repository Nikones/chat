const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Загрузка переменных окружения из .env файла
const env = dotenv.config().parsed || {};

// Создание объекта с переменными окружения для DefinePlugin
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  mode: 'development',
  devtool: 'eval-source-map',
  entry: {
    main: ['./src/polyfills/process.js', './src/index.jsx']
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      // Алиас для process/browser, чтобы использовать наш полифилл
      'process/browser': path.resolve(__dirname, 'src/polyfills/process.js'),
      process: path.resolve(__dirname, 'src/polyfills/process.js')
    },
    fallback: {
      path: false,
      fs: false,
      os: false
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource'
      }
    ]
  },
  devServer: {
    historyApiFallback: true,
    port: 3000,
    hot: true,
    allowedHosts: 'all',
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://server:9095',
        secure: false,
        changeOrigin: true
      },
      '/api/ws': {
        target: 'ws://server:9091',
        secure: false,
        ws: true
      }
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico'
    }),
    // Эксплицитно определяем process.env
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: 'development',
        ...Object.keys(env).reduce((acc, key) => {
          acc[key] = env[key];
          return acc;
        }, {})
      }),
      'process.env.NODE_ENV': JSON.stringify('development')
    }),
    // Обеспечиваем доступность нашего полифилла process
    new webpack.ProvidePlugin({
      process: [path.resolve(__dirname, 'src/polyfills/process.js'), 'default']
    })
  ]
};
