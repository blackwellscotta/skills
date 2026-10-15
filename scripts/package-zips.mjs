// Zip each skill into dist/<name>.zip for upload to claude.ai or other apps
// that take skills as zip files. Each zip holds the skill folder at its root.
// Builds the zip in plain Node, so it needs no zip tool on Windows.
//
// Usage:
//   npm run package                     all skills
//   npm run package -- deck-review      specific skills

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { listSkillDirs, repoRoot } from './lib.mjs';

const SKIP = new Set(['.DS_Store', 'Thumbs.db', '__pycache__', 'node_modules']);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const requested = process.argv.slice(2);
const names = requested.length
  ? requested
  : listSkillDirs('skills').map((d) => d.split('/').pop());

const dist = join(repoRoot, 'dist');
mkdirSync(dist, { recursive: true });

if (names.length === 0) console.log('No skills to package yet.');

for (const name of names) {
  const skillDir = join(repoRoot, 'skills', name);
  if (!existsSync(join(skillDir, 'SKILL.md'))) {
    console.warn(`skip: skills/${name} has no SKILL.md`);
    continue;
  }
  const out = join(dist, `${name}.zip`);
  rmSync(out, { force: true });
  writeFileSync(out, buildZip(skillDir, join(repoRoot, 'skills')));
  console.log(`dist/${name}.zip`);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir).sort()) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

// Minimal zip writer: deflate each file, then a central directory.
function buildZip(dir, base) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const file of walk(dir)) {
    const name = Buffer.from(relative(base, file).split(sep).join('/'));
    const data = readFileSync(file);
    const packed = deflateRawSync(data);
    const crc = crc32(data);
    const { time, date } = dosTime(statSync(file).mtime);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);           // version needed
    header.writeUInt16LE(0x0800, 6);       // UTF-8 names
    header.writeUInt16LE(8, 8);            // deflate
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(packed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, name, packed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);            // version made by
    entry.writeUInt16LE(20, 6);            // version needed
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);       // local header offset
    central.push(entry, name);

    offset += header.length + name.length + packed.length;
  }

  const centralBuf = Buffer.concat(central);
  const count = central.length / 2;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...local, centralBuf, end]);
}

function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
