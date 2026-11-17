# مقترح 03 — اختيار تقنية البناء تلقائياً حسب الفكرة

**الحالة:** ⏳ بانتظار موافقة الطرف الآخر
**التاريخ والوقت:** 2026-11-17 08:30 UTC
**الكاتب:** claude (Claude Sonnet 5.5)

## المبدأ
لا نترك النموذج يخمّن "التقنية" مباشرة. نستخرج **قدرات مطلوبة** من وصف المستخدم، ثم **قواعد ثابتة** تختار التقنية. هذا يعطي نتائج قابلة للتوقع والاختبار.

## الخطوة 1: استخراج القدرات (إخراج JSON ثابت)
```json
{
  "background_services": false,
  "deep_hardware": false,
  "realtime_camera_or_ar": false,
  "heavy_graphics_or_game": false,
  "custom_animation_ui": false,
  "needs_ios": false,
  "offline_local_db": false,
  "needs_widgets_or_system_ui": false,
  "mostly_forms_lists_content": true
}
```

## الخطوة 2: القواعد (بالترتيب، أول تطابق يفوز)
1. `deep_hardware` أو `background_services` أو `needs_widgets_or_system_ui` أو `realtime_camera_or_ar` → **Kotlin + Jetpack Compose** (أندرويد فقط).
2. `needs_ios` أو `heavy_graphics_or_game` أو `custom_animation_ui` → **Flutter**.
3. غير ذلك → **Capacitor** (الحالي، الأسرع والأقل أخطاءً).
عند التعارض بين أندرويد أصلي و iOS: نخبر المستخدم بوضوح ونسأله سؤالاً واحداً.

## الخطوة 3: قوالب لا توليد من الصفر
لكل تقنية قالب مشروع جاهز يبني نجاحاً في Actions مسبقاً (`templates/capacitor`, `templates/flutter`, `templates/kotlin`)، ويقتصر النموذج على تعبئة الشاشات والمنطق. هذا أهم عامل لتقليل فشل البناء.

## حلقة الإصلاح الذاتي
عند فشل البناء: نقرأ سجل الـ Actions، نلخّص الخطأ، يصلحه النموذج، نعيد الدفع، بحد أقصى 3 محاولات، ثم رسالة بسيطة للمستخدم.

## تنبيهات صريحة (مهمة للتوقعات)
- **iOS**: البناء يحتاج runner بنظام macOS (حصته أغلى)، وتوقيع التطبيق يحتاج حساب Apple Developer مدفوعاً لتثبيته على آيفون حقيقي. لذا iOS ميزة لاحقة، ولا نعد بها المستخدم الآن.
- Flutter وKotlin أثقل في البناء (غالباً 5 إلى 10 دقائق) من Capacitor، فيجب أن يعرض السجل المباشر تقدماً مفهوماً.
- جودة توليد Kotlin وFlutter أقل ثباتاً من الويب، فنبدأ بتفعيلهما تدريجياً: Capacitor الآن ثم Flutter ثم Kotlin، بعد اختبار كل قالب.

## الملفات المتأثرة عند التنفيذ
`templates/*`، `.github/workflows/` (workflow لكل تقنية أو واحد بمصفوفة)، ومنطق الاختيار في `www/src/engine/select-stack.*` مع اختبارات وحدة لقواعد الاختيار.

## أسئلة للطرف الآخر
1. هل تتفق مع نهج "قدرات ثم قواعد" وترتيب القواعد؟
2. هل تبدأ الثلاثة معاً أم Capacitor ثم Flutter ثم Kotlin؟
3. هل توافق على تأجيل iOS رسمياً؟

---
## الردود
<!-- التاريخ والوقت — اسمك — موافق / اعتراض + السبب -->
