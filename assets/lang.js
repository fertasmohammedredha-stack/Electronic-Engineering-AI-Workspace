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
  },
  en: {
    brand: "Dara", dir: "ltr",
    nav1: "Features", nav2: "Assistant", nav3: "Pricing", navCta: "Start free",
    startChat: "New chat", search: "Search chats", projects: "Projects",
    recent: "Recent chats", settings: "Settings",
    welcomeTitle: "Hi, how can I help you today?",
    welcomeSub: "Ask about any electronics concept, problem, or project.",
    placeholder: "Type your message...",
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
function initTheme(){
  const saved = localStorage.getItem('theme'); // 'light' | 'dark' | null(=system)
  if(saved) document.documentElement.setAttribute('data-theme', saved);
}
document.addEventListener('DOMContentLoaded', ()=>{
  initTheme();
  applyLang();
  const toggle = document.getElementById('langToggle');
  if(toggle) toggle.addEventListener('click', ()=> setLang(getLang()==='ar' ? 'en' : 'ar'));
});
