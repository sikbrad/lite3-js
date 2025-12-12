/**
 * Lite3 - A JSON-Compatible Zero-Copy Serialization Format
 *
 * This is a JavaScript implementation of the Lite3 binary format.
 * Lite3 encodes data as a B-tree inside a single contiguous buffer,
 * allowing access and mutation on any arbitrary field in O(log n) time.
 *
 * @module lite3
 * @see https://github.com/fastserial/lite3
 */

import {
  Type,
  TypeSizes,
  Node,
  VAL_SIZE,
  KeyTag,
  NodeField,
  IterResult,
  BUF_SIZE_MAX,
} from './constants.js';

import { getKeyData, getKeyTagSize } from './hash.js';

import {
  readUint32,
  writeUint32,
  readInt64,
  writeInt64,
  readFloat64,
  writeFloat64,
  readVarUint,
  writeVarUint,
  alignOffset,
  encodeString,
  decodeString,
  copyBytes,
  fillBytes,
} from './buffer-utils.js';

import {
  getNodeType,
  getNodeGeneration,
  incrementGeneration,
  getNodeKeyCount,
  setNodeKeyCount,
  getNodeSize,
  setNodeSize,
  incrementNodeSize,
  getNodeHash,
  setNodeHash,
  getNodeKvOffset,
  setNodeKvOffset,
  getNodeChildOffset,
  setNodeChildOffset,
  hasChildren,
  initNode,
  shiftNodeEntriesRight,
  copyNodeEntries,
} from './node.js';

/**
 * Lite3 Error class for all library errors
 */
export class Lite3Error extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'Lite3Error';
    this.code = code;
  }
}

// Error codes
export const ErrorCode = Object.freeze({
  INVALID_ARGUMENT: 'EINVAL',
  NO_BUFFER_SPACE: 'ENOBUFS',
  KEY_NOT_FOUND: 'ENOENT',
  BAD_MESSAGE: 'EBADMSG',
  OUT_OF_BOUNDS: 'EFAULT',
});

/**
 * Lite3 class - High-level API for working with Lite3 binary format
 *
 * This provides a convenient wrapper around the Buffer API,
 * managing buffer allocation automatically.
 */
export class Lite3 {
  /**
   * Create a new Lite3 instance
   *
   * @param {number} [initialSize=1024] - Initial buffer size
   */
  constructor(initialSize = 1024) {
    this._buffer = new Uint8Array(initialSize);
    this._buflen = 0;
    this._initialized = false;
  }

  /**
   * Get the underlying buffer
   * @returns {Uint8Array} The buffer
   */
  get buffer() {
    return this._buffer.subarray(0, this._buflen);
  }

  /**
   * Get the current buffer length
   * @returns {number} Buffer length in bytes
   */
  get length() {
    return this._buflen;
  }

  /**
   * Get the buffer capacity
   * @returns {number} Buffer capacity in bytes
   */
  get capacity() {
    return this._buffer.length;
  }

  /**
   * Ensure buffer has enough space
   *
   * @private
   * @param {number} needed - Number of additional bytes needed
   */
  _ensureSpace(needed) {
    const required = this._buflen + needed;
    if (required > this._buffer.length) {
      const newSize = Math.max(required, this._buffer.length * 2);
      const newBuffer = new Uint8Array(newSize);
      newBuffer.set(this._buffer);
      this._buffer = newBuffer;
    }
  }

  /**
   * Initialize as an object
   * @returns {Lite3} this instance for chaining
   */
  initObject() {
    this._ensureSpace(Node.SIZE);
    initNode(this._buffer, 0, Type.OBJECT);
    this._buflen = Node.SIZE;
    this._initialized = true;
    return this;
  }

  /**
   * Initialize as an array
   * @returns {Lite3} this instance for chaining
   */
  initArray() {
    this._ensureSpace(Node.SIZE);
    initNode(this._buffer, 0, Type.ARRAY);
    this._buflen = Node.SIZE;
    this._initialized = true;
    return this;
  }

  /**
   * Check if initialized
   *
   * @private
   */
  _checkInitialized() {
    if (!this._initialized) {
      throw new Lite3Error('Buffer not initialized. Call initObject() or initArray() first.', ErrorCode.INVALID_ARGUMENT);
    }
  }

