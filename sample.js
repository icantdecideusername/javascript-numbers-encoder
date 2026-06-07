const encoder = require('./module64.cjs');7

// This is the format for data layout
const schema = [
  { name: "testvalue1", bits: 32, type: "int", precision: 10000 }, // lol
  { name: "testvalue2", bits: 24, type: "uint" }, // Bits could be anything
  { name: "yesorno", bits: 8, type: "uint" }, // If precision = 1 you won't have to add it
  { name: "hello", bits: 8, type: "uint" }, // You should use 8 bits as the program aligns output to the nearest byte
  { name: "int64", bits: 64 , type: "int64", precision: 100},
  { name: "uint64", bits: 64, type: "uint64", precision: 100},
];

// Test data
const testData = {
  testvalue1: 160.2216,
  testvalue2: 10,
  yesorno: 5,
  hello: 255,
  int64: -123456787654.321,
  uint64: 6767676767.67 // I got lazy
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
