'use strict';

const chai = require('chai');
const assert = chai.assert;
const fs = require('fs');
chai.use(require('chai-fs'));

describe('image-optimize-loader tests', () => {

  // it('assert all default files exists', () => {
  //   assert.isFile('./results/default/test.jpg', 'message');
  //   assert.isFile('./results/default/test.png', 'message');
  //   assert.isFile('./results/default/test.svg', 'message');
  //   assert.isFile('./results/default/test-noalpha.jpg', 'message');
  // });

  describe('SVG:', () => {
    it('assert file exists', () => {
      assert.isFile('./results/default/test.svg');
    });
    it('assert minified file equal to referenced', () => {
      const currentFile = fs.readFileSync('./results/default/test.svg').toString();
      const expectedFile = fs.readFileSync('./expectation/test.svg').toString();
      assert.equal(currentFile, expectedFile, 'new file are equal to reference');
    });
  });

  describe('JPG:', () => {
    it('assert file exists', () => {
      assert.isFile('./results/default/test.jpg');
    });
    it('assert minified file equal to referenced', () => {
      const currentFile = fs.readFileSync('./results/default/test.jpg').toString();
      const expectedFile = fs.readFileSync('./expectation/test.jpg').toString();
      assert.equal(currentFile, expectedFile, 'new file are equal to reference');
    });
  });

  describe('PNG:', () => {
    it('assert file exists', () => {
      assert.isFile('./results/default/test.png');
    });
    it('assert minified file equal to referenced', () => {
      const currentFile = fs.readFileSync('./results/default/test.png').toString();
      const expectedFile = fs.readFileSync('./expectation/test.png').toString();
      assert.equal(currentFile, expectedFile, 'new file are equal to reference');
    });
  });
});