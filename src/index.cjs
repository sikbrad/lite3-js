/**
 * Lite3 - CommonJS Entry Point
 *
 * This file provides CommonJS compatibility for the Lite3 library.
 * For the full implementation, see index.js (ESM).
 *
 * Inspired by https://github.com/fastserial/lite3
 */

'use strict';

// Note: This is a placeholder for CommonJS support.
// In a real-world scenario, you would use a bundler like esbuild or rollup
// to generate this file from the ESM source.

const message = 'lite3: Please use ES modules (import) or a bundler that supports ESM. ' +
  'CommonJS support requires building with a bundler.';

console.warn(message);

module.exports = {
  get Lite3() {
    throw new Error(message);
  }
};
