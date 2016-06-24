# image-optimize-loader
Optimize images with global caching and covertion of non-transparent png to jpg (on the fly)
> Rework of https://github.com/tcoopman/image-webpack-loader

## Features
 - Opmitize images with `pngquant`/`mozjpeg`/`svgo` (like image-webpack-loader)
 - Cache results into your OS `tmp` folder 

## Webpack 2.0 features
 - Convert non-transparent `png` images into `jpg` (due up to 7x size reduction)

## Install

```sh
$ npm install image-optimize-loader --save-dev
```

## Usage
```js
loaders: [
    {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loaders: [
            'file?hash=sha512&digest=hex&name=[hash].[ext]',
            'image-optimize'
        ]
    }
]
```

## Configuration
```js
{ // default configuration example
  imageOptimizeLoader: {
    optimizer: {
      covertPngToJpg:true
    },
    pngquant: {
      quality: '65-80',
      speed: 4
    },
    mozjpeg:{
      targa: false,
    },
    svgo: {
      plugins:[
        { removeComments: true },
        { sortAttrs: true },
        { minifyStyles: true },
      ]
    }
}
```
## License
MIT (http://www.opensource.org/licenses/mit-license.php)
