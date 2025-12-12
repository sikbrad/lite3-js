/**
 * Lite3 Node Operations
 *
 * B-tree node structure and operations for Lite3 binary format.
 * Each node contains keys, values, and child pointers.
 *
 * Node Structure (96 bytes):
 *   [0-3]    gen_type:   generation (24 MSB) + type (8 LSB)
 *   [4-31]   hashes[7]:  key hashes (7 x 4 bytes)
 *   [32-35]  size_kc:    size (26 MSB) + key_count (6 LSB)
 *   [36-63]  kv_ofs[7]:  key-value offsets (7 x 4 bytes)
 *   [64-95]  child_ofs[8]: child node offsets (8 x 4 bytes)
 *
 * @see https://github.com/fastserial/lite3
 */

import { Node, NodeField, Type } from './constants.js';
import { readUint32, writeUint32, fillBytes } from './buffer-utils.js';

/**
 * Read node's type field
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @returns {number} Node type (OBJECT or ARRAY)
 */
export function getNodeType(buffer, offset) {
  const genType = readUint32(buffer, offset);
  return genType & NodeField.TYPE_MASK;
}

/**
 * Read node's generation count
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @returns {number} Generation count
 */
export function getNodeGeneration(buffer, offset) {
  const genType = readUint32(buffer, offset);
  return genType >>> NodeField.GEN_SHIFT;
}

/**
 * Set node's generation count
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} gen - New generation count
 */
export function setNodeGeneration(buffer, offset, gen) {
  const genType = readUint32(buffer, offset);
  const type = genType & NodeField.TYPE_MASK;
  writeUint32(buffer, offset, (gen << NodeField.GEN_SHIFT) | type);
}

/**
 * Increment node's generation count
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 */
export function incrementGeneration(buffer, offset) {
  const gen = getNodeGeneration(buffer, offset);
  setNodeGeneration(buffer, offset, (gen + 1) & 0xFFFFFF);
}

/**
 * Read node's key count
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @returns {number} Number of keys in node
 */
export function getNodeKeyCount(buffer, offset) {
  const sizeKc = readUint32(buffer, offset + Node.SIZE_KC_OFFSET);
  return sizeKc & NodeField.KEY_COUNT_MASK;
}

/**
 * Set node's key count
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} count - Key count
 */
export function setNodeKeyCount(buffer, offset, count) {
  const sizeKc = readUint32(buffer, offset + Node.SIZE_KC_OFFSET);
  writeUint32(buffer, offset + Node.SIZE_KC_OFFSET,
    (sizeKc & ~NodeField.KEY_COUNT_MASK) | (count & NodeField.KEY_COUNT_MASK));
}

/**
 * Read node's size (total number of entries in subtree)
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @returns {number} Size of node/subtree
 */
export function getNodeSize(buffer, offset) {
  const sizeKc = readUint32(buffer, offset + Node.SIZE_KC_OFFSET);
  return sizeKc >>> NodeField.SIZE_SHIFT;
}

/**
 * Set node's size
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} size - New size
 */
export function setNodeSize(buffer, offset, size) {
  const sizeKc = readUint32(buffer, offset + Node.SIZE_KC_OFFSET);
  writeUint32(buffer, offset + Node.SIZE_KC_OFFSET,
    (sizeKc & NodeField.KEY_COUNT_MASK) | (size << NodeField.SIZE_SHIFT));
}

/**
 * Increment node's size
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 */
export function incrementNodeSize(buffer, offset) {
  const size = getNodeSize(buffer, offset);
  setNodeSize(buffer, offset, size + 1);
}

/**
 * Read key hash at index
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} index - Key index (0-6)
 * @returns {number} Key hash
 */
export function getNodeHash(buffer, offset, index) {
  // hashes start at offset 4 (after gen_type)
  return readUint32(buffer, offset + 4 + index * 4);
}

/**
 * Set key hash at index
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} index - Key index (0-6)
 * @param {number} hash - Hash value
 */
export function setNodeHash(buffer, offset, index, hash) {
  writeUint32(buffer, offset + 4 + index * 4, hash);
}

/**
 * Read key-value offset at index
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} index - Key index (0-6)
 * @returns {number} Offset to key-value entry
 */
export function getNodeKvOffset(buffer, offset, index) {
  // kv_ofs starts at offset 36 (after gen_type + hashes + size_kc)
  return readUint32(buffer, offset + 36 + index * 4);
}

/**
 * Set key-value offset at index
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} index - Key index (0-6)
 * @param {number} kvOffset - Offset to key-value entry
 */
export function setNodeKvOffset(buffer, offset, index, kvOffset) {
  writeUint32(buffer, offset + 36 + index * 4, kvOffset);
}

/**
 * Read child offset at index
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} index - Child index (0-7)
 * @returns {number} Offset to child node (0 if no child)
 */
export function getNodeChildOffset(buffer, offset, index) {
  // child_ofs starts at offset 64 (after gen_type + hashes + size_kc + kv_ofs)
  return readUint32(buffer, offset + 64 + index * 4);
}

/**
 * Set child offset at index
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} index - Child index (0-7)
 * @param {number} childOffset - Offset to child node
 */
export function setNodeChildOffset(buffer, offset, index, childOffset) {
  writeUint32(buffer, offset + 64 + index * 4, childOffset);
}

/**
 * Check if node has children
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @returns {boolean} True if node has at least one child
 */
export function hasChildren(buffer, offset) {
  return getNodeChildOffset(buffer, offset, 0) !== 0;
}

/**
 * Initialize a node with a type
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} type - Node type (OBJECT or ARRAY)
 */
export function initNode(buffer, offset, type) {
  // Set gen_type (generation 0, type)
  writeUint32(buffer, offset, type & NodeField.TYPE_MASK);

  // Set size_kc to 0 (no keys, size 0)
  writeUint32(buffer, offset + Node.SIZE_KC_OFFSET, 0);

  // Clear child offsets
  for (let i = 0; i < 8; i++) {
    setNodeChildOffset(buffer, offset, i, 0);
  }
}

/**
 * Shift node entries right from index
 * Used when inserting a new key
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} offset - Node offset
 * @param {number} fromIndex - Index to start shifting from
 * @param {number} keyCount - Current key count
 */
export function shiftNodeEntriesRight(buffer, offset, fromIndex, keyCount) {
  for (let j = keyCount; j > fromIndex; j--) {
    setNodeHash(buffer, offset, j, getNodeHash(buffer, offset, j - 1));
    setNodeKvOffset(buffer, offset, j, getNodeKvOffset(buffer, offset, j - 1));
    setNodeChildOffset(buffer, offset, j + 1, getNodeChildOffset(buffer, offset, j));
  }
}

/**
 * Copy node entries from one node to another
 * Used during node split
 *
 * @param {Uint8Array} buffer - The buffer
 * @param {number} srcOffset - Source node offset
 * @param {number} dstOffset - Destination node offset
 * @param {number} srcStart - Source start index
 * @param {number} dstStart - Destination start index
 * @param {number} count - Number of entries to copy
 */
export function copyNodeEntries(buffer, srcOffset, dstOffset, srcStart, dstStart, count) {
  for (let i = 0; i < count; i++) {
    setNodeHash(buffer, dstOffset, dstStart + i, getNodeHash(buffer, srcOffset, srcStart + i));
    setNodeKvOffset(buffer, dstOffset, dstStart + i, getNodeKvOffset(buffer, srcOffset, srcStart + i));
    setNodeChildOffset(buffer, dstOffset, dstStart + i + 1, getNodeChildOffset(buffer, srcOffset, srcStart + i + 1));
  }
}
