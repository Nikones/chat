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
    extensions: ['.js', '.jsx'],
    fallback: {
      "crypto": false  // Отключаем необходимость в crypto модуле
    }
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
    allowedHosts: 'all',
    host: '0.0.0.0',
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    client: {
      webSocketURL: {
        hostname: 'chat.kikita.ru',
        pathname: '/ws',
        protocol: 'wss',
      },
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ]
};
