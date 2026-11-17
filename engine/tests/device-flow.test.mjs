import test from 'node:test';
import assert from 'node:assert/strict';
import { startDeviceFlow, pollForToken, refreshTokens, ensureToken, DeviceFlowError } from '../../www/auth/device-flow.mjs';

const dev = { deviceCode: 'd', userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device', interval: 5, expiresAt: 10_000_000 };
const seq = (...rs) => { const calls = []; const f = async (u, b) => { calls.push([u, b]); return rs.shift(); }; f.calls = calls; return f; };

test('رفض client_id الوهمي', async () => {
  await assert.rejects(startDeviceFlow({ clientId: 'REPLACE_WITH_GITHUB_APP_CLIENT_ID', http: seq() }), { code: 'not_configured' });
});
test('بدء التدفق يعيد الرمز ورابط التحقق', async () => {
  const http = seq({ device_code: 'd', user_code: 'ABCD-1234', verification_uri: 'https://github.com/login/device', interval: 5, expires_in: 900 });
  const d = await startDeviceFlow({ clientId: 'Iv1.x', http, now: () => 0 });
  assert.equal(d.userCode, 'ABCD-1234'); assert.equal(d.expiresAt, 900_000);
});
test('الانتظار ثم النجاح مع slow_down', async () => {
  const sleeps = [];
  const http = seq({ error: 'authorization_pending' }, { error: 'slow_down', interval: 10 }, { access_token: 'ghu_a', refresh_token: 'ghr_a', expires_in: 28800, refresh_token_expires_in: 15897600 });
  const t = await pollForToken({ clientId: 'c', device: dev, http, sleep: async (ms) => sleeps.push(ms), now: () => 0 });
  assert.deepEqual(sleeps, [5000, 5000, 10000]);
  assert.equal(t.accessToken, 'ghu_a'); assert.equal(t.expiresAt, 28_800_000);
});
test('رفض المستخدم وانتهاء المهلة', async () => {
  await assert.rejects(pollForToken({ clientId: 'c', device: dev, http: seq({ error: 'access_denied' }), sleep: async () => {}, now: () => 0 }), { code: 'access_denied' });
  await assert.rejects(pollForToken({ clientId: 'c', device: dev, http: seq(), sleep: async () => {}, now: () => 20_000_000 }), { code: 'expired_token' });
});
test('التجديد بلا client_secret', async () => {
  const http = seq({ access_token: 'ghu_b', refresh_token: 'ghr_b', expires_in: 28800 });
  await refreshTokens({ clientId: 'c', refreshToken: 'ghr_a', http, now: () => 0 });
  assert.equal('client_secret' in http.calls[0][1], false);
});
const mkStore = (t) => ({ t, async get() { return this.t; }, async set(x) { this.t = x; }, async clear() { this.t = null; } });
test('ensureToken: صالح، منتهٍ فيجدَّد، ورمز تجديد فاسد يعيد reauth', async () => {
  assert.deepEqual(await ensureToken({ clientId: 'c', store: mkStore(null), http: seq() }), { status: 'reauth_required' });
  assert.equal((await ensureToken({ clientId: 'c', store: mkStore({ accessToken: 'ok', expiresAt: 1e12 }), http: seq(), now: () => 0 })).accessToken, 'ok');
  const s = mkStore({ accessToken: 'old', refreshToken: 'ghr', expiresAt: 5, refreshExpiresAt: 1e12 });
  assert.equal((await ensureToken({ clientId: 'c', store: s, http: seq({ access_token: 'new', refresh_token: 'ghr2', expires_in: 100 }), now: () => 1_000_000 })).accessToken, 'new');
  const bad = mkStore({ accessToken: 'old', refreshToken: 'ghr', expiresAt: 5, refreshExpiresAt: 1e12 });
  assert.deepEqual(await ensureToken({ clientId: 'c', store: bad, http: seq({ error: 'bad_refresh_token' }), now: () => 1_000_000 }), { status: 'reauth_required' });
  assert.equal(bad.t, null);
});
