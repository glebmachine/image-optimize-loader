'use strict';
const pjson = require('./package.json');

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
const cache = new Cache(`image-optimize-loader-${pjson.version}`, { supportBuffer: true });
const TaskQueue = require('task-queue-async');
const asyncQueue = new TaskQueue({
  sleepBetweenTasks: 1,
  concurrency: 4,
});
// let concurrency = 0;

function getHashOf(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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
  const checkCacheExists = Q.defer();


  function startOptimization() {
    asyncQueue.addTask(function () {
      // concurrency++;
      // console.log(`\r optimize:start ${concurrency}`);

      const completePromise = Q.defer();
      promisePrepareImage.resolve(completePromise);
      completePromise.promise.then(this.wrapCallback(() => {
        // concurrency--;
        // console.log(`\r optimize:finished ${concurrency}`);
      }))
      .catch(callback);
    });
  }

  // ensure cache exists
  checkCacheExists.promise.then(() => {
    Q.all([
      cache.has(cacheKey).catch(callback),
      cache.has(`${cacheKey}-checksum`).catch(callback),
    ]).then(checks => {
      // if cache is not found
      if (!checks[0] || !checks[1]) {
        startOptimization();
        return;
      }

      // check is cache up to date
      cache.get(`${cacheKey}-checksum`).then(results => {
        const data = JSON.parse(results.value);

          // if file not changed, return cached value
        if (data.fileHash === fileHash) {
          cache.get(cacheKey).then(cacheEntry => {
            this.resource = data.resource;
            promisePrepareImage.reject();
            return callback(null, cacheEntry.value);
          }).catch(callback);

          // cache is outdated, create new image
        } else {
          startOptimization();
        }
      }).catch(callback);
    }).catch(callback);
  }).catch(callback);

  promisePrepareImage.promise.then((completePromise) => {
    if (settings.optimizer.covertPngToJpg && fileExt === 'png' && isWebpack2) {
      streamifier.createReadStream(content)
        .pipe(new PNG())
        .on('metadata', data => {
          if (data.alpha) {
            return promiseOptimizeImage.resolve(completePromise);
          }

          // if alpha not found - convert buffer to jpg
          gm(content).toBuffer('JPG', (err, buffer) => {
            if (err) {
              return callback(err);
            }

            this.resource = this.resource.replace(/.png$/, '.jpg');
            content = buffer;
            promiseOptimizeImage.resolve(completePromise);

            return false;
          });

          return false;
        });
    } else {
      promiseOptimizeImage.resolve(completePromise);
    }
  }).catch(callback);

  promiseOptimizeImage.promise.then((completePromise) => {
    imagemin.buffer(content, {
      plugins: [
        imageminMozjpeg(settings.mozjpeg),
        imageminPngquant(settings.pngquant),
        imageminSvgo(settings.svgo),
      ],
    }).then(file => {
      cache.set(cacheKey, file);
      cache.set(`${cacheKey}-checksum`, JSON.stringify({
        fileHash,
        resource: this.resource,
      }));

      completePromise.resolve();
      callback(null, file);
    }).catch(callback);
  }).catch(callback);

  checkCacheExists.resolve();
};

module.exports.raw = true;
