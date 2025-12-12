/**
 * Lite3 TypeScript Declarations
 *
 * Type definitions for the Lite3 JavaScript library.
 * A JSON-Compatible Zero-Copy Serialization Format.
 *
 * Inspired by https://github.com/fastserial/lite3
 */

/**
 * Lite3 value types
 */
export declare const Type: {
  readonly NULL: 0;
  readonly BOOL: 1;
  readonly I64: 2;
  readonly F64: 3;
  readonly BYTES: 4;
  readonly STRING: 5;
  readonly OBJECT: 6;
  readonly ARRAY: 7;
  readonly INVALID: 8;
};

export type Lite3Type = typeof Type[keyof typeof Type];

/**
 * Size of each type's data
 */
export declare const TypeSizes: Readonly<Record<Lite3Type, number>>;

/**
 * B-tree node configuration
 */
export declare const Node: {
  readonly SIZE: 96;
  readonly ALIGNMENT: 4;
  readonly KEY_COUNT_MAX: 7;
  readonly KEY_COUNT_MIN: 3;
  readonly TREE_HEIGHT_MAX: 9;
  readonly SIZE_KC_OFFSET: 32;
};

/**
 * Iterator result values
 */
export declare const IterResult: {
  readonly DONE: 1;
  readonly ITEM: 0;
  readonly ERROR: -1;
};

/**
 * Value entry size
 */
export declare const VAL_SIZE: 1;

/**
 * DJB2 hash seed
 */
export declare const DJB2_HASH_SEED: 5381;

/**
 * Maximum buffer size
 */
export declare const BUF_SIZE_MAX: 0xFFFFFFFF;

/**
 * Maximum JSON nesting depth
 */
export declare const JSON_NESTING_DEPTH_MAX: 64;

/**
 * Key tag configuration
 */
export declare const KeyTag: {
  readonly SIZE_MIN: 1;
  readonly SIZE_MAX: 4;
  readonly SIZE_MASK: number;
  readonly SIZE_SHIFT: number;
  readonly KEY_SIZE_MASK: number;
  readonly KEY_SIZE_SHIFT: number;
};

/**
 * Node field masks and shifts
 */
export declare const NodeField: {
  readonly TYPE_SHIFT: number;
  readonly TYPE_MASK: number;
  readonly GEN_SHIFT: number;
  readonly GEN_MASK: number;
  readonly KEY_COUNT_SHIFT: number;
  readonly KEY_COUNT_MASK: number;
  readonly SIZE_SHIFT: number;
  readonly SIZE_MASK: number;
};

/**
 * Error codes
 */
export declare const ErrorCode: {
  readonly INVALID_ARGUMENT: 'EINVAL';
  readonly NO_BUFFER_SPACE: 'ENOBUFS';
  readonly KEY_NOT_FOUND: 'ENOENT';
  readonly BAD_MESSAGE: 'EBADMSG';
  readonly OUT_OF_BOUNDS: 'EFAULT';
};

export type Lite3ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Lite3 Error class
 */
export declare class Lite3Error extends Error {
  name: 'Lite3Error';
  code: Lite3ErrorCode;
  constructor(message: string, code: Lite3ErrorCode);
}

/**
 * Valid JSON-compatible value types for Lite3
 */
export type Lite3Value =
  | null
  | boolean
  | number
  | bigint
  | string
  | Uint8Array
  | Lite3Value[]
  | { [key: string]: Lite3Value };

/**
 * Main Lite3 class for working with Lite3 binary format
 */
export declare class Lite3 {
  /**
   * Create a new Lite3 instance
   * @param initialSize - Initial buffer size (default: 1024)
   */
  constructor(initialSize?: number);

  /**
   * Get the underlying buffer (up to current length)
   */
  readonly buffer: Uint8Array;

  /**
   * Get the current buffer length in bytes
   */
  readonly length: number;

  /**
   * Get the buffer capacity in bytes
   */
  readonly capacity: number;

  /**
   * Initialize as an object
   * @returns this instance for chaining
   */
  initObject(): this;

  /**
   * Initialize as an array
   * @returns this instance for chaining
   */
  initArray(): this;

  /**
   * Set a value at a key
   * @param key - The key
   * @param value - The value
   * @param offset - Parent object offset (default: 0)
   * @returns this instance for chaining
   */
  set(key: string, value: Lite3Value, offset?: number): this;

  /**
   * Set null value
   * @param key - The key
   * @param offset - Parent object offset (default: 0)
   * @returns this instance for chaining
   */
  setNull(key: string, offset?: number): this;

