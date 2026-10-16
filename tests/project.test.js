import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

test('package.json tersedia dan memiliki script start', async () => {
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, 'package.json'), 'utf8')
  );

  assert.ok(pkg.name, 'Nama proyek harus tersedia');
  assert.ok(pkg.scripts?.start, 'Script start harus tersedia');
});

test('server.js tersedia dan tidak kosong', async () => {
  const server = await fs.readFile(
    path.join(root, 'server.js'),
    'utf8'
  );

  assert.ok(server.trim().length > 0, 'server.js tidak boleh kosong');
});

test('halaman utama tersedia', async () => {
  const html = await fs.readFile(
    path.join(root, 'public', 'index.html'),
    'utf8'
  );

  assert.ok(html.includes('<'), 'Halaman utama harus berisi HTML');
});
