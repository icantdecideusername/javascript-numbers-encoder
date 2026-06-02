'use strict';

let encode, decode, buffer, bufferSize, u8;

const SAFE_BITS = 53;

// Schema preprocessing
function precomputeSchema(schema) {
  let offset = 0;

  for (const field of schema) {
    field.bitStart = offset;
    offset += field.bits;

    field.isBigInt = field.bits > SAFE_BITS || field.type === 'uint64' || field.type === 'int64';

    const chunks = [];
    let bitsLeft = field.bits;
    let shift = 0;

    while (bitsLeft > 0) {
      const absBit = field.bitStart + shift;
      const bytePos = Math.floor(absBit / 8);
      const bitPos = absBit % 8;
      const bitsInThisByte = Math.min(8 - bitPos, bitsLeft);

      const mask = (1 << bitsInThisByte) - 1;

      chunks.push({
        bytePos,
        bitPos,
        bitsInThisByte,
        mask,
        shift
      });

      bitsLeft -= bitsInThisByte;
      shift += bitsInThisByte;
    }

    field.chunks = chunks;
  }

  bufferSize = Math.ceil(offset / 8);
  buffer = new ArrayBuffer(bufferSize);
  u8 = new Uint8Array(buffer);

  return schema;
}

// Generate the encoder function I don't understand half of the code I wrote
function generateEncoder(fields) {
  let code = `
return function encode(obj) {
  const a = u8;
  let val;
  let toWrite;
`;

  for (const f of fields) {
    code += `\n  // field: ${f.name}\n`;

    if (f.isBigInt) {
      // Safe fixed point first
      code += `
  val = BigInt(Math.round(obj["${f.name}"] * ${f.precision || 1}));
`;

      if (f.type === 'int64') {
        code += `
  if (val < 0n) val += 1n << BigInt(${f.bits});
`;
      }

      for (const c of f.chunks) {
        code += `
  toWrite = (val >> BigInt(${c.shift})) & ((1n << BigInt(${c.bitsInThisByte})) - 1n);
  a[${c.bytePos}] |= Number(toWrite) << ${c.bitPos};
`;
      }

    } else {
      code += `
  val = Math.round(obj["${f.name}"] * ${f.precision || 1});
`;

      if (f.type === 'int') {
        code += `
  if (val < 0) val += (1 << ${f.bits});
`;
      }

      for (const c of f.chunks) {
        code += `
  toWrite = (val >>> ${c.shift}) & ${c.mask};
  a[${c.bytePos}] |= toWrite << ${c.bitPos};
`;
      }
    }
  }

  code += `
}
`;

  return new Function('u8', code)(u8);
}

// Generate the decoder function
function generateDecoder(fields) {
  let code = `
return function decode() {
  const a = u8;
  let val;
  const out = {};
`;

  for (const f of fields) {
    code += `\n  // field: ${f.name}\n`;

    if (f.isBigInt) {
      code += `
  val = 0n;
`;

      for (const c of f.chunks) {
        code += `
  val |= ((BigInt(a[${c.bytePos}]) >> BigInt(${c.bitPos})) & ((1n << BigInt(${c.bitsInThisByte})) - 1n)) << BigInt(${c.shift});
`;
      }

      if (f.type === 'int64') {
        code += `
  if (val & (1n << BigInt(${f.bits - 1}))) {
    val -= 1n << BigInt(${f.bits});
  }
`;
      }

      code += `
  out["${f.name}"] = Number(val) / ${f.precision || 1};
`;

    } else {
      code += `
  val = 0;
`;

      for (const c of f.chunks) {
        code += `
  val |= ((a[${c.bytePos}] >>> ${c.bitPos}) & ${c.mask}) << ${c.shift};
`;
      }

      if (f.type === 'int') {
        code += `
  if (val & (1 << ${f.bits - 1})) {
    val -= 1 << ${f.bits};
  }
`;
      }

      code += `
  out["${f.name}"] = val / ${f.precision || 1};
`;
    }
  }

  code += `
  return out;
}
`;

  return new Function('u8', code)(u8);
}

// -------------------------
// Setup
// -------------------------
function setup(schema) {
  const processed = precomputeSchema(schema);
  encode = generateEncoder(processed);
  decode = generateDecoder(processed);
}


// Finally
module.exports = {
  setup,
  get encode() { return encode; },
  get decode() { return decode; },
  get buffer() { return buffer; },
  get bufferSize() { return bufferSize; },
};