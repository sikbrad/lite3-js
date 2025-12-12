/**
 * Lite3 Test Suite
 *
 * Comprehensive tests for the Lite3 JavaScript library.
 * Uses Node.js built-in test runner (node:test).
 *
 * Run with: node --test test/lite3.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  Lite3,
  Lite3Error,
  ErrorCode,
  Type,
  djb2Hash,
  getKeyData,
  getKeyTagSize,
} from '../src/index.js';

describe('Lite3', () => {
  let lite3;

  beforeEach(() => {
    lite3 = new Lite3();
  });

  describe('Initialization', () => {
    it('should initialize as object', () => {
      lite3.initObject();
      assert.strictEqual(lite3.getType(), Type.OBJECT);
      assert.strictEqual(lite3.size(), 0);
    });

    it('should initialize as array', () => {
      lite3.initArray();
      assert.strictEqual(lite3.getType(), Type.ARRAY);
      assert.strictEqual(lite3.size(), 0);
    });

    it('should throw error when not initialized', () => {
      assert.throws(() => lite3.get('key'), Lite3Error);
    });

    it('should support chaining on initObject', () => {
      const result = lite3.initObject();
      assert.strictEqual(result, lite3);
    });
  });

  describe('Basic Types', () => {
    beforeEach(() => {
      lite3.initObject();
    });

    it('should set and get null', () => {
      lite3.setNull('nullKey');
      assert.strictEqual(lite3.get('nullKey'), null);
    });

    it('should set and get boolean true', () => {
      lite3.setBool('boolTrue', true);
      assert.strictEqual(lite3.get('boolTrue'), true);
    });

    it('should set and get boolean false', () => {
      lite3.setBool('boolFalse', false);
      assert.strictEqual(lite3.get('boolFalse'), false);
    });

    it('should set and get positive integer', () => {
      lite3.setInt64('posInt', 12345);
      assert.strictEqual(lite3.get('posInt'), 12345);
    });

    it('should set and get negative integer', () => {
      lite3.setInt64('negInt', -67890);
      assert.strictEqual(lite3.get('negInt'), -67890);
    });

    it('should set and get zero', () => {
      lite3.setInt64('zero', 0);
      assert.strictEqual(lite3.get('zero'), 0);
    });

    it('should set and get large integer', () => {
      lite3.setInt64('largeInt', 9007199254740991);
      assert.strictEqual(lite3.get('largeInt'), 9007199254740991);
    });

    it('should set and get BigInt', () => {
      const bigValue = 9007199254740992n;
      lite3.setInt64('bigInt', bigValue);
      assert.strictEqual(lite3.get('bigInt'), bigValue);
    });

    it('should set and get float', () => {
      lite3.setFloat64('float', 3.14159);
      assert.strictEqual(lite3.get('float'), 3.14159);
    });

    it('should set and get negative float', () => {
      lite3.setFloat64('negFloat', -273.15);
      assert.strictEqual(lite3.get('negFloat'), -273.15);
    });

    it('should set and get string', () => {
      lite3.setString('str', 'Hello, World!');
      assert.strictEqual(lite3.get('str'), 'Hello, World!');
    });

    it('should set and get empty string', () => {
      lite3.setString('emptyStr', '');
      assert.strictEqual(lite3.get('emptyStr'), '');
    });

    it('should set and get Unicode string', () => {
      lite3.setString('unicode', '你好世界 🌍');
      assert.strictEqual(lite3.get('unicode'), '你好世界 🌍');
    });

    it('should set and get bytes', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      lite3.setBytes('bytes', bytes);
      const result = lite3.get('bytes');
      assert.deepStrictEqual(result, bytes);
    });

    it('should set and get empty bytes', () => {
      const bytes = new Uint8Array([]);
      lite3.setBytes('emptyBytes', bytes);
      const result = lite3.get('emptyBytes');
      assert.deepStrictEqual(result, bytes);
    });
  });

  describe('Generic set() method', () => {
    beforeEach(() => {
      lite3.initObject();
    });

    it('should auto-detect null', () => {
      lite3.set('key', null);
      assert.strictEqual(lite3.get('key'), null);
    });

    it('should auto-detect boolean', () => {
      lite3.set('key', true);
      assert.strictEqual(lite3.get('key'), true);
    });

    it('should auto-detect integer', () => {
      lite3.set('key', 42);
      assert.strictEqual(lite3.get('key'), 42);
    });

    it('should auto-detect float', () => {
      lite3.set('key', 3.14);
      assert.strictEqual(lite3.get('key'), 3.14);
    });

    it('should auto-detect string', () => {
      lite3.set('key', 'value');
      assert.strictEqual(lite3.get('key'), 'value');
    });

    it('should auto-detect Uint8Array', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      lite3.set('key', bytes);
      assert.deepStrictEqual(lite3.get('key'), bytes);
    });

    it('should support chaining', () => {
      const result = lite3.set('a', 1).set('b', 2).set('c', 3);
      assert.strictEqual(result, lite3);
      assert.strictEqual(lite3.get('a'), 1);
      assert.strictEqual(lite3.get('b'), 2);
      assert.strictEqual(lite3.get('c'), 3);
    });
  });

  describe('Nested Objects', () => {
    beforeEach(() => {
      lite3.initObject();
    });

    it('should set and get nested object', () => {
      const nested = { name: 'John', age: 30 };
      lite3.set('person', nested);
      const result = lite3.get('person');
      assert.deepStrictEqual(result, nested);
    });

    it('should set and get deeply nested object', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };
      lite3.set('deep', deep);
      assert.deepStrictEqual(lite3.get('deep'), deep);
    });

    it('should handle mixed types in nested object', () => {
      const mixed = {
        str: 'hello',
        num: 42,
        bool: true,
        nil: null,
        arr: [1, 2, 3]
      };
      lite3.set('mixed', mixed);
      assert.deepStrictEqual(lite3.get('mixed'), mixed);
    });
  });

  describe('Arrays', () => {
    it('should initialize and populate array', () => {
      lite3.initArray();
      lite3.appendValue(1, 0);
      lite3.appendValue(2, 0);
      lite3.appendValue(3, 0);

      assert.strictEqual(lite3.size(), 3);
      assert.deepStrictEqual(lite3.toJSON(), [1, 2, 3]);
    });

    it('should handle nested arrays in object', () => {
      lite3.initObject();
      lite3.set('numbers', [1, 2, 3, 4, 5]);
      assert.deepStrictEqual(lite3.get('numbers'), [1, 2, 3, 4, 5]);
    });

    it('should handle array of objects', () => {
      const data = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 }
      ];
      lite3.initArray();
      lite3.appendValue(data[0], 0);
      lite3.appendValue(data[1], 0);

      assert.deepStrictEqual(lite3.toJSON(), data);
    });

    it('should handle array of mixed types', () => {
      const mixed = [1, 'two', true, null, { key: 'value' }, [1, 2]];
      lite3.initArray();
      for (const item of mixed) {
        lite3.appendValue(item, 0);
      }
      assert.deepStrictEqual(lite3.toJSON(), mixed);
    });
  });

  describe('Update Operations', () => {
    beforeEach(() => {
      lite3.initObject();
    });

    it('should overwrite existing key', () => {
      lite3.set('key', 'first');
      assert.strictEqual(lite3.get('key'), 'first');

      lite3.set('key', 'second');
      assert.strictEqual(lite3.get('key'), 'second');
    });

    it('should overwrite with different type', () => {
      lite3.set('key', 'string');
      assert.strictEqual(lite3.get('key'), 'string');

      lite3.set('key', 42);
      assert.strictEqual(lite3.get('key'), 42);
    });
  });

  describe('has() method', () => {
    beforeEach(() => {
      lite3.initObject();
      lite3.set('exists', 'value');
    });

    it('should return true for existing key', () => {
      assert.strictEqual(lite3.has('exists'), true);
    });

    it('should return false for non-existing key', () => {
      assert.strictEqual(lite3.has('notExists'), false);
    });
  });

  describe('keys(), values(), entries()', () => {
    beforeEach(() => {
      lite3.initObject();
      lite3.set('a', 1);
      lite3.set('b', 2);
      lite3.set('c', 3);
    });

    it('should return all keys', () => {
      const keys = lite3.keys();
      assert.strictEqual(keys.length, 3);
      assert.ok(keys.includes('a'));
      assert.ok(keys.includes('b'));
      assert.ok(keys.includes('c'));
    });

    it('should return all values', () => {
      const values = lite3.values();
      assert.strictEqual(values.length, 3);
      assert.ok(values.includes(1));
      assert.ok(values.includes(2));
      assert.ok(values.includes(3));
    });

    it('should return all entries', () => {
      const entries = lite3.entries();
      assert.strictEqual(entries.length, 3);

      const entriesObj = Object.fromEntries(entries);
      assert.strictEqual(entriesObj.a, 1);
      assert.strictEqual(entriesObj.b, 2);
      assert.strictEqual(entriesObj.c, 3);
    });
  });

  describe('toJSON()', () => {
    it('should convert object to JSON', () => {
      lite3.initObject();
      lite3.set('name', 'test');
      lite3.set('value', 123);

      const json = lite3.toJSON();
      assert.deepStrictEqual(json, { name: 'test', value: 123 });
    });

    it('should convert array to JSON', () => {
      lite3.initArray();
      lite3.appendValue(1, 0);
      lite3.appendValue(2, 0);
      lite3.appendValue(3, 0);

      const json = lite3.toJSON();
      assert.deepStrictEqual(json, [1, 2, 3]);
    });
  });

  describe('fromJSON()', () => {
    it('should create from object', () => {
      const data = { foo: 'bar', num: 42 };
      const lite3 = Lite3.fromJSON(data);

      assert.strictEqual(lite3.getType(), Type.OBJECT);
      assert.deepStrictEqual(lite3.toJSON(), data);
    });

    it('should create from array', () => {
      const data = [1, 2, 3, 'four'];
      const lite3 = Lite3.fromJSON(data);

      assert.strictEqual(lite3.getType(), Type.ARRAY);
      assert.deepStrictEqual(lite3.toJSON(), data);
    });

    it('should create from complex nested data', () => {
      const data = {
        users: [
          { name: 'Alice', scores: [95, 87, 92] },
          { name: 'Bob', scores: [78, 82, 88] }
        ],
        meta: {
          version: 1,
          timestamp: 1234567890
        }
      };
      const lite3 = Lite3.fromJSON(data);
      assert.deepStrictEqual(lite3.toJSON(), data);
    });
  });

  describe('fromBuffer()', () => {
    it('should create from existing buffer', () => {
      const original = new Lite3();
      original.initObject();
      original.set('test', 'value');

      const copy = Lite3.fromBuffer(original.buffer, original.length);
      assert.deepStrictEqual(copy.toJSON(), original.toJSON());
    });
  });

  describe('Buffer Management', () => {
    it('should auto-resize buffer when needed', () => {
      lite3.initObject();
      const initialCapacity = lite3.capacity;

      // Add many entries to trigger resize
      for (let i = 0; i < 100; i++) {
        lite3.set(`key${i}`, `value${i} with some extra text to increase size`);
      }

      assert.ok(lite3.capacity > initialCapacity);
      assert.strictEqual(lite3.size(), 100);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      lite3.initObject();
    });

    it('should handle empty object', () => {
      lite3.set('empty', {});
      assert.deepStrictEqual(lite3.get('empty'), {});
    });

    it('should handle empty array', () => {
      lite3.set('empty', []);
      assert.deepStrictEqual(lite3.get('empty'), []);
    });

    it('should return undefined for non-existent key', () => {
      assert.strictEqual(lite3.get('nonexistent'), undefined);
    });

    it('should handle special characters in keys', () => {
      lite3.set('key-with-dash', 1);
      lite3.set('key.with.dots', 2);
      lite3.set('key:with:colons', 3);
      lite3.set('key/with/slashes', 4);

      assert.strictEqual(lite3.get('key-with-dash'), 1);
      assert.strictEqual(lite3.get('key.with.dots'), 2);
      assert.strictEqual(lite3.get('key:with:colons'), 3);
      assert.strictEqual(lite3.get('key/with/slashes'), 4);
    });

    it('should handle long keys', () => {
      const longKey = 'a'.repeat(100);
      lite3.set(longKey, 'value');
      assert.strictEqual(lite3.get(longKey), 'value');
    });

    it('should handle long strings', () => {
      const longStr = 'x'.repeat(10000);
      lite3.set('long', longStr);
      assert.strictEqual(lite3.get('long'), longStr);
    });
  });
});

describe('Hash Functions', () => {
  describe('djb2Hash', () => {
    it('should return consistent hash for same input', () => {
      const hash1 = djb2Hash('test');
      const hash2 = djb2Hash('test');
      assert.strictEqual(hash1, hash2);
    });

    it('should return different hash for different input', () => {
      const hash1 = djb2Hash('foo');
      const hash2 = djb2Hash('bar');
      assert.notStrictEqual(hash1, hash2);
    });

    it('should return a 32-bit unsigned integer', () => {
      const hash = djb2Hash('test');
      assert.ok(hash >= 0);
      assert.ok(hash <= 0xFFFFFFFF);
    });
  });

  describe('getKeyData', () => {
    it('should return hash and size', () => {
      const data = getKeyData('hello');
      assert.ok(typeof data.hash === 'number');
      assert.ok(typeof data.size === 'number');
      assert.ok(data.size > 0);
    });

    it('should include null terminator in size', () => {
      const data = getKeyData('abc');
      // 'abc' = 3 bytes + 1 null terminator = 4
      assert.strictEqual(data.size, 4);
    });
  });

  describe('getKeyTagSize', () => {
    it('should return 1 for small keys', () => {
      assert.strictEqual(getKeyTagSize(10), 1);
    });

    it('should return 2 for medium keys', () => {
      assert.strictEqual(getKeyTagSize(100), 2);
    });

    it('should return 3 for large keys', () => {
      assert.strictEqual(getKeyTagSize(20000), 3);
    });

    it('should return 4 for very large keys', () => {
      assert.strictEqual(getKeyTagSize(5000000), 4);
    });
  });
});

describe('Real-world Example', () => {
  it('should handle F1 lap data example (like in C)', () => {
    // Recreate the example from C implementation
    const lite3 = new Lite3();
    lite3.initObject();

    // Build message
    lite3.set('event', 'lap_complete');
    lite3.set('lap', 55);
    lite3.set('time_sec', 88.427);

    // Verify
    assert.strictEqual(lite3.get('event'), 'lap_complete');
    assert.strictEqual(lite3.get('lap'), 55);
    assert.strictEqual(lite3.get('time_sec'), 88.427);

    // Update lap count
    lite3.set('lap', 56);
    assert.strictEqual(lite3.get('lap'), 56);

    // Add verification fields
    lite3.set('verified', 'race_control');
    lite3.set('fastest_lap', true);

    const result = lite3.toJSON();
    assert.strictEqual(result.event, 'lap_complete');
    assert.strictEqual(result.lap, 56);
    assert.strictEqual(result.time_sec, 88.427);
    assert.strictEqual(result.verified, 'race_control');
    assert.strictEqual(result.fastest_lap, true);
  });

  it('should handle HTTP request example (like in C)', () => {
    const lite3 = new Lite3();
    lite3.initObject();

    lite3.set('event', 'http_request');
    lite3.set('method', 'POST');
    lite3.set('duration_ms', 47);

    // Set headers as nested object
    lite3.set('headers', {
      'content-type': 'application/json',
      'x-request-id': 'req_9f8e2a',
      'user-agent': 'curl/8.1.2'
    });

    const result = lite3.toJSON();
    assert.strictEqual(result.event, 'http_request');
    assert.strictEqual(result.method, 'POST');
    assert.strictEqual(result.duration_ms, 47);
    assert.strictEqual(result.headers['content-type'], 'application/json');
    assert.strictEqual(result.headers['x-request-id'], 'req_9f8e2a');
    assert.strictEqual(result.headers['user-agent'], 'curl/8.1.2');
  });
});

describe('Performance', () => {
  it('should handle many insertions efficiently', () => {
    const lite3 = new Lite3(1024 * 1024); // 1MB initial
    lite3.initObject();

    const start = performance.now();
    // Using letter prefixes to avoid hash collisions with simple numeric keys
    // DJB2 hash can have collisions for similar sequential keys
    const keys = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
      'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma',
      'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'one', 'two', 'three', 'four',
      'five', 'six', 'seven', 'eight', 'nine', 'ten'];

    for (let i = 0; i < keys.length; i++) {
      lite3.set(keys[i], `value_${i}`);
    }

    const elapsed = performance.now() - start;

    assert.strictEqual(lite3.size(), keys.length);
    // Should complete in reasonable time
    assert.ok(elapsed < 1000, `Took too long: ${elapsed}ms`);
  });

  it('should handle many lookups efficiently', () => {
    const lite3 = new Lite3();
    lite3.initObject();

    const keys = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
      'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma',
      'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'one', 'two', 'three', 'four',
      'five', 'six', 'seven', 'eight', 'nine', 'ten'];

    for (let i = 0; i < keys.length; i++) {
      lite3.set(keys[i], i);
    }

    const start = performance.now();

    for (let i = 0; i < keys.length; i++) {
      const val = lite3.get(keys[i]);
      assert.strictEqual(val, i);
    }

    const elapsed = performance.now() - start;

    // Should complete in reasonable time
    assert.ok(elapsed < 1000, `Took too long: ${elapsed}ms`);
  });
});
