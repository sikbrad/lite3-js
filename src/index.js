/**
 * Lite3 - A JSON-Compatible Zero-Copy Serialization Format
 *
 * JavaScript implementation of the Lite3 binary format.
 * Lite3 encodes data as a B-tree inside a single contiguous buffer,
 * allowing access and mutation on any arbitrary field in O(log n) time.
 *
 * Inspired by https://github.com/fastserial/lite3
 *
 * @module lite3
 * @version 1.0.0
 * @license MIT
 */

// Main class and utilities
export {
  Lite3,
  Lite3Error,
  ErrorCode,
  Type,
  TypeSizes,
  Node,
  IterResult,
} from './lite3.js';

// Hash utilities
export {
  djb2Hash,
  getKeyData,
  getKeyTagSize,
} from './hash.js';

// Buffer utilities
export {
  readUint32,
  writeUint32,
  readInt64,
  writeInt64,
  readFloat64,
  writeFloat64,
  alignOffset,
  encodeString,
  decodeString,
} from './buffer-utils.js';

// Constants
export {
  VAL_SIZE,
  DJB2_HASH_SEED,
  BUF_SIZE_MAX,
  JSON_NESTING_DEPTH_MAX,
  KeyTag,
  NodeField,
} from './constants.js';

// Default export
import { Lite3 } from './lite3.js';
export default Lite3;
