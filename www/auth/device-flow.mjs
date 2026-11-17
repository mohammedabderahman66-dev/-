// GitHub Device Flow لتطبيق GitHub App. لا PAT ولا client_secret.
// http(url, bodyObject) => Promise<object>  يجب أن يمر عبر طبقة native (CapacitorHttp)، فنقطتا GitHub لا تدعمان CORS.
export const DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GRANT_DEVICE = 'urn:ietf:params:oauth:grant-type:device_code';
const PLACEHOLDER = 'REPLACE_WITH_GITHUB_APP_CLIENT_ID';

export class DeviceFlowError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
// رسائل عربية واضحة للمستخدم لكل رمز خطأ
export const USER_MESSAGES = {
  access_denied: 'تم رفض الربط. اضغط "ربط GitHub" للمحاولة من جديد.',
  expired_token: 'انتهت مهلة الرمز. سنبدأ من جديد.',
  reauth_required: 'نحتاج موافقتك مرة أخرى لإكمال الربط.',
  not_configured: 'الربط غير مفعّل بعد في هذه النسخة.',
};

export async function startDeviceFlow({ clientId, http, now = Date.now }) {
  if (!clientId || clientId === PLACEHOLDER) throw new DeviceFlowError('not_configured');
  const r = await http(DEVICE_CODE_URL, { client_id: clientId });
  if (r.error || !r.device_code) throw new DeviceFlowError(r.error || 'bad_response', r.error_description);
  return {
    deviceCode: r.device_code, userCode: r.user_code, verificationUri: r.verification_uri,
    interval: r.interval || 5, expiresAt: now() + (r.expires_in || 900) * 1000,
  };
}

function toTokens(r, now) {
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token || null,
    expiresAt: r.expires_in ? now() + r.expires_in * 1000 : null,
    refreshExpiresAt: r.refresh_token_expires_in ? now() + r.refresh_token_expires_in * 1000 : null,
  };
}

export async function pollForToken({ clientId, device, http, sleep, now = Date.now, onTick }) {
  let interval = device.interval;
  for (;;) {
    if (now() >= device.expiresAt) throw new DeviceFlowError('expired_token');
    await sleep(interval * 1000);
    const r = await http(TOKEN_URL, { client_id: clientId, device_code: device.deviceCode, grant_type: GRANT_DEVICE });
    if (r.access_token) return toTokens(r, now);
    switch (r.error) {
      case 'authorization_pending': onTick && onTick(); break;
      case 'slow_down': interval = r.interval || interval + 5; break;
      case 'expired_token': case 'access_denied': throw new DeviceFlowError(r.error);
      default: throw new DeviceFlowError(r.error || 'bad_response', r.error_description);
    }
  }
}

// التجديد لا يحتاج client_secret لأن الرمز نُشئ عبر device flow (حسب توثيق GitHub).
export async function refreshTokens({ clientId, refreshToken, http, now = Date.now }) {
  const r = await http(TOKEN_URL, { client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken });
  if (!r.access_token) throw new DeviceFlowError('reauth_required', r.error);
  return toTokens(r, now);
}

// store: { get(), set(tokens), clear() } ينفَّذ لاحقاً فوق Android Keystore.
// يعيد {status:'ok', accessToken} أو {status:'reauth_required'} فيشغّل الواجهة Device Flow من جديد بصمت.
export async function ensureToken({ clientId, store, http, now = Date.now, skewMs = 60_000 }) {
  const t = await store.get();
  if (!t) return { status: 'reauth_required' };
  if (!t.expiresAt || t.expiresAt - skewMs > now()) return { status: 'ok', accessToken: t.accessToken };
  if (!t.refreshToken || (t.refreshExpiresAt && t.refreshExpiresAt <= now())) { await store.clear(); return { status: 'reauth_required' }; }
  try {
    const n = await refreshTokens({ clientId, refreshToken: t.refreshToken, http, now });
    await store.set(n);
    return { status: 'ok', accessToken: n.accessToken };
  } catch (e) {
    if (e instanceof DeviceFlowError) { await store.clear(); return { status: 'reauth_required' }; }
    throw e;
  }
}
