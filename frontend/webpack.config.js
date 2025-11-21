const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/App.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        include: path.resolve(__dirname, "src"),
        use: [
          { loader: "style-loader" },
          { loader: "css-loader" },
          { loader: "postcss-loader" }
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: false,
    })
  ],
  devServer: {
    static: path.join(__dirname, 'dist'),
    historyApiFallback: {
      index: 'index.html'
    },
    compress: true,
    port: 8090,
    proxy: [
      {
        context: ['/api/v1'],
        target: 'http://localhost:9999',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
        // pathRewrite: { '^/api/v1': '' },
      }
    ],
  }
};
