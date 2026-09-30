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
function getTheme(){
  return localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}
function setTheme(t){
  localStorage.setItem('theme', t);
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeToggle');
  if(btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
document.addEventListener('DOMContentLoaded', ()=>{
  setTheme(getTheme());
  applyLang();
  const toggle = document.getElementById('langToggle');
  if(toggle) toggle.addEventListener('click', ()=> setLang(getLang()==='ar' ? 'en' : 'ar'));
  const themeBtn = document.getElementById('themeToggle');
  if(themeBtn) themeBtn.addEventListener('click', ()=> setTheme(getTheme()==='dark' ? 'light' : 'dark'));
});
