module.exports = {
  entry: "./src_es6/epub.js",
  output: {
    filename: "./dist_es6/epub.js"
  }, 
  module: {
  	loaders: [
		  {
		    test: /\.js$/,
		    exclude: /node_modules/,
		    loader: 'babel-loader',
		    query: {
		      presets: ['es2015'] 
		    }
		  }
    ]
  },
  resolve: {
    extensions: ['', '.js']
  },
}