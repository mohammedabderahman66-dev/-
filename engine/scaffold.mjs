// ينسخ templates/capacitor إلى مجلد خرج، ويستبدل appId/appName، ويضع واجهة المستخدم في www/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, '..', 'templates', 'capacitor');
const TEXT_EXT = new Set(['.java', '.xml', '.gradle', '.json', '.properties', '.yml', '.yaml', '.html', '.md', '.txt', '.pro']);

export function validateAppId(id) {
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(id)) throw new Error('appId غير صالح: ' + id);
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
export function scaffold({ outDir, appId, appName, wwwDir }) {
  validateAppId(appId);
  if (!appName || /["<>&\\]/.test(appName)) throw new Error('appName غير صالح');
  const meta = JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'template.json'), 'utf8'));
  const { appId: oldId, appName: oldName } = meta.sentinels;
  fs.cpSync(TEMPLATE, outDir, { recursive: true });
  fs.rmSync(path.join(outDir, 'template.json'));
  for (const f of walk(outDir)) {
    if (!TEXT_EXT.has(path.extname(f)) && path.basename(f) !== 'gradlew') continue;
    const s = fs.readFileSync(f, 'utf8');
    const n = s.split(oldId).join(appId).split(oldName).join(appName);
    if (n !== s) fs.writeFileSync(f, n);
  }
  const javaRoot = path.join(outDir, 'android/app/src/main/java');
  const from = path.join(javaRoot, ...oldId.split('.'));
  const to = path.join(javaRoot, ...appId.split('.'));
  if (from !== to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    let p = path.dirname(from);
    while (p !== javaRoot && fs.readdirSync(p).length === 0) { fs.rmdirSync(p); p = path.dirname(p); }
  }
  if (wwwDir) {
    fs.rmSync(path.join(outDir, 'www'), { recursive: true, force: true });
    fs.cpSync(wwwDir, path.join(outDir, 'www'), { recursive: true });
  }
  return outDir;
}
