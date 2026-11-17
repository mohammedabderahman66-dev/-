// اختيار تقنية البناء: قدرات (JSON) ثم قواعد ثابتة. أول تطابق يفوز. انظر collab-notes/…proposal-03.
export const STACKS = ['capacitor', 'flutter', 'kotlin'];
// المفعَّل فعلياً: نبدأ بـ Capacitor فقط، ثم Flutter ثم Kotlin بعد اختبار كل قالب.
export const ENABLED = ['capacitor'];

export const CAPABILITY_KEYS = [
  'background_services', 'deep_hardware', 'realtime_camera_or_ar', 'heavy_graphics_or_game',
  'custom_animation_ui', 'needs_ios', 'offline_local_db', 'needs_widgets_or_system_ui',
  'mostly_forms_lists_content',
];

export function normalizeCapabilities(raw = {}) {
  const caps = {};
  for (const k of CAPABILITY_KEYS) caps[k] = raw[k] === true;
  return caps;
}

export function selectStack(rawCaps, { enabled = ENABLED } = {}) {
  const c = normalizeCapabilities(rawCaps);
  const nativeOnly = c.deep_hardware || c.background_services || c.needs_widgets_or_system_ui || c.realtime_camera_or_ar;
  const crossOrRich = c.needs_ios || c.heavy_graphics_or_game || c.custom_animation_ui;
  let wanted, reason;
  let ask = null;
  if (nativeOnly) {
    wanted = 'kotlin'; reason = 'native_capabilities';
    if (c.needs_ios) ask = 'الفكرة تحتاج وصولاً عميقاً للنظام وتحتاج iOS أيضاً. هل تفضّل أندرويد بأداء كامل أم نسخة مبسّطة لمنصتين؟';
  } else if (crossOrRich) {
    wanted = 'flutter'; reason = c.needs_ios ? 'cross_platform' : 'rich_ui_or_graphics';
  } else {
    wanted = 'capacitor'; reason = 'simple_web_ui';
  }
  const warnings = [];
  if (c.needs_ios) warnings.push('ios_deferred');
  // التفعيل التدريجي: ما لم يُفعَّل بعد يُبنى بـ Capacitor مع تسجيل السبب.
  const stack = enabled.includes(wanted) ? wanted : 'capacitor';
  if (stack !== wanted) warnings.push(`stack_not_enabled:${wanted}`);
  return { stack, wanted, reason, ask, warnings, fallback: 'capacitor' };
}

// حلقة الإصلاح: 3 محاولات للتقنية المختارة ثم تراجع تلقائي إلى Capacitor.
export const MAX_FIX_ATTEMPTS = 3;
export function nextStep({ stack, attempts }) {
  if (attempts < MAX_FIX_ATTEMPTS) return { action: 'retry', stack };
  if (stack !== 'capacitor') return { action: 'fallback', stack: 'capacitor' };
  return { action: 'fail', stack };
}
