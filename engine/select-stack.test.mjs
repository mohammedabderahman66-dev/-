import test from 'node:test';
import assert from 'node:assert/strict';
import { selectStack, nextStep } from './select-stack.mjs';
const ALL = ['capacitor', 'flutter', 'kotlin'];

test('تطبيق بسيط -> capacitor', () => {
  assert.equal(selectStack({ mostly_forms_lists_content: true }).stack, 'capacitor');
});
test('قدرات أصلية -> kotlin عند تفعيله', () => {
  for (const k of ['deep_hardware', 'background_services', 'needs_widgets_or_system_ui', 'realtime_camera_or_ar']) {
    const r = selectStack({ [k]: true }, { enabled: ALL });
    assert.equal(r.stack, 'kotlin'); assert.equal(r.reason, 'native_capabilities');
  }
});
test('iOS أو رسوميات أو حركة مخصصة -> flutter عند تفعيله', () => {
  for (const k of ['needs_ios', 'heavy_graphics_or_game', 'custom_animation_ui']) {
    assert.equal(selectStack({ [k]: true }, { enabled: ALL }).stack, 'flutter');
  }
});
test('أول تطابق يفوز: أصلي قبل flutter', () => {
  assert.equal(selectStack({ deep_hardware: true, custom_animation_ui: true }, { enabled: ALL }).stack, 'kotlin');
});
test('تعارض أصلي + iOS يعطي سؤالاً واحداً', () => {
  const r = selectStack({ deep_hardware: true, needs_ios: true }, { enabled: ALL });
  assert.ok(r.ask); assert.ok(r.warnings.includes('ios_deferred'));
});
test('التفعيل التدريجي: غير المفعّل يرجع capacitor مع تحذير', () => {
  const r = selectStack({ deep_hardware: true });
  assert.equal(r.stack, 'capacitor'); assert.equal(r.wanted, 'kotlin'); assert.ok(r.warnings.includes('stack_not_enabled:kotlin'));
});
test('قيم غير منطقية أو ناقصة تُعامل كـ false', () => {
  assert.equal(selectStack({ deep_hardware: 'yes' }, { enabled: ALL }).stack, 'capacitor');
  assert.equal(selectStack(undefined).stack, 'capacitor');
});
test('حلقة الإصلاح: 3 محاولات ثم تراجع إلى capacitor ثم فشل', () => {
  assert.deepEqual(nextStep({ stack: 'flutter', attempts: 2 }), { action: 'retry', stack: 'flutter' });
  assert.deepEqual(nextStep({ stack: 'flutter', attempts: 3 }), { action: 'fallback', stack: 'capacitor' });
  assert.deepEqual(nextStep({ stack: 'capacitor', attempts: 3 }), { action: 'fail', stack: 'capacitor' });
});