  /**
   * Set boolean value
   * @param key - The key
   * @param value - The value
   * @param offset - Parent object offset (default: 0)
   * @returns this instance for chaining
   */
  setBool(key: string, value: boolean, offset?: number): this;

  /**
   * Set 64-bit integer value
   * @param key - The key
   * @param value - The value
   * @param offset - Parent object offset (default: 0)
   * @returns this instance for chaining
   */
  setInt64(key: string, value: number | bigint, offset?: number): this;

  /**
   * Set 64-bit float value
   * @param key - The key
   * @param value - The value
   * @param offset - Parent object offset (default: 0)
   * @returns this instance for chaining
   */
  setFloat64(key: string, value: number, offset?: number): this;

  /**
   * Set string value
   * @param key - The key
   * @param value - The value
   * @param offset - Parent object offset (default: 0)
   * @returns this instance for chaining
   */
  setString(key: string, value: string, offset?: number): this;

  /**
   * Set bytes value
   * @param key - The key
   * @param value - The value
   * @param offset - Parent object offset (default: 0)
   * @returns this instance for chaining
   */
  setBytes(key: string, value: Uint8Array, offset?: number): this;

  /**
   * Set nested object
   * @param key - The key
   * @param offset - Parent object offset (default: 0)
   * @returns Offset of the new object
   */
  setObject(key: string, offset?: number): number;

  /**
   * Set nested array
   * @param key - The key
   * @param offset - Parent object offset (default: 0)
   * @returns Offset of the new array
   */
  setArray(key: string, offset?: number): number;

  /**
   * Append value to array
   * @param value - The value
   * @param arrayOffset - Array offset (default: 0)
   * @returns this instance for chaining
   */
  appendValue(value: Lite3Value, arrayOffset?: number): this;

  /**
   * Get value at key
   * @param key - The key
   * @param offset - Parent object offset (default: 0)
   * @returns The value or undefined if not found
   */
  get(key: string, offset?: number): Lite3Value | undefined;

  /**
   * Get value at array index
   * @param index - The index
   * @param arrayOffset - Array offset (default: 0)
   * @returns The value or undefined if not found
   */
  getAt(index: number, arrayOffset?: number): Lite3Value | undefined;

  /**
   * Check if key exists
   * @param key - The key
   * @param offset - Parent object offset (default: 0)
   * @returns True if key exists
   */
  has(key: string, offset?: number): boolean;

  /**
   * Get the size of the object/array
   * @param offset - Object/array offset (default: 0)
   * @returns Number of entries
   */
  size(offset?: number): number;

  /**
   * Get the type of root
   * @returns Type.OBJECT or Type.ARRAY
   */
  getType(): typeof Type.OBJECT | typeof Type.ARRAY;

  /**
   * Get keys of object
   * @param offset - Object offset (default: 0)
   * @returns Array of keys
   */
  keys(offset?: number): string[];

  /**
   * Get values of object/array
   * @param offset - Object/array offset (default: 0)
   * @returns Array of values
   */
  values(offset?: number): Lite3Value[];

  /**
   * Get entries of object
   * @param offset - Object offset (default: 0)
   * @returns Array of [key, value] pairs
   */
  entries(offset?: number): Array<[string, Lite3Value]>;

  /**
   * Convert to plain JavaScript object/array
   * @returns Plain JS object or array
   */
  toJSON(): Record<string, Lite3Value> | Lite3Value[];

  /**
   * Create from plain JavaScript object/array
   * @param data - The data
   * @returns New Lite3 instance
   */
  static fromJSON(data: Record<string, Lite3Value> | Lite3Value[]): Lite3;

  /**
   * Create from existing buffer
   * @param buffer - The buffer
   * @param length - Used length (defaults to buffer length)
   * @returns New Lite3 instance
   */
  static fromBuffer(buffer: Uint8Array, length?: number): Lite3;
}

// Hash utilities
export declare function djb2Hash(key: string): number;
export declare function getKeyData(key: string): { hash: number; size: number };
export declare function getKeyTagSize(keySize: number): number;

// Buffer utilities
export declare function readUint32(buffer: Uint8Array, offset: number): number;
export declare function writeUint32(buffer: Uint8Array, offset: number, value: number): void;
export declare function readInt64(buffer: Uint8Array, offset: number): bigint;
export declare function writeInt64(buffer: Uint8Array, offset: number, value: bigint | number): void;
export declare function readFloat64(buffer: Uint8Array, offset: number): number;
export declare function writeFloat64(buffer: Uint8Array, offset: number, value: number): void;
export declare function alignOffset(offset: number, alignment?: number): number;
export declare function encodeString(str: string): Uint8Array;
export declare function decodeString(bytes: Uint8Array, offset: number, length: number): string;

export default Lite3;
