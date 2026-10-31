// Shared bilingual dictionary — used by index.html and chat.html
// Build stamp. Bump it (together with API_VERSION in api/chat.js) on every delivery: the settings page shows both,
// so a half-uploaded deployment is obvious at a glance.
const APP_VERSION = "2026.10.18";

const DICT = {
  ar: {
    brand: "ElectroRed AI", dir: "rtl",
    nav1: "المميزات", nav2: "المساعد", nav3: "الأسعار", navCta: "ابدأ مجانًا",
    startChat: "محادثة جديدة", search: "بحث في المحادثات", projects: "المشاريع",
    recent: "المحادثات الأخيرة", settings: "الإعدادات",
    welcomeTitle: "أهلاً، على ماذا نعمل اليوم؟",
    welcomeSub: "اسأل عن أي مفهوم أو مسألة أو مشروع في الإلكترونيك، أو أرفق صورة أو ملفاً.",
    placeholder: "اكتب رسالتك...",
    disclaimer: "قد يخطئ ElectroRed AI أحيانًا — تحقق من المعلومات المهمة.",
    signIn: "تسجيل الدخول بحساب Google",
    authTagline: "شريكك الذكي في الإلكترونيك.",
    authFoot: "محادثاتك تُحفظ تلقائياً في حسابك",
    settingsTitle: "الإعدادات", prefs: "التفضيلات", language: "اللغة", theme: "المظهر",
    light: "فاتح", dark: "داكن", system: "تلقائي", about: "حول",
    tos: "شروط الاستخدام", privacy: "سياسة الخصوصية", aboutUs: "عن ElectroRed AI", contact: "تواصل معنا",
    account: "الحساب", deleteChats: "حذف كل المحادثات", logout: "تسجيل الخروج",
    guestSaveHint: "سجل دخول لحفظ محادثاتك", guestLimitMsg: "وصلت للحد الأقصى كزائر (15 سؤال) — سجل دخول للمتابعة من نفس المحادثة.",
    goLogin: "تسجيل الدخول / إنشاء حساب", goGuest: "المتابعة كضيف", backHome: "← رجوع للصفحة الرئيسية",
    loginTab: "تسجيل الدخول", signupTab: "إنشاء حساب", orEmail: "أو عبر البريد الإلكتروني",
    fullName: "الاسم الكامل", email: "البريد الإلكتروني", password: "كلمة السر",
    loginBtn: "تسجيل الدخول", signupBtn: "إنشاء حساب", forgotPass: "نسيت كلمة السر؟",
    noAccount: "ليس لديك حساب؟", haveAccount: "لديك حساب بالفعل؟", resetSent: "تم إرسال رابط إعادة التعيين لبريدك.",
    guestBack: "الصفحة الرئيسية",
    statBilingual: "بلغتين", statFree: "مجاني", statYears: "سنوات دراسية مدعومة",
    showPassword: "إظهار كلمة السر",
    accountInfo: "معلومات الحساب", username: "اسم المستخدم", signInMethod: "طريقة الدخول",
    viaGoogle: "Google", viaEmail: "البريد وكلمة السر", viaBoth: "Google + البريد وكلمة السر",
    change: "تغيير", edit: "تعديل", save: "حفظ", cancel: "إلغاء", managedByGoogle: "تُدار من Google",
    currentPassword: "كلمة السر الحالية", newPassword: "كلمة السر الجديدة", confirmNewPassword: "أعد كتابة كلمة السر الجديدة",
    nameSaved: "تم حفظ الاسم.", passwordChanged: "تم تغيير كلمة السر.",
    errName: "الاسم يجب أن يكون بين 2 و40 حرفًا.", errPwWrong: "كلمة السر الحالية غير صحيحة.",
    errPwWeak: "كلمة السر الجديدة قصيرة (6 أحرف على الأقل).", errPwMismatch: "كلمتا السر الجديدتان غير متطابقتين.",
    errPwSame: "كلمة السر الجديدة مطابقة للحالية.", errTooMany: "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.",
    errGeneric: "تعذّر الحفظ. حاول مرة ثانية.",
    descriptor: "مساحة عمل ذكاء اصطناعي لهندسة الإلكترونيك", tagline: "شريكك الذكي في الإلكترونيك.", tryAsking: "جرّب أن تسأل",
    exCircuit: "تحليل الدارات", exCircuitQ: "حلّل مقسّم جهد: R1 = 1kΩ و R2 = 2kΩ و Vin = 12V، واحسب Vout والتيار.",
    exLogic: "المنطق الرقمي", exLogicQ: "بسّط الدالة F = A'B + AB' + AB بجبر بول، ثم أعطني جدول الحقيقة.",
    exMatlab: "مساعدة MATLAB", exMatlabQ: "اكتب كود MATLAB يرسم استجابة مرشح RC تمرير منخفض بتردد قطع 1 kHz.",
    exProteus: "أخطاء Proteus", exProteusQ: "دارتي في Proteus لا تعطي النتيجة المتوقعة. سأرفق لقطة شاشة، ساعدني أجد الخطأ.",
    exDiagram: "فهم المخططات", exDiagramQ: "اشرح لي كيف تعمل هذه الدارة خطوة بخطوة (سأرفق صورة المخطط).",
    exReport: "تقارير المخبر", exReportQ: "ساعدني في كتابة تقرير مخبري عن تجربة قانون أوم، ثم جهّزه كملف Word.",
    stopGen: "إيقاف التوليد", sendMsg: "إرسال", attachFile: "إرفاق ملف", voiceInput: "إدخال صوتي", toggleSidebar: "القائمة الجانبية", genStopped: "تم إيقاف التوليد.",
    versionMismatch: "النسختان مختلفتان: ارفع كل الملفات", versionUnknown: "غير معروفة (ملف api/chat.js قديم أو غير مرفوع)",
  },
  en: {
    brand: "ElectroRed AI", dir: "ltr",
    nav1: "Features", nav2: "Assistant", nav3: "Pricing", navCta: "Start free",
    startChat: "New chat", search: "Search chats", projects: "Projects",
    recent: "Recent chats", settings: "Settings",
    welcomeTitle: "Hi, what are we working on today?",
    welcomeSub: "Ask about any electronics concept, problem or project — or attach an image or a file.",
    placeholder: "Type your message...",
    disclaimer: "ElectroRed AI can make mistakes — double-check important info.",
    signIn: "Sign in with Google",
    authTagline: "Your Intelligent Partner in Electronics.",
    authFoot: "Your chats are saved automatically to your account",
    settingsTitle: "Settings", prefs: "Preferences", language: "Language", theme: "Theme",
    light: "Light", dark: "Dark", system: "System", about: "About",
    tos: "Terms of Service", privacy: "Privacy Policy", aboutUs: "About ElectroRed AI", contact: "Contact us",
    account: "Account", deleteChats: "Delete all chats", logout: "Log out",
    guestSaveHint: "Sign in to save your chats", guestLimitMsg: "You've reached the guest limit (15 questions) — sign in to continue this same conversation.",
    goLogin: "Sign in / Create account", goGuest: "Continue as guest", backHome: "← Back to home",
    loginTab: "Sign In", signupTab: "Sign Up", orEmail: "or continue with email",
    fullName: "Full name", email: "Email address", password: "Password",
    loginBtn: "Sign in", signupBtn: "Create account", forgotPass: "Forgot password?",
    noAccount: "Don't have an account?", haveAccount: "Already have an account?", resetSent: "Password reset link sent to your email.",
    guestBack: "Home",
    statBilingual: "bilingual", statFree: "free", statYears: "years of study covered",
    showPassword: "Show password",
    accountInfo: "Account details", username: "Username", signInMethod: "Sign-in method",
    viaGoogle: "Google", viaEmail: "Email & password", viaBoth: "Google + Email & password",
    change: "Change", edit: "Edit", save: "Save", cancel: "Cancel", managedByGoogle: "Managed by Google",
    currentPassword: "Current password", newPassword: "New password", confirmNewPassword: "Repeat the new password",
    nameSaved: "Name saved.", passwordChanged: "Password changed.",
    errName: "The name must be 2 to 40 characters.", errPwWrong: "The current password is incorrect.",
    errPwWeak: "The new password is too short (at least 6 characters).", errPwMismatch: "The new passwords don't match.",
    errPwSame: "The new password is the same as the current one.", errTooMany: "Too many attempts. Wait a moment and try again.",
    errGeneric: "Couldn't save. Please try again.",
    descriptor: "Electronic Engineering AI Workspace", tagline: "Your Intelligent Partner in Electronics.", tryAsking: "Try asking",
    exCircuit: "Circuit analysis", exCircuitQ: "Analyze a voltage divider: R1 = 1kΩ, R2 = 2kΩ, Vin = 12V. Find Vout and the current.",
    exLogic: "Digital logic", exLogicQ: "Simplify F = A'B + AB' + AB with Boolean algebra, then give me the truth table.",
    exMatlab: "MATLAB help", exMatlabQ: "Write MATLAB code that plots the response of an RC low-pass filter with a 1 kHz cutoff.",
    exProteus: "Proteus troubleshooting", exProteusQ: "My Proteus circuit doesn't give the expected output. I'll attach a screenshot — help me find the mistake.",
    exDiagram: "Reading diagrams", exDiagramQ: "Explain how this circuit works step by step (I'll attach the diagram image).",
    exReport: "Lab reports", exReportQ: "Help me write a lab report on an Ohm's law experiment, then prepare it as a Word file.",
    stopGen: "Stop generating", sendMsg: "Send", attachFile: "Attach a file", voiceInput: "Voice input", toggleSidebar: "Sidebar", genStopped: "Generation stopped.",
    versionMismatch: "versions differ: upload all the files", versionUnknown: "unknown (api/chat.js is old or missing)",
  }
};

