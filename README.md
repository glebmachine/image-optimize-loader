# image-optimize-loader

Optimize images with global caching and non-transparent png to jpg conversion (on the go)
> Rework of https://github.com/tcoopman/image-webpack-loader

## Install

```sh
$ npm install image-optimize-loader --save-dev
```

## Usage

```javascript
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

```
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

Comes bundled with the following optimizers:
- [mozjpeg](https://github.com/imagemin/imagemin-mozjpeg) — *Compress JPEG images*
- [svgo](https://github.com/kevva/imagemin-svgo) — *Compress SVG images*
- [pngquant](https://github.com/imagemin/imagemin-pngquant) — *Compress PNG images*

## License

MIT (http://www.opensource.org/licenses/mit-license.php)
