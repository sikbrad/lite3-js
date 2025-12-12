/**
 * Lite3 Buffer Utilities
 *
 * Low-level utilities for working with binary buffers.
 * Handles reading/writing primitive types in little-endian format.
 *
 * @see https://github.com/fastserial/lite3
 */

import { Node } from './constants.js';

/**
 * Create a DataView from a Uint8Array
 *
 * @param {Uint8Array} buffer - The buffer
 * @returns {DataView} DataView for the buffer
 */
export function getDataView(buffer) {
  return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Read a 32-bit unsigned integer at offset (little-endian)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @returns {number} 32-bit unsigned integer
 */
export function readUint32(buffer, offset) {
  const view = getDataView(buffer);
  return view.getUint32(offset, true);
}

/**
 * Write a 32-bit unsigned integer at offset (little-endian)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @param {number} value - Value to write
 */
export function writeUint32(buffer, offset, value) {
  const view = getDataView(buffer);
  view.setUint32(offset, value >>> 0, true);
}

/**
 * Read a 64-bit signed integer at offset (little-endian)
 * Returns as BigInt for full precision
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @returns {bigint} 64-bit signed integer
 */
export function readInt64(buffer, offset) {
  const view = getDataView(buffer);
  return view.getBigInt64(offset, true);
}

/**
 * Write a 64-bit signed integer at offset (little-endian)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @param {bigint|number} value - Value to write
 */
export function writeInt64(buffer, offset, value) {
  const view = getDataView(buffer);
  view.setBigInt64(offset, BigInt(value), true);
}

/**
 * Read a 64-bit float at offset (little-endian)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @returns {number} 64-bit float
 */
export function readFloat64(buffer, offset) {
  const view = getDataView(buffer);
  return view.getFloat64(offset, true);
}

/**
 * Write a 64-bit float at offset (little-endian)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @param {number} value - Value to write
 */
export function writeFloat64(buffer, offset, value) {
  const view = getDataView(buffer);
  view.setFloat64(offset, value, true);
}

/**
 * Read a variable-length unsigned integer (1-4 bytes)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @param {number} byteCount - Number of bytes (1-4)
 * @returns {number} Unsigned integer
 */
export function readVarUint(buffer, offset, byteCount) {
  let value = 0;
  for (let i = 0; i < byteCount; i++) {
    value |= buffer[offset + i] << (i * 8);
  }
  return value >>> 0;
}

/**
 * Write a variable-length unsigned integer (1-4 bytes)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Byte offset
 * @param {number} value - Value to write
 * @param {number} byteCount - Number of bytes (1-4)
 */
export function writeVarUint(buffer, offset, value, byteCount) {
  for (let i = 0; i < byteCount; i++) {
    buffer[offset + i] = (value >> (i * 8)) & 0xFF;
  }
}

/**
 * Align an offset to the specified alignment
 *
 * @param {number} offset - Current offset
 * @param {number} alignment - Required alignment (power of 2)
 * @returns {number} Aligned offset
 */
export function alignOffset(offset, alignment = Node.ALIGNMENT) {
  const mask = alignment - 1;
  return (offset + mask) & ~mask;
}

/**
 * Check if an offset is properly aligned
 *
 * @param {number} offset - Offset to check
 * @param {number} alignment - Required alignment
 * @returns {boolean} True if aligned
 */
export function isAligned(offset, alignment = Node.ALIGNMENT) {
  return (offset & (alignment - 1)) === 0;
}

/**
 * Copy bytes between buffers
 *
 * @param {Uint8Array} dest - Destination buffer
 * @param {number} destOffset - Destination offset
 * @param {Uint8Array} src - Source buffer or data
 * @param {number} srcOffset - Source offset
 * @param {number} length - Number of bytes to copy
 */
export function copyBytes(dest, destOffset, src, srcOffset, length) {
  for (let i = 0; i < length; i++) {
    dest[destOffset + i] = src[srcOffset + i];
  }
}

/**
 * Fill bytes with a value
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Start offset
 * @param {number} length - Number of bytes
 * @param {number} value - Value to fill (0-255)
 */
export function fillBytes(buffer, offset, length, value = 0) {
  for (let i = 0; i < length; i++) {
    buffer[offset + i] = value;
  }
}

/**
 * Encode a string to UTF-8 bytes
 *
 * @param {string} str - String to encode
 * @returns {Uint8Array} UTF-8 encoded bytes
 */
export function encodeString(str) {
  return new TextEncoder().encode(str);
}

/**
 * Decode UTF-8 bytes to string
 *
 * @param {Uint8Array} bytes - UTF-8 bytes
 * @param {number} offset - Start offset
 * @param {number} length - Number of bytes
 * @returns {string} Decoded string
 */
export function decodeString(bytes, offset, length) {
  return new TextDecoder().decode(bytes.subarray(offset, offset + length));
}
