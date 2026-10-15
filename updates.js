// What's-new data for the landing page (index.html renders it in both languages).
//
// TO ANNOUNCE A NEW FEATURE: add ONE object at the TOP of the list (newest first) — nothing else to edit.
//   date : "YYYY-MM"          (entries with the same month are grouped together)
//   tag  : "new" | "improved" | "soon"    ("soon" entries appear in the "Coming next" box instead of the timeline;
//                                          when a "soon" feature ships, change its tag to "new" and give it a date)
//   title / text : { ar, en }
const UPDATES = [
  // ----- Coming next (remove or edit freely — these are plans, not promises) -----
  { tag: "soon",
    title: { ar: "محاكاة تفاعلية داخل المحادثة", en: "Interactive simulations in the chat" },
    text:  { ar: "قانون أوم، مقسّم الجهد ودارات RC بمنزلقات تتحكم بها وتشاهد النتيجة مباشرة.",
             en: "Ohm's law, voltage dividers and RC circuits with sliders you control and results you see instantly." } },
  { tag: "soon",
    title: { ar: "إنشاء الملفات", en: "Create files" },
    text:  { ar: "احصل على ملخصاتك وجداولك كملفات PDF وWord وExcel جاهزة للتحميل.",
             en: "Get your summaries and tables as ready-to-download PDF, Word and Excel files." } },

  // ----- Released (newest first) -----
  { date: "2026-10", tag: "new",
    title: { ar: "إعدادات الحساب", en: "Account settings" },
    text:  { ar: "غيّر اسمك وكلمة سرك من صفحة الإعدادات.",
             en: "Change your name and password from the settings page." } },
  { date: "2026-10", tag: "new",
    title: { ar: "إعادة التوليد وتعديل رسائلك", en: "Regenerate replies and edit your messages" },
    text:  { ar: "اطلب ردًّا جديدًا بضغطة، أو عدّل سؤالك وأعد الحصول على الجواب. وقيّم الردود بـ 👍 و👎.",
             en: "Get a fresh answer in one tap, or edit your question and ask again. Rate replies with 👍 and 👎." } },
  { date: "2026-10", tag: "improved",
    title: { ar: "مساعد أذكى وذاكرة أطول", en: "A smarter assistant with a longer memory" },
    text:  { ar: "يتذكر محادثتك لمسافة أبعد، يعرف قدراته وحدوده، ويكيّف أسلوب الشرح مع سؤالك.",
             en: "It remembers your conversation much further back, knows its own abilities and limits, and adapts its explanations to your question." } },
  { date: "2026-10", tag: "new",
    title: { ar: "ارفع ملفاتك", en: "Attach your files" },
    text:  { ar: "صور، PDF، TXT وCSV، وملفات Word وPowerPoint وExcel (مع الصور المضمّنة في Word وPowerPoint).",
             en: "Images, PDF, TXT and CSV, plus Word, PowerPoint and Excel files (including pictures embedded in Word and PowerPoint)." } },
  { date: "2026-10", tag: "new",
    title: { ar: "إدخال صوتي وتنظيم المحادثات", en: "Voice input and chat organising" },
    text:  { ar: "اسأل بصوتك، وثبّت محادثاتك أو أعد تسميتها أو احذفها.",
             en: "Ask with your voice, and pin, rename or delete your chats." } },

  { date: "2026-09", tag: "new",
    title: { ar: "جرّب كضيف وسجّل بالبريد", en: "Try it as a guest, sign in with email" },
    text:  { ar: "15 سؤالًا مجانيًا بدون حساب، وتنتقل محادثتك إلى حسابك عند التسجيل. الدخول بحساب Google أو بالبريد الإلكتروني.",
             en: "15 free questions without an account — your conversation moves to your account when you sign up. Sign in with Google or email." } },
  { date: "2026-09", tag: "new",
    title: { ar: "الإطلاق الأول", en: "First release" },
    text:  { ar: "مدرّس إلكترونيات بالعربية والإنجليزية: معادلات رياضية، ردود فورية، محادثات محفوظة، ووضع فاتح وداكن.",
             en: "An electronics tutor in Arabic and English: rendered equations, streaming answers, saved chats, and light and dark themes." } },
];
