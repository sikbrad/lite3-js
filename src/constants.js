/**
 * Lite3 Constants
 *
 * Core constants for the Lite3 binary format.
 * Based on the lite3-cpp implementation by fastserial.
 *
 * @see https://github.com/fastserial/lite3
 */

/**
 * Lite3 type enumeration
 * Each value type is prefixed with a 1-byte type tag.
 */
export const Type = Object.freeze({
  NULL: 0,      // Null value
  BOOL: 1,      // Boolean (1 byte)
  I64: 2,       // 64-bit signed integer
  F64: 3,       // 64-bit floating point (double)
  BYTES: 4,     // Binary data (4-byte length prefix + data)
  STRING: 5,    // UTF-8 string (4-byte length prefix + data)
  OBJECT: 6,    // Nested object (B-tree node)
  ARRAY: 7,     // Array (B-tree node)
  INVALID: 8,   // Invalid type marker
});

/**
 * Size of each type's data (excluding type tag)
 */
export const TypeSizes = Object.freeze({
  [Type.NULL]: 0,
  [Type.BOOL]: 1,
  [Type.I64]: 8,
  [Type.F64]: 8,
  [Type.BYTES]: 4,    // Length prefix size
  [Type.STRING]: 4,   // Length prefix size
  [Type.OBJECT]: 95,  // Node size - type tag size
  [Type.ARRAY]: 95,   // Node size - type tag size
  [Type.INVALID]: 0,
});

/**
 * B-tree node configuration
 */
export const Node = Object.freeze({
  // Node size in bytes (96 bytes = 1.5 cache lines)
  SIZE: 96,

  // Node alignment (4 bytes)
  ALIGNMENT: 4,

  // Maximum number of keys per node
  KEY_COUNT_MAX: 7,

  // Minimum number of keys per node (for B-tree balancing)
  KEY_COUNT_MIN: 3,

  // Maximum tree height
  TREE_HEIGHT_MAX: 9,

  // Offset of size_kc field in node
  SIZE_KC_OFFSET: 32,
});

/**
 * Value entry size (type tag only)
 */
export const VAL_SIZE = 1;

/**
 * DJB2 hash seed
 */
export const DJB2_HASH_SEED = 5381;

/**
 * Maximum buffer size (32-bit limit)
 */
export const BUF_SIZE_MAX = 0xFFFFFFFF;

/**
 * Maximum nesting depth for JSON conversion
 */
export const JSON_NESTING_DEPTH_MAX = 64;

/**
 * Iterator return values
 */
export const IterResult = Object.freeze({
  DONE: 1,
  ITEM: 0,
  ERROR: -1,
});

/**
 * Key tag size limits
 */
export const KeyTag = Object.freeze({
  SIZE_MIN: 1,
  SIZE_MAX: 4,
  SIZE_MASK: 0x03,
  SIZE_SHIFT: 0,
  KEY_SIZE_MASK: 0xFFFFFFFC,
  KEY_SIZE_SHIFT: 2,
});

/**
 * Node field masks and shifts
 */
export const NodeField = Object.freeze({
  // gen_type field
  TYPE_SHIFT: 0,
  TYPE_MASK: 0xFF,        // 8 LSB
  GEN_SHIFT: 8,
  GEN_MASK: 0xFFFFFF00,   // 24 MSB

  // size_kc field
  KEY_COUNT_SHIFT: 0,
  KEY_COUNT_MASK: 0x07,   // 3 LSB (0-7 keys)
  SIZE_SHIFT: 6,
  SIZE_MASK: 0xFFFFFFC0,  // 26 MSB
});
