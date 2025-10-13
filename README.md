# Ta3s-GMC-2016-Ultra — صعود الطعس (NFS Cinematic Edition)

**AR | EN below**

إصدار “Ultra” هو إعادة بناء كاملة للعبة Canvas 2D بطابع Need for Speed: سماء نيون، كاميرا سينمائية، سبيدلاينز، محرك بجيرات، وتوهج نيترو. السيارة GMC Sierra 2016 الغمارة الواحدة تعانق كثبان الرمل مع الطقطقة المعروفة: شاليمار، اوووباا، مساج، هليكوبتر، وبوس Dumb & Dumber. النقاط لا تُمنح عند القفز فوق الكلاب؛ يجب دعسها بسرعة كافية مع نظام كومبو يصل حتى ×4.

## 🎮 التحكم

| الإدخال | الوظيفة |
|---------|---------|
| لوحة المفاتيح | ← → للحركة، ↑ للقفز، N للنيترو، W للونش، K/L للـQTE، 1/2/3 للاختيارات |
| لمس | أزرار أسفل الشاشة (◀ ▶ ⬆ ⚡ 🪝 1 2 3)، K/L تظهر أثناء التغريز |
| Gamepad | المحور الأيسر للحركة، زر A/B للقفز، X للنيترو، Y للونش |

## 🧠 القواعد والمرحلة

- مرحلة ~60–75 ثانية: إحماء → كرسي → رمل/QTE → منطقة الكلاب → شاليمار → هليكوبتر → Boss → القمة.
- دعس كلب بسرعة ≥ 6.5 يعطي +100 أساس وكومبو (×1.5 لكل ضربة حتى 4×). القفز لا يعطي نقاط.
- كرسي العناد: تجنّب +100، الاصطدام −50 + زيادة الوقت 5s.
- شاليمار: كبسة +300 + Boost 2.5s، برياني تبطئة 10%، مفاجأة = نيترو إضافي أو غبرة.
- Boss Dumb & Dumber: invertSec=2s، quickSequence(↑ ← ↑). نجاح +500 واسترجاع nitro/winch، فشل −200.
- الهليكوبتر (30–45s): سحب للأمام أو غبرة عكسية.
- النهاية الساخرة: Toast + EndCard “😂 طبخنا… بس نسينا الملح 🧂”.

## 🎨 الجماليات السينمائية

- كاميرا سينمائية مع look-ahead، ارتفاع ديناميكي، roll خفيف، اهتزاز متعدد الطبقات.
- بارالاكس طبقتين + نجوم متوهجة؛ Bloom اختياري عند النيترو أو السرعات العالية.
- سبيدلاينز عند >120 km/h، HUD دائري للسرعة، تأثيرات لون مع النيترو والبوس.
- Sprites محسّنة (Canvas) للسيارة والكلاب والمتفرجين، دم كرتوني قابل للإطفاء.

## 🔊 الصوت

- محرك متعدد الطبقات (Saw + Sub + Exhaust noise) مع جيربوكس تلقائي ونبضة تبديل.
- مؤثرات: jump/hit/miss/boost/winch/qteStart/qteSuccess/qteFail/boss/ooobaaa/wind/skid.
- Mixer مع متحكمات للـMaster/Engine/SFX، وواجهة Settings لتعديلها.

## ⚙️ الإعدادات (محفوظة)

- الصوت: Master / Engine / FX / كتم.
- الكاميرا: look-ahead، shake، roll.
- التأثيرات: الدم، سبيدلاينز، Bloom، High-contrast.
- الوصول: عكس الاتجاه، الاهتزاز، حجم الأزرار، اللغة (العربية/الإنجليزية).
- HUD Toggle (زر 🖥️) لإخفاء/إظهار المعلومات.

## 📊 النقاط والكومبو

- دعس كلب عند السرعة المطلوبة: +100 × الكومبو (حتى ×4).
- نجاح QTE: +50.
- شاليمار: كبسة +300، برياني تبطئة، مفاجأة (نيترو/غبرة).
- Boss: نجاح +500 واسترجاع النيترو/الونش، فشل −200.
- Achievements: أول دعسة، كومبو ≥3×، تجنب الكرسي، هزيمة البوس.

## 🔧 التشغيل محليًا

```bash
# افتح مباشرة (متصفح حديث)
open index.html

# أو لتفعيل SW/ESM عبر خادم بسيط
npx http-server .
```

الصوت يتطلب أول تفاعل (لمس/نقرة) بسبب سياسات WebAudio، خاصة على iOS.

## 🚀 GitHub Pages & PWA

1. GitHub Settings → Pages → Build & deployment → GitHub Actions.
2. ادفع (push) إلى الفرع `main`.
3. Workflow `.github/workflows/pages.yml` يبني وينشر تلقائيًا.
4. التطبيق يدعم التثبيت (manifest + service worker cache-first).

## 🧪 Troubleshooting

| المشكلة | الحل |
|---------|------|
| الشاشة فارغة | selfTest يعيد fallback للأرض؛ تحقق من Console لرسالة الخطأ |
| الصوت لا يعمل | المس الشاشة مرة لتفعيل WebAudio |
| الأداء منخفض | أطفئ Bloom/Speedlines من الإعدادات |
| HUD غير ظاهر | زر 🖥️ يعيد إظهاره |

## 🗺️ خارطة الطريق

- المرحلة 2: تجميع الحطب (mini-game) وإضافة Drifts/Dust Trails.
- المرحلة 3: طبخ النسخة الكاملة مع تحديات “نسينا الملح” الخاصة.
- تحسين أصوات env (رياح/جمهور) ودعم سجل سباقات (Leaderboards).

## 🙏 شكر

- مستوحى من ألعاب السباق الليلية وروح “نسينا الملح”.
- يرجى استخدام قوالب Issues للإبلاغ عن الأعطال أو اقتراح الميزات.

---

## Ta3s-GMC-2016-Ultra (English Summary)

Need-for-Speed-inspired desert climb: neon skies, cinematic camera, layered engine audio, and comedic events (Shalimar, Ooobaaa, Massage, Helicopter, Dumb & Dumber boss). Dogs only count when you *slam* them at speed; combos ramp up to ×4. Fully modular ES Modules + PWA + GitHub Pages CI.

- Controls, scoring, events, and settings mirror the Arabic description.
- Adjustable camera/audio/effects and accessible HUD toggle for streamers.

Enjoy the ride — **and don’t forget the salt!**
