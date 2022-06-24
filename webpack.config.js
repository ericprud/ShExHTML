const path = require("path")

module.exports = {
  entry : "./doc/asTree.js",
  output : {
    path: path.resolve(__dirname, "doc"),
    filename: "asTree.webpack.js"
  },
  resolve: {
    fallback: { "url": false }
  },
  optimization: {
    // minimize: false
  },
}
