const { performance } = require('perf_hooks');
const encoder = require('./module64.cjs');

const schema = [
  { name: "uint64", bits: 64, type: "uint64", precision: 100 }, // Testing 64 bit throughput
  { name: "a", bits: 24, type: "int", precision: 100 },
  { name: "b", bits: 32, type: "int", precision: 100 },
  { name: "byte", bits: 8, type: "uint", precision: 1 },
];

const Data = {
  int64: 30000000000.01,
  a: -694.20,
  b: -12345.99,
  character: 255
};

encoder.setup(schema);

// Warmup 10k cycles
for (let i = 0; i < 10_000; i++) {
  encoder.encode(Data, encoder.buffer);
  encoder.decode(encoder.buffer);
}

// Check correctness

console.log("Schema input");
console.log(JSON.stringify(schema, null, 2));

console.log("Input data");
console.log(JSON.stringify(Data, null, 2));

console.log("Output data");
console.log(JSON.stringify(encoder.decode(encoder.buffer), null, 2));

// Display buffer size
console.log(`Buffer size: ${encoder.bufferSize} bytes`);

// Benchmark encode
const encodeIterations = 1_000_000;
const encodeStart = performance.now();
for (let i = 0; i < encodeIterations; i++) {
  encoder.encode(Data, encoder.buffer);
}
const encodeEnd = performance.now();
const encodeDurationSec = (encodeEnd - encodeStart) / 1000;
console.log(`Encode ops/sec: ${(encodeIterations / encodeDurationSec).toFixed(2)}`);

// Benchmark decode
const decodeIterations = 1_000_000;
const decodeStart = performance.now();
for (let i = 0; i < decodeIterations; i++) {
  encoder.decode(encoder.buffer);
}
const decodeEnd = performance.now();
const decodeDurationSec = (decodeEnd - decodeStart) / 1000;
console.log(`Decode ops/sec: ${(decodeIterations / decodeDurationSec).toFixed(2)}`);
