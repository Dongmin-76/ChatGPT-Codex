import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, png300dpi } from '../lib/png.ts';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64');
function chunks(input) { const b = Buffer.from(input); const result=[]; for(let p=8;p<b.length;) { const n=b.readUInt32BE(p); result.push({type:b.toString('ascii',p+4,p+8),data:b.subarray(p+8,p+8+n),crc:b.readUInt32BE(p+8+n),raw:b.subarray(p,p+n+12)}); p+=n+12; } return result; }
test('PNG resolution metadata keeps IHDR first and original pixel data intact',()=>{
  const encoded=chunks(png300dpi(png)); assert.equal(encoded[0].type,'IHDR'); assert.equal(encoded[1].type,'pHYs');
  assert.deepEqual(encoded.filter(x=>x.type!=='pHYs').map(x=>x.raw),chunks(png).map(x=>x.raw));
  assert.equal(encoded[1].data.readUInt32BE(0),11811); assert.equal(encoded[1].data.readUInt32BE(4),11811); assert.equal(encoded[1].data[8],1);
  assert.equal(encoded[1].crc,crc32(Buffer.concat([Buffer.from('pHYs'),encoded[1].data])));
});
test('updating resolution twice does not create duplicate pHYs chunks',()=>assert.equal(chunks(png300dpi(png300dpi(png))).filter(x=>x.type==='pHYs').length,1));
test('CRC implementation matches the PNG standard check vector',()=>assert.equal(crc32(Buffer.from('123456789')),0xcbf43926));
