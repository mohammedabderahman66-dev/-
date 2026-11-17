import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scaffold, validateAppId } from '../scaffold.mjs';

test('الاستبدال ونقل مجلد Java وعدم بقاء القيم القديمة', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wsh-'));
  const dst = path.join(out, 'app');
  scaffold({ outDir: dst, appId: 'dev.warsha.todo', appName: 'مهامي' });
  assert.ok(fs.existsSync(path.join(dst, 'android/app/src/main/java/dev/warsha/todo/MainActivity.java')));
  assert.ok(!fs.existsSync(path.join(dst, 'android/app/src/main/java/com/mohammed')));
  assert.match(fs.readFileSync(path.join(dst, 'android/app/src/main/java/dev/warsha/todo/MainActivity.java'), 'utf8'), /package dev\.warsha\.todo;/);
  assert.match(fs.readFileSync(path.join(dst, 'capacitor.config.json'), 'utf8'), /"appName": "مهامي"/);
  const all = []; (function w(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=path.join(d,e.name); e.isDirectory()?w(p):all.push(p);} })(dst);
  for (const f of all) if (/\.(java|xml|gradle|json|yml)$/.test(f)) { const s=fs.readFileSync(f,'utf8'); assert.ok(!s.includes('appforgetest') && !s.includes('AppForge Test'), f); }
  assert.ok(!fs.existsSync(path.join(dst, 'template.json')));
});
test('appId غير صالح يُرفض', () => {
  for (const bad of ['App', 'a', 'com.1x', 'com..x', '']) assert.throws(() => validateAppId(bad));
});