// Looks a string up in the current language (for messages built in JS, not in the HTML).
function tr(key){ const d = DICT[getLang()] || DICT.ar; return d[key] !== undefined ? d[key] : key; }
function getLang(){ return localStorage.getItem('lang') || 'ar'; }
function setLang(l){ localStorage.setItem('lang', l); applyLang(); }
function applyLang(){
  const l = getLang();
  const t = DICT[l];
  document.documentElement.lang = l;
  document.documentElement.dir = t.dir;
  document.querySelectorAll('[data-i]').forEach(el=>{
    const k = el.getAttribute('data-i');
    if(t[k] !== undefined) el.textContent = t[k];
  });
  document.querySelectorAll('[data-i-aria]').forEach(el=>{
    const k = el.getAttribute('data-i-aria');
    if(t[k] !== undefined) el.setAttribute('aria-label', t[k]);
  });
  document.querySelectorAll('[data-i-title]').forEach(el=>{
    const k = el.getAttribute('data-i-title');
    if(t[k] !== undefined) el.setAttribute('title', t[k]);
  });
  document.querySelectorAll('[data-i-ph]').forEach(el=>{
    const k = el.getAttribute('data-i-ph');
    if(t[k] !== undefined) el.placeholder = t[k];
  });
  const toggle = document.getElementById('langToggle');
  if(toggle) toggle.textContent = l === 'ar' ? 'EN' : 'AR';
}
function systemPrefersLight(){ return window.matchMedia('(prefers-color-scheme: light)').matches; }
// Returns the ACTIVE visual theme ('light'/'dark') — a saved choice, or the system value if 'system'.
function getTheme(){
  const saved = localStorage.getItem('theme');
  if(saved === 'light' || saved === 'dark') return saved;
  return systemPrefersLight() ? 'light' : 'dark';
}
// t: 'light' | 'dark' | 'system'. 'system' clears the saved choice so it keeps following the OS.
function setTheme(t){
  if(t === 'system') localStorage.removeItem('theme');
  else localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', getTheme());
  const btn = document.getElementById('themeToggle');
  if(btn) btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.documentElement.setAttribute('data-theme', getTheme());
  applyLang();
  const toggle = document.getElementById('langToggle');
  if(toggle) toggle.addEventListener('click', ()=> setLang(getLang()==='ar' ? 'en' : 'ar'));
  const themeBtn = document.getElementById('themeToggle');
  if(themeBtn) themeBtn.addEventListener('click', ()=> setTheme(getTheme()==='dark' ? 'light' : 'dark'));
  // Follow OS changes live when the user hasn't pinned a manual choice.
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', ()=>{
    if(!localStorage.getItem('theme')) document.documentElement.setAttribute('data-theme', getTheme());
  });
});
