const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  devServer: {
    historyApiFallback: true,
    port: 3000,
    hot: true,
    allowedHosts: 'all',  // Разрешает все хосты
    host: '0.0.0.0',      // Слушать на всех интерфейсах
    proxy: {
      '/api': {
        target: 'http://server:9095', // Обновлено на новый порт 9095
        secure: false,
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://server:9091', // WebSocket порт остается прежним
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
      template: './public/index.html'
    })
  ]
};
