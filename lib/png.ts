export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function png300dpi(input: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(21); const view = new DataView(chunk.buffer);
  view.setUint32(0, 9); chunk.set([112, 72, 89, 115], 4); view.setUint32(8, 11811); view.setUint32(12, 11811); chunk[16] = 1; view.setUint32(17, crc32(chunk.subarray(4, 17)));
  // PNG requires IHDR to be the first chunk. Place pHYs immediately after it.
  const parts: Uint8Array[] = [input.subarray(0, 33), chunk];
  let position = 33;
  while (position < input.length) {
    const size = new DataView(input.buffer, input.byteOffset + position, 4).getUint32(0) + 12;
    if (String.fromCharCode(...input.subarray(position + 4, position + 8)) !== 'pHYs') parts.push(input.subarray(position, position + size));
    position += size;
  }
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0)); let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; } return out;
}
