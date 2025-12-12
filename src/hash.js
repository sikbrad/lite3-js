/**
 * Lite3 Hash Functions
 *
 * DJB2 hash algorithm implementation for key hashing.
 * Used for B-tree key lookups.
 *
 * @see https://github.com/fastserial/lite3
 */

import { DJB2_HASH_SEED } from './constants.js';

/**
 * Calculate DJB2 hash for a string key
 *
 * The DJB2 hash algorithm is a simple and fast string hash function.
 * Formula: hash = ((hash << 5) + hash) + char
 *
 * @param {string} key - The key string to hash
 * @returns {number} 32-bit unsigned hash value
 */
export function djb2Hash(key) {
  let hash = DJB2_HASH_SEED;

  for (let i = 0; i < key.length; i++) {
    const charCode = key.charCodeAt(i) & 0xFF;
    // hash * 33 + charCode
    hash = ((hash << 5) + hash + charCode) >>> 0;
  }

  return hash >>> 0;
}

/**
 * Calculate key data including hash and size
 *
 * @param {string} key - The key string
 * @returns {{ hash: number, size: number }} Key data object
 */
export function getKeyData(key) {
  return {
    hash: djb2Hash(key),
    // Size includes null terminator (like in C)
    size: new TextEncoder().encode(key).length + 1,
  };
}

/**
 * Calculate key tag size based on key size
 * Key tag encodes both the tag size itself and the key size
 *
 * @param {number} keySize - Size of the key in bytes
 * @returns {number} Key tag size (1-4 bytes)
 */
export function getKeyTagSize(keySize) {
  if (keySize > 0x3FFFFF) return 4;  // > 22 bits
  if (keySize > 0x3FFF) return 3;    // > 14 bits
  if (keySize > 0x3F) return 2;      // > 6 bits
  return 1;
}
