const encoder = require('./module.cjs');

// This is the format for data layout
const schema = [
  { name: "testvalue1", bits: 32, type: "int", precision: 10000 },
  { name: "testvalue2", bits: 24, type: "uint" },
  { name: "hello", bits: 8, type: "uint" },
];

// Test data
const testData = {
  testvalue1: 160.2216,
  testvalue2: 10,
  hello: 255
};

// Precompute bit widths
encoder.setup(schema);

// Encoding
encoder.encode(testData, encoder.buffer);

// Decoding
const decoded = encoder.decode(encoder.buffer);

// Testing for accuracy
console.log('Original:', testData);
console.log('Decoded:', decoded);
console.log(`Buffer size: ${encoder.bufferSize} bytes`);
