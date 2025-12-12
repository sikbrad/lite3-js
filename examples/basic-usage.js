/**
 * Lite3 Basic Usage Example
 *
 * This example demonstrates the basic usage of the Lite3 JavaScript library.
 * It recreates the examples from the C implementation.
 *
 * Run with: node examples/basic-usage.js
 */

import Lite3 from '../src/index.js';

console.log('=== Lite3 JavaScript Library - Basic Usage ===\n');

// Example 1: Building Messages (like 01-building-messages.c)
console.log('--- Example 1: Building Messages ---');
{
  const lite3 = new Lite3();

  // Initialize as object
  lite3.initObject();

  // Build message
  lite3.set('event', 'lap_complete');
  lite3.set('lap', 55);
  lite3.set('time_sec', 88.427);

  console.log('Buffer length:', lite3.length);
  console.log('Message:', JSON.stringify(lite3.toJSON(), null, 2));

  // Update lap count
  console.log('\nUpdating lap count...');
  lite3.set('lap', 56);
  console.log('Data to send:', JSON.stringify(lite3.toJSON(), null, 2));

  // Simulate receive and mutate
  console.log('\nSimulating receive and verify...');
  const received = Lite3.fromBuffer(lite3.buffer, lite3.length);
  received.set('verified', 'race_control');
  received.set('fastest_lap', true);

  console.log('Modified data:', JSON.stringify(received.toJSON(), null, 2));
}

// Example 2: Nested Objects (like 04-nesting.c)
console.log('\n--- Example 2: Nested Objects ---');
{
  const lite3 = new Lite3();
  lite3.initObject();

  // Build message with nested headers
  lite3.set('event', 'http_request');
  lite3.set('method', 'POST');
  lite3.set('duration_ms', 47);
  lite3.set('headers', {
    'content-type': 'application/json',
    'x-request-id': 'req_9f8e2a',
    'user-agent': 'curl/8.1.2'
  });

  console.log('Message:', JSON.stringify(lite3.toJSON(), null, 2));

  // Get nested value
  const headers = lite3.get('headers');
  console.log('\nUser agent:', headers['user-agent']);
}

// Example 3: Arrays
console.log('\n--- Example 3: Arrays ---');
{
  const lite3 = new Lite3();
  lite3.initObject();

  // Set array value
  lite3.set('scores', [95, 87, 92, 88, 91]);
  lite3.set('tags', ['javascript', 'lite3', 'serialization']);

  // Mixed types array
  lite3.set('mixed', [1, 'two', true, null, { nested: 'object' }]);

  console.log('Message:', JSON.stringify(lite3.toJSON(), null, 2));
}

// Example 4: fromJSON / toJSON
console.log('\n--- Example 4: fromJSON / toJSON Conversion ---');
{
  // Create from existing JavaScript object
  const data = {
    users: [
      { name: 'Alice', age: 25, active: true },
      { name: 'Bob', age: 30, active: false }
    ],
    meta: {
      version: 1,
      timestamp: Date.now()
    }
  };

  const lite3 = Lite3.fromJSON(data);
  console.log('Created from JSON, buffer length:', lite3.length);

  // Convert back to JSON
  const result = lite3.toJSON();
  console.log('Converted back:', JSON.stringify(result, null, 2));

  // Note: Keys are sorted by hash in B-tree, so order may differ
  // We verify by checking individual values
  const integrityCheck =
    result.users.length === data.users.length &&
    result.users[0].name === data.users[0].name &&
    result.meta.version === data.meta.version;
  console.log('\nData integrity check:', integrityCheck ? 'PASSED' : 'FAILED');
}

// Example 5: Iteration
console.log('\n--- Example 5: Iteration ---');
{
  const lite3 = new Lite3();
  lite3.initObject();

  lite3.set('name', 'John Doe');
  lite3.set('age', 30);
  lite3.set('city', 'New York');
  lite3.set('active', true);

  console.log('Keys:', lite3.keys());
  console.log('Values:', lite3.values());
  console.log('Entries:', lite3.entries());
  console.log('Size:', lite3.size());
}

// Example 6: Binary Data
console.log('\n--- Example 6: Binary Data ---');
{
  const lite3 = new Lite3();
  lite3.initObject();

  // Store binary data
  const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
  lite3.setBytes('rawData', binaryData);

  // Retrieve and display
  const retrieved = lite3.get('rawData');
  console.log('Binary data:', Array.from(retrieved).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('As string:', new TextDecoder().decode(retrieved));
}

// Example 7: Large Integer / BigInt
console.log('\n--- Example 7: Large Integers ---');
{
  const lite3 = new Lite3();
  lite3.initObject();

  // Safe integer
  lite3.setInt64('safeInt', 9007199254740991);

  // BigInt for larger values
  lite3.setInt64('bigInt', 9223372036854775807n);

  console.log('Safe integer:', lite3.get('safeInt'));
  console.log('BigInt:', lite3.get('bigInt'));
}

// Example 8: Method Chaining
console.log('\n--- Example 8: Method Chaining ---');
{
  const lite3 = new Lite3()
    .initObject()
    .set('name', 'Product')
    .set('price', 99.99)
    .set('inStock', true)
    .set('tags', ['electronics', 'gadget'])
    .setNull('discount');

  console.log('Chained result:', JSON.stringify(lite3.toJSON(), null, 2));
}

console.log('\n=== All examples completed successfully! ===');
