// Shared bilingual dictionary — used by index.html and chat.html
const DICT = {
  ar: {
    brand: "دارة", dir: "rtl",
    nav1: "المميزات", nav2: "المساعد", nav3: "الأسعار", navCta: "ابدأ مجانًا",
    startChat: "محادثة جديدة", search: "بحث في المحادثات", projects: "المشاريع",
    recent: "المحادثات الأخيرة", settings: "الإعدادات",
    welcomeTitle: "أهلاً، كيف يمكنني مساعدتك اليوم؟",
    welcomeSub: "اسأل عن أي مفهوم، مسألة، أو مشروع في الإلكترونيك.",
    placeholder: "اكتب رسالتك...",
    disclaimer: "دارة قد يخطئ أحيانًا — تحقق من المعلومات المهمة.",
    signIn: "تسجيل الدخول بحساب Google",
    authTagline: "مساعدك الذكي في الإلكترونيك — خاص بطلبة وتقنيي الإلكترونيك",
    authFoot: "محادثاتك تُحفظ تلقائياً في حسابك",
    settingsTitle: "الإعدادات", prefs: "التفضيلات", language: "اللغة", theme: "المظهر",
    light: "فاتح", dark: "داكن", system: "تلقائي", about: "حول",
    tos: "شروط الاستخدام", privacy: "سياسة الخصوصية", aboutUs: "عن دارة", contact: "تواصل معنا",
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
  },
  en: {
    brand: "Dara", dir: "ltr",
    nav1: "Features", nav2: "Assistant", nav3: "Pricing", navCta: "Start free",
    startChat: "New chat", search: "Search chats", projects: "Projects",
    recent: "Recent chats", settings: "Settings",
    welcomeTitle: "Hi, how can I help you today?",
    welcomeSub: "Ask about any electronics concept, problem, or project.",
    placeholder: "Type your message...",
    disclaimer: "Dara can make mistakes — double-check important info.",
    signIn: "Sign in with Google",
    authTagline: "Your AI tutor for electronics — built for students & engineers",
    authFoot: "Your chats are saved automatically to your account",
    settingsTitle: "Settings", prefs: "Preferences", language: "Language", theme: "Theme",
    light: "Light", dark: "Dark", system: "System", about: "About",
    tos: "Terms of Service", privacy: "Privacy Policy", aboutUs: "About Dara", contact: "Contact us",
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
  }
};

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
