'use strict';

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');

const loaderUtils = require('loader-utils');
const crypto = require('crypto');
const path = require('path');
const Q = require('q');

const PNG = require('pngjs').PNG;
const gm = require('gm');
const streamifier = require('streamifier');

const Cache = require('async-disk-cache');
const cache = new Cache('image-optimize-loader', { supportBuffer: true });

function getHashOf(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function debug() {
  const args = Array.prototype.slice.call(arguments);
  args.unshift('debug');
  console.log.apply(console, args);
}

const defaultSettings = {
  optimizer: {
    covertPngToJpg: true,
  },
  pngquant: {
    quality: '65-80',
    speed: 4,
  },
  mozjpeg: {
    targa: false,
  },
  svgo: {
    plugins: [
      { removeComments: true },
      { sortAttrs: true },
      { minifyStyles: true },
    ],
  },
};

module.exports = function (content) {
  const isWebpack2 = !!this.remainingRequest;
  const callback = this.async();
  const config = loaderUtils.getLoaderConfig(this, 'imageOptimizeLoader') || {};

  const fileName = this.request.split('!').pop();
  const fileHash = getHashOf(content);
  const fileExt = path.extname(fileName).replace(/^./, '');
  let cacheKey = getHashOf(fileName);

  // extend default configs
  const settings = {};

  settings.optimizer = Object.assign({},
    defaultSettings.optimizer,
    config.optimizer || {});

  settings.mozjpeg = Object.assign({},
    settings.optimizer,
    defaultSettings.mozjpeg,
    config.mozjpeg || {});

  settings.pngquant = Object.assign({},
    settings.optimizer,
    defaultSettings.pngquant,
    config.pngquant || {});

  settings.svgo = Object.assign({},
    settings.optimizer,
    defaultSettings.svgo,
    config.svgo || {});

  // add settings to cacheKey by extension
  switch (fileExt) {
  case 'png':
    cacheKey = getHashOf(JSON.stringify([cacheKey, settings.pngquant, isWebpack2]));
    break;
  case 'jpg':
    cacheKey = getHashOf(JSON.stringify([cacheKey, settings.mozjpeg]));
    break;
  case 'svg':
    cacheKey = getHashOf(JSON.stringify([cacheKey, settings.svgo]));
    break;
  default:
    break;
  }

  const promiseOptimizeImage = Q.defer();
  const promisePrepareImage = Q.defer();
  const promiseCacheExists = Q.defer();

  debug('file: ', fileName);

  // ensure cache exists
  promiseCacheExists.promise.then(() => {
    Q.all([
      cache.has(cacheKey),
      cache.has(`${cacheKey}-checksum`),
    ]).then(checks => {
      promisePrepareImage.resolve();

      // if cache is not found
      if (!checks[0] || !checks[1]) {
        debug('> cache not found, optimize');
        promisePrepareImage.resolve();
        return;
      }

        // check is cache up to date
      cache.get(`${cacheKey}-checksum`).then(results => {
          // if file not changed, return cached value
        if (results.value === fileHash) {
          cache.get(cacheKey).then(cacheEntry => {
            promisePrepareImage.reject();
            debug('> from cache');
            return callback(null, cacheEntry.value);
          }).catch(callback);

          // cache is outdated, create new image
        } else {
          debug('> cache outdated');
          promisePrepareImage.resolve();
        }
      });
    }).catch(callback);
  });

  promisePrepareImage.promise.then(() => {
    if (settings.optimizer.covertPngToJpg && fileExt === 'png' && isWebpack2) {
      streamifier.createReadStream(content)
        .pipe(new PNG())
        .on('metadata', data => {
          if (data.alpha) {
            return promiseOptimizeImage.resolve();
          }

          // if alpha not found - convert buffer to jpg
          this.resource = this.resource.replace(/.png$/, '.jpg');
          gm(content).toBuffer('JPG', (err, buffer) => {
            if (err) {
              return callback(err);
            }

            content = buffer;
            promiseOptimizeImage.resolve();

            return false;
          });

          return false;
        });
    } else {
      promiseOptimizeImage.resolve();
    }
  });

  promiseOptimizeImage.promise.then(() => {
    debug('optimization started');

    imagemin.buffer(content, {
      plugins: [
        imageminMozjpeg(settings.mozjpeg),
        imageminPngquant(settings.pngquant),
        imageminSvgo(settings.svgo),
      ],
    }).then(file => {
      debug('optimization completed');
      cache.set(cacheKey, file);
      cache.set(`${cacheKey}-checksum`, fileHash);
      callback(null, file);
    }).catch(callback);
  }).catch(callback);

  promiseCacheExists.resolve();
};

module.exports.raw = true;