  /**
   * Set a value at a key path
   *
   * @param {string} key - The key
   * @param {*} value - The value (supports null, boolean, number, string, array, object, Uint8Array)
   * @param {number} [offset=0] - Parent object offset
   * @returns {Lite3} this instance for chaining
   */
  set(key, value, offset = 0) {
    this._checkInitialized();

    if (value === null) {
      this.setNull(key, offset);
    } else if (typeof value === 'boolean') {
      this.setBool(key, value, offset);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value) && value >= -9007199254740991 && value <= 9007199254740991) {
        this.setInt64(key, value, offset);
      } else {
        this.setFloat64(key, value, offset);
      }
    } else if (typeof value === 'bigint') {
      this.setInt64(key, value, offset);
    } else if (typeof value === 'string') {
      this.setString(key, value, offset);
    } else if (value instanceof Uint8Array) {
      this.setBytes(key, value, offset);
    } else if (Array.isArray(value)) {
      const arrOffset = this.setArray(key, offset);
      for (let i = 0; i < value.length; i++) {
        this.appendValue(value[i], arrOffset);
      }
    } else if (typeof value === 'object') {
      const objOffset = this.setObject(key, offset);
      for (const [k, v] of Object.entries(value)) {
        this.set(k, v, objOffset);
      }
    } else {
      throw new Lite3Error(`Unsupported value type: ${typeof value}`, ErrorCode.INVALID_ARGUMENT);
    }

    return this;
  }

  /**
   * Set null value
   *
   * @param {string} key - The key
   * @param {number} [offset=0] - Parent object offset
   * @returns {Lite3} this instance for chaining
   */
  setNull(key, offset = 0) {
    this._setImpl(key, offset, Type.NULL, 0, () => {});
    return this;
  }

  /**
   * Set boolean value
   *
   * @param {string} key - The key
   * @param {boolean} value - The value
   * @param {number} [offset=0] - Parent object offset
   * @returns {Lite3} this instance for chaining
   */
  setBool(key, value, offset = 0) {
    this._setImpl(key, offset, Type.BOOL, 1, (buf, valOffset) => {
      buf[valOffset] = value ? 1 : 0;
    });
    return this;
  }

  /**
   * Set 64-bit integer value
   *
   * @param {string} key - The key
   * @param {number|bigint} value - The value
   * @param {number} [offset=0] - Parent object offset
   * @returns {Lite3} this instance for chaining
   */
  setInt64(key, value, offset = 0) {
    this._setImpl(key, offset, Type.I64, 8, (buf, valOffset) => {
      writeInt64(buf, valOffset, value);
    });
    return this;
  }

  /**
   * Set 64-bit float value
   *
   * @param {string} key - The key
   * @param {number} value - The value
   * @param {number} [offset=0] - Parent object offset
   * @returns {Lite3} this instance for chaining
   */
  setFloat64(key, value, offset = 0) {
    this._setImpl(key, offset, Type.F64, 8, (buf, valOffset) => {
      writeFloat64(buf, valOffset, value);
    });
    return this;
  }

  /**
   * Set string value
   *
   * @param {string} key - The key
   * @param {string} value - The value
   * @param {number} [offset=0] - Parent object offset
   * @returns {Lite3} this instance for chaining
   */
  setString(key, value, offset = 0) {
    const encoded = encodeString(value);
    const strSize = encoded.length + 1; // Include null terminator
    this._setImpl(key, offset, Type.STRING, 4 + strSize, (buf, valOffset) => {
      writeUint32(buf, valOffset, strSize);
      copyBytes(buf, valOffset + 4, encoded, 0, encoded.length);
      buf[valOffset + 4 + encoded.length] = 0; // Null terminator
    });
    return this;
  }

  /**
   * Set bytes value
   *
   * @param {string} key - The key
   * @param {Uint8Array} value - The value
   * @param {number} [offset=0] - Parent object offset
   * @returns {Lite3} this instance for chaining
   */
  setBytes(key, value, offset = 0) {
    this._setImpl(key, offset, Type.BYTES, 4 + value.length, (buf, valOffset) => {
      writeUint32(buf, valOffset, value.length);
      copyBytes(buf, valOffset + 4, value, 0, value.length);
    });
    return this;
  }

  /**
   * Set nested object
   *
   * @param {string} key - The key
   * @param {number} [offset=0] - Parent object offset
   * @returns {number} Offset of the new object
   */
  setObject(key, offset = 0) {
    return this._setNestedImpl(key, offset, Type.OBJECT);
  }

  /**
   * Set nested array
   *
   * @param {string} key - The key
   * @param {number} [offset=0] - Parent object offset
   * @returns {number} Offset of the new array
   */
  setArray(key, offset = 0) {
    return this._setNestedImpl(key, offset, Type.ARRAY);
  }

  /**
   * Implementation for setting nested object/array
   *
   * @private
   */
  _setNestedImpl(key, offset, type) {
    const keyData = getKeyData(key);
    const keyTagSize = getKeyTagSize(keyData.size);
    const keyEncoded = encodeString(key);

    // Calculate required space with alignment for node
    const unalignedValOffset = this._buflen + keyTagSize + keyData.size;
    const alignedValOffset = alignOffset(unalignedValOffset, Node.ALIGNMENT);
    const alignmentPadding = alignedValOffset - unalignedValOffset;
    const entrySize = keyTagSize + keyData.size + alignmentPadding + Node.SIZE;

    this._ensureSpace(entrySize + Node.SIZE * 2); // Extra space for potential splits

    // Increment generation
    incrementGeneration(this._buffer, 0);

    const result = this._findOrInsertKey(offset, keyData, keyTagSize, keyEncoded);

    // Write key if new entry
    if (result.isNew) {
      const writeOffset = this._buflen + alignmentPadding;
      this._writeKey(writeOffset, keyTagSize, keyData.size, keyEncoded);
      setNodeKvOffset(this._buffer, result.nodeOffset, result.index, writeOffset);
      this._buflen = writeOffset + keyTagSize + keyData.size;

      // Initialize nested node
      const nodeOffset = alignOffset(this._buflen, Node.ALIGNMENT);
      this._buflen = nodeOffset + Node.SIZE;
      initNode(this._buffer, nodeOffset, type);

      // Update root size
      incrementNodeSize(this._buffer, 0);

      return nodeOffset;
    } else {
      // Existing key - get offset to value
      const kvOffset = getNodeKvOffset(this._buffer, result.nodeOffset, result.index);
      const valOffset = this._skipKey(kvOffset);
      const existingType = this._buffer[valOffset];

      if (existingType === Type.OBJECT || existingType === Type.ARRAY) {
        // Re-initialize existing nested structure
        initNode(this._buffer, valOffset, type);
        return valOffset;
      } else {
        // Need to allocate new node
        const nodeOffset = alignOffset(this._buflen, Node.ALIGNMENT);
        this._buflen = nodeOffset + Node.SIZE;
        initNode(this._buffer, nodeOffset, type);

        // Update kv_ofs to point to new location
        // Note: We need to write new key entry pointing to new node
        const writeOffset = alignOffset(this._buflen, Node.ALIGNMENT) - Node.SIZE;
        this._writeKey(writeOffset, keyTagSize, keyData.size, keyEncoded);
        setNodeKvOffset(this._buffer, result.nodeOffset, result.index, writeOffset);

        return nodeOffset;
      }
    }
  }

  /**
   * Append value to array
   *
   * @param {*} value - The value
   * @param {number} [arrayOffset=0] - Array offset
   * @returns {Lite3} this instance for chaining
   */
  appendValue(value, arrayOffset = 0) {
    const index = getNodeSize(this._buffer, arrayOffset);
    this._appendImpl(arrayOffset, index, value);
    return this;
  }

  /**
   * Implementation for appending to array
   *
   * @private
   */
  _appendImpl(arrayOffset, index, value) {
    if (value === null) {
      this._appendPrimitiveImpl(arrayOffset, index, Type.NULL, 0, () => {});
    } else if (typeof value === 'boolean') {
      this._appendPrimitiveImpl(arrayOffset, index, Type.BOOL, 1, (buf, off) => {
        buf[off] = value ? 1 : 0;
      });
    } else if (typeof value === 'number') {
      if (Number.isInteger(value) && value >= -9007199254740991 && value <= 9007199254740991) {
        this._appendPrimitiveImpl(arrayOffset, index, Type.I64, 8, (buf, off) => {
          writeInt64(buf, off, value);
        });
      } else {
        this._appendPrimitiveImpl(arrayOffset, index, Type.F64, 8, (buf, off) => {
          writeFloat64(buf, off, value);
        });
      }
    } else if (typeof value === 'bigint') {
      this._appendPrimitiveImpl(arrayOffset, index, Type.I64, 8, (buf, off) => {
        writeInt64(buf, off, value);
      });
    } else if (typeof value === 'string') {
      const encoded = encodeString(value);
      const strSize = encoded.length + 1;
      this._appendPrimitiveImpl(arrayOffset, index, Type.STRING, 4 + strSize, (buf, off) => {
        writeUint32(buf, off, strSize);
        copyBytes(buf, off + 4, encoded, 0, encoded.length);
        buf[off + 4 + encoded.length] = 0;
      });
    } else if (value instanceof Uint8Array) {
      this._appendPrimitiveImpl(arrayOffset, index, Type.BYTES, 4 + value.length, (buf, off) => {
        writeUint32(buf, off, value.length);
        copyBytes(buf, off + 4, value, 0, value.length);
      });
    } else if (Array.isArray(value)) {
      const arrOff = this._appendNestedImpl(arrayOffset, index, Type.ARRAY);
      for (let i = 0; i < value.length; i++) {
        this.appendValue(value[i], arrOff);
      }
    } else if (typeof value === 'object') {
      const objOff = this._appendNestedImpl(arrayOffset, index, Type.OBJECT);
      for (const [k, v] of Object.entries(value)) {
        this.set(k, v, objOff);
      }
    }
  }

  /**
   * Implementation for appending primitive to array
   *
   * @private
   */
  _appendPrimitiveImpl(arrayOffset, index, type, dataSize, writeData) {
    const entrySize = VAL_SIZE + dataSize;
    this._ensureSpace(entrySize + Node.SIZE * 2);

    incrementGeneration(this._buffer, 0);

    // For arrays, we use the index as the hash
    const keyData = { hash: index, size: 0 };
    const result = this._findOrInsertKey(arrayOffset, keyData, 0, null);

    // Write value
    const valOffset = this._buflen;
    this._buffer[valOffset] = type;
    if (dataSize > 0) {
      writeData(this._buffer, valOffset + VAL_SIZE);
    }
    this._buflen += VAL_SIZE + dataSize;

    setNodeKvOffset(this._buffer, result.nodeOffset, result.index, valOffset);

    if (result.isNew) {
      incrementNodeSize(this._buffer, arrayOffset);
    }
  }

  /**
   * Implementation for appending nested object/array
   *
   * @private
   */
  _appendNestedImpl(arrayOffset, index, type) {
    this._ensureSpace(Node.SIZE * 3);

    incrementGeneration(this._buffer, 0);

    const keyData = { hash: index, size: 0 };
    const result = this._findOrInsertKey(arrayOffset, keyData, 0, null);

    // Align for node
    const nodeOffset = alignOffset(this._buflen, Node.ALIGNMENT);
    this._buflen = nodeOffset + Node.SIZE;
    initNode(this._buffer, nodeOffset, type);

    setNodeKvOffset(this._buffer, result.nodeOffset, result.index, nodeOffset);

    if (result.isNew) {
      incrementNodeSize(this._buffer, arrayOffset);
    }

    return nodeOffset;
  }

  /**
   * Implementation for set operations
   *
   * @private
   */
  _setImpl(key, offset, type, dataSize, writeData) {
    const keyData = getKeyData(key);
    const keyTagSize = getKeyTagSize(keyData.size);
    const keyEncoded = encodeString(key);
    const entrySize = keyTagSize + keyData.size + VAL_SIZE + dataSize;

    this._ensureSpace(entrySize + Node.SIZE * 2);

    // Increment generation
    incrementGeneration(this._buffer, 0);

    const result = this._findOrInsertKey(offset, keyData, keyTagSize, keyEncoded);

    if (result.isNew) {
      // Write new entry
      const writeOffset = this._buflen;
      this._writeKey(writeOffset, keyTagSize, keyData.size, keyEncoded);
      const valOffset = writeOffset + keyTagSize + keyData.size;
      this._buffer[valOffset] = type;
      if (dataSize > 0) {
        writeData(this._buffer, valOffset + VAL_SIZE);
      }
      this._buflen = valOffset + VAL_SIZE + dataSize;
      setNodeKvOffset(this._buffer, result.nodeOffset, result.index, writeOffset);

      // Update root size
      incrementNodeSize(this._buffer, 0);
    } else {
      // Overwrite existing value
      const kvOffset = getNodeKvOffset(this._buffer, result.nodeOffset, result.index);
      const valOffset = this._skipKey(kvOffset);

      // Check if we can overwrite in place
      const existingType = this._buffer[valOffset];
      const existingSize = this._getValueSize(valOffset);
      const newSize = VAL_SIZE + dataSize;

      if (newSize <= existingSize) {
        // Overwrite in place
        this._buffer[valOffset] = type;
        if (dataSize > 0) {
          writeData(this._buffer, valOffset + VAL_SIZE);
        }
      } else {
        // Need to allocate new space
        const writeOffset = this._buflen;
        this._writeKey(writeOffset, keyTagSize, keyData.size, keyEncoded);
        const newValOffset = writeOffset + keyTagSize + keyData.size;
        this._buffer[newValOffset] = type;
        if (dataSize > 0) {
          writeData(this._buffer, newValOffset + VAL_SIZE);
        }
        this._buflen = newValOffset + VAL_SIZE + dataSize;
        setNodeKvOffset(this._buffer, result.nodeOffset, result.index, writeOffset);
      }
    }
  }

  /**
   * Find or insert key in B-tree
   *
   * @private
   * @returns {{ nodeOffset: number, index: number, isNew: boolean }}
   */
  _findOrInsertKey(rootOffset, keyData, keyTagSize, keyEncoded) {
    let nodeOffset = rootOffset;
    let parent = null;
    let parentIndex = 0;
    let nodeWalks = 0;

    while (true) {
      // Check if node is full and needs split
      if (getNodeKeyCount(this._buffer, nodeOffset) === Node.KEY_COUNT_MAX) {
        this._splitNode(rootOffset, nodeOffset, parent, parentIndex);

        // Re-navigate after split
        if (parent === null) {
          // Root was split, restart
          nodeOffset = rootOffset;
        } else {
          // Check which child to follow
          const separatorHash = getNodeHash(this._buffer, parent, parentIndex);
          if (keyData.hash > separatorHash) {
            nodeOffset = getNodeChildOffset(this._buffer, parent, parentIndex + 1);
          }
        }
      }

      const keyCount = getNodeKeyCount(this._buffer, nodeOffset);

      // Find position for key
      let i = 0;
      while (i < keyCount && getNodeHash(this._buffer, nodeOffset, i) < keyData.hash) {
        i++;
      }

      // Check if key exists
      if (i < keyCount && getNodeHash(this._buffer, nodeOffset, i) === keyData.hash) {
        return { nodeOffset, index: i, isNew: false };
      }

      // Check for children
      if (hasChildren(this._buffer, nodeOffset)) {
        parent = nodeOffset;
        parentIndex = i;
        nodeOffset = getNodeChildOffset(this._buffer, nodeOffset, i);
        nodeWalks++;

        if (nodeWalks > Node.TREE_HEIGHT_MAX) {
          throw new Lite3Error('Tree height exceeded maximum', ErrorCode.BAD_MESSAGE);
        }
      } else {
        // Insert here
        shiftNodeEntriesRight(this._buffer, nodeOffset, i, keyCount);
        setNodeHash(this._buffer, nodeOffset, i, keyData.hash);
        setNodeKeyCount(this._buffer, nodeOffset, keyCount + 1);

        return { nodeOffset, index: i, isNew: true };
      }
    }
  }

  /**
   * Split a full node
   *
   * @private
   */
  _splitNode(rootOffset, nodeOffset, parent, parentIndex) {
    const buflenAligned = alignOffset(this._buflen, Node.ALIGNMENT);
    this._buflen = buflenAligned;

    if (parent === null) {
      // Splitting root - need to create new root
      const newNodeOffset = buflenAligned;
      const siblingOffset = buflenAligned + Node.SIZE;

      // Save the current size before splitting
      const currentSize = getNodeSize(this._buffer, rootOffset);

      // Copy current root to new location
      copyBytes(this._buffer, newNodeOffset, this._buffer, rootOffset, Node.SIZE);

      // Initialize new root
      initNode(this._buffer, rootOffset, getNodeType(this._buffer, newNodeOffset));
      setNodeChildOffset(this._buffer, rootOffset, 0, newNodeOffset);

      // Restore the size to the new root (size is stored at root only)
      setNodeSize(this._buffer, rootOffset, currentSize);

      // Create sibling
      initNode(this._buffer, siblingOffset, getNodeType(this._buffer, newNodeOffset));

      // Move median to parent
      const medianHash = getNodeHash(this._buffer, newNodeOffset, Node.KEY_COUNT_MIN);
      const medianKvOfs = getNodeKvOffset(this._buffer, newNodeOffset, Node.KEY_COUNT_MIN);
      setNodeHash(this._buffer, rootOffset, 0, medianHash);
      setNodeKvOffset(this._buffer, rootOffset, 0, medianKvOfs);
      setNodeChildOffset(this._buffer, rootOffset, 1, siblingOffset);
      setNodeKeyCount(this._buffer, rootOffset, 1);

      // Copy right half to sibling
      for (let j = 0; j < Node.KEY_COUNT_MIN; j++) {
        setNodeHash(this._buffer, siblingOffset, j,
          getNodeHash(this._buffer, newNodeOffset, j + Node.KEY_COUNT_MIN + 1));
        setNodeKvOffset(this._buffer, siblingOffset, j,
          getNodeKvOffset(this._buffer, newNodeOffset, j + Node.KEY_COUNT_MIN + 1));
        setNodeChildOffset(this._buffer, siblingOffset, j,
          getNodeChildOffset(this._buffer, newNodeOffset, j + Node.KEY_COUNT_MIN + 1));
      }
      setNodeChildOffset(this._buffer, siblingOffset, Node.KEY_COUNT_MIN,
        getNodeChildOffset(this._buffer, newNodeOffset, Node.KEY_COUNT_MAX));
      setNodeKeyCount(this._buffer, siblingOffset, Node.KEY_COUNT_MIN);

      // Update original node
      setNodeKeyCount(this._buffer, newNodeOffset, Node.KEY_COUNT_MIN);

      this._buflen = siblingOffset + Node.SIZE;
    } else {
      // Regular split
      const siblingOffset = buflenAligned;

      // Shift parent entries
      const parentKeyCount = getNodeKeyCount(this._buffer, parent);
      for (let j = parentKeyCount; j > parentIndex; j--) {
        setNodeHash(this._buffer, parent, j, getNodeHash(this._buffer, parent, j - 1));
        setNodeKvOffset(this._buffer, parent, j, getNodeKvOffset(this._buffer, parent, j - 1));
        setNodeChildOffset(this._buffer, parent, j + 1, getNodeChildOffset(this._buffer, parent, j));
      }

      // Move median to parent
      const medianHash = getNodeHash(this._buffer, nodeOffset, Node.KEY_COUNT_MIN);
      const medianKvOfs = getNodeKvOffset(this._buffer, nodeOffset, Node.KEY_COUNT_MIN);
      setNodeHash(this._buffer, parent, parentIndex, medianHash);
      setNodeKvOffset(this._buffer, parent, parentIndex, medianKvOfs);
      setNodeChildOffset(this._buffer, parent, parentIndex + 1, siblingOffset);
      setNodeKeyCount(this._buffer, parent, parentKeyCount + 1);

      // Create sibling
      initNode(this._buffer, siblingOffset, getNodeType(this._buffer, nodeOffset));

      // Copy right half to sibling
      for (let j = 0; j < Node.KEY_COUNT_MIN; j++) {
        setNodeHash(this._buffer, siblingOffset, j,
          getNodeHash(this._buffer, nodeOffset, j + Node.KEY_COUNT_MIN + 1));
        setNodeKvOffset(this._buffer, siblingOffset, j,
          getNodeKvOffset(this._buffer, nodeOffset, j + Node.KEY_COUNT_MIN + 1));
        setNodeChildOffset(this._buffer, siblingOffset, j,
          getNodeChildOffset(this._buffer, nodeOffset, j + Node.KEY_COUNT_MIN + 1));
      }
      setNodeChildOffset(this._buffer, siblingOffset, Node.KEY_COUNT_MIN,
        getNodeChildOffset(this._buffer, nodeOffset, Node.KEY_COUNT_MAX));
      setNodeKeyCount(this._buffer, siblingOffset, Node.KEY_COUNT_MIN);

      // Update original node
      setNodeKeyCount(this._buffer, nodeOffset, Node.KEY_COUNT_MIN);

      this._buflen = siblingOffset + Node.SIZE;
    }
  }

  /**
   * Write key entry
   *
   * @private
   */
  _writeKey(offset, tagSize, keySize, keyEncoded) {
    const tagValue = ((keySize << KeyTag.KEY_SIZE_SHIFT) | (tagSize - 1)) >>> 0;
    writeVarUint(this._buffer, offset, tagValue, tagSize);
    copyBytes(this._buffer, offset + tagSize, keyEncoded, 0, keyEncoded.length);
    this._buffer[offset + tagSize + keyEncoded.length] = 0; // Null terminator
  }

  /**
   * Skip over key entry and return value offset
   *
   * @private
   */
  _skipKey(kvOffset) {
    const tagByte = this._buffer[kvOffset];
    const tagSize = (tagByte & KeyTag.SIZE_MASK) + 1;
    const keySize = readVarUint(this._buffer, kvOffset, tagSize) >>> KeyTag.KEY_SIZE_SHIFT;
    return kvOffset + tagSize + keySize;
  }

  /**
   * Get size of value at offset
   *
   * @private
   */
  _getValueSize(valOffset) {
    const type = this._buffer[valOffset];
    const baseSize = TypeSizes[type] || 0;

    if (type === Type.STRING || type === Type.BYTES) {
      const dataLen = readUint32(this._buffer, valOffset + VAL_SIZE);
      return VAL_SIZE + 4 + dataLen;
    } else if (type === Type.OBJECT || type === Type.ARRAY) {
      return Node.SIZE;
    }

    return VAL_SIZE + baseSize;
  }

  /**
   * Get value at key
   *
   * @param {string} key - The key
   * @param {number} [offset=0] - Parent object offset
   * @returns {*} The value
   */
  get(key, offset = 0) {
    this._checkInitialized();

    const keyData = getKeyData(key);
    const result = this._findKey(offset, keyData.hash);

    if (!result) {
      return undefined;
    }

    const kvOffset = getNodeKvOffset(this._buffer, result.nodeOffset, result.index);
    const valOffset = this._skipKey(kvOffset);

    return this._readValue(valOffset);
  }

  /**
   * Get value at array index
   *
   * @param {number} index - The index
   * @param {number} [arrayOffset=0] - Array offset
   * @returns {*} The value
   */
  getAt(index, arrayOffset = 0) {
    this._checkInitialized();

    const result = this._findKey(arrayOffset, index);

    if (!result) {
      return undefined;
    }

    const kvOffset = getNodeKvOffset(this._buffer, result.nodeOffset, result.index);
    // For arrays, kvOffset points directly to value (no key)
    return this._readValue(kvOffset);
  }

  /**
   * Check if key exists
   *
   * @param {string} key - The key
   * @param {number} [offset=0] - Parent object offset
   * @returns {boolean} True if key exists
   */
  has(key, offset = 0) {
    this._checkInitialized();

    const keyData = getKeyData(key);
    const result = this._findKey(offset, keyData.hash);
    return result !== null;
  }

  /**
   * Get the size of the object/array at offset
   *
   * @param {number} [offset=0] - Object/array offset
   * @returns {number} Number of entries
   */
  size(offset = 0) {
    this._checkInitialized();
    return getNodeSize(this._buffer, offset);
  }

  /**
   * Find key in B-tree
   *
   * @private
   * @returns {{ nodeOffset: number, index: number } | null}
   */
  _findKey(rootOffset, hash) {
    let nodeOffset = rootOffset;
    let nodeWalks = 0;

    while (true) {
      const keyCount = getNodeKeyCount(this._buffer, nodeOffset);

      let i = 0;
      while (i < keyCount && getNodeHash(this._buffer, nodeOffset, i) < hash) {
        i++;
      }

      if (i < keyCount && getNodeHash(this._buffer, nodeOffset, i) === hash) {
        return { nodeOffset, index: i };
      }

      if (hasChildren(this._buffer, nodeOffset)) {
        nodeOffset = getNodeChildOffset(this._buffer, nodeOffset, i);
        nodeWalks++;

        if (nodeWalks > Node.TREE_HEIGHT_MAX) {
          throw new Lite3Error('Tree height exceeded maximum', ErrorCode.BAD_MESSAGE);
        }
      } else {
        return null;
      }
    }
  }

  /**
   * Read value at offset
   *
   * @private
   */
  _readValue(valOffset) {
    const type = this._buffer[valOffset];

    switch (type) {
      case Type.NULL:
        return null;

      case Type.BOOL:
        return this._buffer[valOffset + VAL_SIZE] !== 0;

      case Type.I64: {
        const val = readInt64(this._buffer, valOffset + VAL_SIZE);
        // Convert to number if safe
        if (val >= -9007199254740991n && val <= 9007199254740991n) {
          return Number(val);
        }
        return val;
      }

      case Type.F64:
        return readFloat64(this._buffer, valOffset + VAL_SIZE);

      case Type.STRING: {
        const len = readUint32(this._buffer, valOffset + VAL_SIZE);
        // len includes null terminator
        return decodeString(this._buffer, valOffset + VAL_SIZE + 4, len - 1);
      }

      case Type.BYTES: {
        const len = readUint32(this._buffer, valOffset + VAL_SIZE);
        return this._buffer.slice(valOffset + VAL_SIZE + 4, valOffset + VAL_SIZE + 4 + len);
      }

      case Type.OBJECT:
        return this._readObject(valOffset);

      case Type.ARRAY:
        return this._readArray(valOffset);

      default:
        throw new Lite3Error(`Invalid value type: ${type}`, ErrorCode.BAD_MESSAGE);
    }
  }

  /**
   * Read object at offset
   *
   * @private
   */
  _readObject(nodeOffset) {
    const result = {};

    for (const { key, valueOffset } of this._iterate(nodeOffset)) {
      result[key] = this._readValue(valueOffset);
    }

    return result;
  }

  /**
   * Read array at offset
   *
   * @private
   */
  _readArray(nodeOffset) {
    const result = [];
    const size = getNodeSize(this._buffer, nodeOffset);

    for (let i = 0; i < size; i++) {
      const findResult = this._findKey(nodeOffset, i);
      if (findResult) {
        const kvOffset = getNodeKvOffset(this._buffer, findResult.nodeOffset, findResult.index);
        result.push(this._readValue(kvOffset));
      }
    }

    return result;
  }

  /**
   * Iterate over entries in object/array
   *
   * @private
   * @generator
   * @yields {{ key: string|null, valueOffset: number }}
   */
  *_iterate(rootOffset) {
    const type = getNodeType(this._buffer, rootOffset);
    const isObject = type === Type.OBJECT;

    const stack = [{ nodeOffset: rootOffset, index: 0 }];

    // Go to leftmost leaf
    while (hasChildren(this._buffer, stack[stack.length - 1].nodeOffset)) {
      const childOffset = getNodeChildOffset(this._buffer, stack[stack.length - 1].nodeOffset, 0);
      stack.push({ nodeOffset: childOffset, index: 0 });
    }

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const keyCount = getNodeKeyCount(this._buffer, current.nodeOffset);

      if (current.index >= keyCount) {
        stack.pop();
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          const parentKeyCount = getNodeKeyCount(this._buffer, parent.nodeOffset);

          if (parent.index < parentKeyCount) {
            const kvOffset = getNodeKvOffset(this._buffer, parent.nodeOffset, parent.index);

            if (isObject) {
              const key = this._readKey(kvOffset);
              const valueOffset = this._skipKey(kvOffset);
              yield { key, valueOffset };
            } else {
              yield { key: null, valueOffset: kvOffset };
            }

            parent.index++;

            // Go to next child and then to leftmost leaf
            if (hasChildren(this._buffer, parent.nodeOffset)) {
              let childOffset = getNodeChildOffset(this._buffer, parent.nodeOffset, parent.index);
              stack.push({ nodeOffset: childOffset, index: 0 });

              while (hasChildren(this._buffer, stack[stack.length - 1].nodeOffset)) {
                childOffset = getNodeChildOffset(this._buffer, stack[stack.length - 1].nodeOffset, 0);
                stack.push({ nodeOffset: childOffset, index: 0 });
              }
            }
          }
        }
        continue;
      }

      const kvOffset = getNodeKvOffset(this._buffer, current.nodeOffset, current.index);

      if (isObject) {
        const key = this._readKey(kvOffset);
        const valueOffset = this._skipKey(kvOffset);
        yield { key, valueOffset };
      } else {
        yield { key: null, valueOffset: kvOffset };
      }

      current.index++;

      // Go to next child's leftmost leaf
      if (hasChildren(this._buffer, current.nodeOffset)) {
        let childOffset = getNodeChildOffset(this._buffer, current.nodeOffset, current.index);
        stack.push({ nodeOffset: childOffset, index: 0 });

        while (hasChildren(this._buffer, stack[stack.length - 1].nodeOffset)) {
          childOffset = getNodeChildOffset(this._buffer, stack[stack.length - 1].nodeOffset, 0);
          stack.push({ nodeOffset: childOffset, index: 0 });
        }
      }
    }
  }

  /**
   * Read key at kv offset
   *
   * @private
   */
  _readKey(kvOffset) {
    const tagByte = this._buffer[kvOffset];
    const tagSize = (tagByte & KeyTag.SIZE_MASK) + 1;
    const keySize = readVarUint(this._buffer, kvOffset, tagSize) >>> KeyTag.KEY_SIZE_SHIFT;
    // keySize includes null terminator
    return decodeString(this._buffer, kvOffset + tagSize, keySize - 1);
  }

  /**
   * Convert to plain JavaScript object/array
   *
   * @returns {Object|Array} Plain JS object or array
   */
  toJSON() {
    this._checkInitialized();

    const type = getNodeType(this._buffer, 0);
    if (type === Type.OBJECT) {
      return this._readObject(0);
    } else if (type === Type.ARRAY) {
      return this._readArray(0);
    }

    throw new Lite3Error('Root must be object or array', ErrorCode.BAD_MESSAGE);
  }

  /**
   * Create from plain JavaScript object/array
   *
   * @param {Object|Array} data - The data
   * @returns {Lite3} New Lite3 instance
   */
  static fromJSON(data) {
    const lite3 = new Lite3();

    if (Array.isArray(data)) {
      lite3.initArray();
      for (const item of data) {
        lite3.appendValue(item, 0);
      }
    } else if (typeof data === 'object' && data !== null) {
      lite3.initObject();
      for (const [key, value] of Object.entries(data)) {
        lite3.set(key, value, 0);
      }
    } else {
      throw new Lite3Error('Root must be object or array', ErrorCode.INVALID_ARGUMENT);
    }

    return lite3;
  }

  /**
   * Create from existing buffer
   *
   * @param {Uint8Array} buffer - The buffer
   * @param {number} [length] - Used length (defaults to buffer length)
   * @returns {Lite3} New Lite3 instance
   */
  static fromBuffer(buffer, length) {
    const lite3 = new Lite3(buffer.length);
    lite3._buffer.set(buffer);
    lite3._buflen = length ?? buffer.length;
    lite3._initialized = true;
    return lite3;
  }

  /**
   * Get the type of root
   *
   * @returns {number} Type.OBJECT or Type.ARRAY
   */
  getType() {
    this._checkInitialized();
    return getNodeType(this._buffer, 0);
  }

  /**
   * Get keys of object
   *
   * @param {number} [offset=0] - Object offset
   * @returns {string[]} Array of keys
   */
  keys(offset = 0) {
    this._checkInitialized();

    const result = [];
    for (const { key } of this._iterate(offset)) {
      if (key !== null) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Get values of object/array
   *
   * @param {number} [offset=0] - Object/array offset
   * @returns {Array} Array of values
   */
  values(offset = 0) {
    this._checkInitialized();

    const result = [];
    for (const { valueOffset } of this._iterate(offset)) {
      result.push(this._readValue(valueOffset));
    }
    return result;
  }

  /**
   * Get entries of object
   *
   * @param {number} [offset=0] - Object offset
   * @returns {Array<[string, *]>} Array of [key, value] pairs
   */
  entries(offset = 0) {
    this._checkInitialized();

    const result = [];
    for (const { key, valueOffset } of this._iterate(offset)) {
      if (key !== null) {
        result.push([key, this._readValue(valueOffset)]);
      }
    }
    return result;
  }
}

// Re-export constants and types
export { Type, TypeSizes, Node, IterResult };
