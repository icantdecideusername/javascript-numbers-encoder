'use strict';

// Define functions
let encode, decode, buffer, bufferSize, u8;

// Script to find the best way to encode a set of data
function precomputeSchema(schema) {
  let offset = 0;

  // Map each field to chunks describing how bits fit into bytes
  for (const field of schema) {
    field.bitStart = offset;
    offset += field.bits;

    const chunks = [];
    let bitsLeft = field.bits;
    let shift = 0;

    while (bitsLeft > 0) {
      const absBit = field.bitStart + shift;
      const bytePos = Math.floor(absBit / 8);
      const bitPos = absBit % 8;
      const bitsInThisByte = Math.min(8 - bitPos, bitsLeft);
      const mask = (1 << bitsInThisByte) - 1;

      chunks.push({ bytePos, bitPos, bitsInThisByte, mask, shift });

      bitsLeft -= bitsInThisByte;
      shift += bitsInThisByte;
    }

    field.chunks = chunks;
  }

  bufferSize = Math.ceil(offset / 8);
  buffer = new ArrayBuffer(bufferSize);
  u8 = new Uint8Array(buffer);

  return { schema, bufferSize, buffer };
}

function generateEncoder(fields) {
  const uniqueBytes = new Set();
  for (const f of fields) {
    for (const c of f.chunks) {
      uniqueBytes.add(c.bytePos);
    }
  }
  const byteVars = Array.from(uniqueBytes).sort((a,b) => a - b);

  let code = 'return function encode(obj) {\n';
  code += '  const a = u8;\n';
  code += '  let val = 0, toWrite = 0;\n';

  // Declare byteVal vars once at top
  for (const bytePos of byteVars) {
    code += `  let byteVal${bytePos} = 0;\n`;
  }

  // Initialize bytes to zero before encoding
  for (const bytePos of byteVars) {
    code += `  byteVal${bytePos} = 0;\n`;
  }

  for (const f of fields) {
    const { name, bits, type = 'uint', precision = 1, chunks } = f;
    code += `  val = Math.round(obj["${name}"] * ${precision});\n`;

    // Handle signed ints with two's complement wrapping
    if (type === 'int') {
      code += `  if (val < 0) val += 1 << ${bits};\n`;
    }

    // Group chunks by bytePos
    const groups = {};
    for (const c of chunks) {
      if (!groups[c.bytePos]) groups[c.bytePos] = [];
      groups[c.bytePos].push(c);
    }

    for (const bytePosStr in groups) {
      const bytePos = +bytePosStr;
      code += `  // bytePos ${bytePos}\n`;
      for (const c of groups[bytePos]) {
        code += `  toWrite = (val >>> ${c.shift}) & ${c.mask};\n`;
        code += `  byteVal${bytePos} = (byteVal${bytePos} & ~(${c.mask} << ${c.bitPos})) | (toWrite << ${c.bitPos});\n`;
      }
      code += `  a[${bytePos}] = byteVal${bytePos};\n`;
    }
  }

  code += '}\n';

  return new Function('u8', code)(u8);
}

function generateDecoder(fields) {
  let code = 'return function decode() {\n';
  code += '  const a = u8;\n';
  code += '  let val = 0;\n';
  code += '  const result = {};\n';

  for (const f of fields) {
    const { name, bits, type = 'uint', precision = 1, chunks } = f;

    code += '  val = 0;\n';
    for (const c of chunks) {
      code += `  val |= ((a[${c.bytePos}] >>> ${c.bitPos}) & ${c.mask}) << ${c.shift};\n`;
    }

    if (type === 'int') {
      code += `  if ((val & (1 << (${bits} - 1))) !== 0) val -= 1 << ${bits};\n`;
    }

    code += `  result["${name}"] = val / ${precision};\n`;
  }

  code += '  return result;\n}\n';

  return new Function('u8', code)(u8);
}

function setup(schema) {
  // schema = array of { name, bits, type?, precision? }
  const processed = precomputeSchema(schema);
  encode = generateEncoder(processed.schema);
  decode = generateDecoder(processed.schema);
}

module.exports = {
  setup,
  get encode() { return encode; },
  get decode() { return decode; },
  get buffer() { return buffer; },
  get bufferSize() { return bufferSize; },
};
