# دارة (Dara) — Electronics AI Tutor

## Structure
```
index.html        Landing page
chat.html          Chat interface (UI shell, streams from /api/chat)
assets/styles.css  Shared design system (colors, type, layout)
assets/lang.js     Shared AR/EN dictionary + language/theme switching
api/chat.js        Vercel serverless function — AI provider + key rotation
```

## Deploy on Vercel
1. Push this folder to a GitHub repo (root must contain `index.html` — done).
2. Import the repo in Vercel → it auto-detects `api/*.js` as serverless functions.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `GROQ_API_KEY_1` … `GROQ_API_KEY_5`
   - `GEMINI_API_KEY_1` … `GEMINI_API_KEY_5`
   (add as many as you have; `api/chat.js` reads whichever exist)
4. Redeploy after adding env vars.

## Still to build (next phases)
- `settings.html` — account, language, theme, ToS/Privacy, delete chats, logout
- Firebase Auth (Google sign-in) + persistent session (currently a localStorage stub)
- Real chat history storage (Firestore) — sidebar currently reads a local stub
- Real streaming from Groq/Gemini in `api/chat.js` (currently a placeholder echo)
- File Detector: route uploads (PDF/DOCX/images/Proteus/MATLAB/etc.) to the right model
- In-chat interactive simulations (Ohm's law, RC circuits, SPICE)

## Design system
See CSS variables at the top of `assets/styles.css` — PCB-inspired palette
(soldermask green/ink, copper accent), swaps automatically for dark mode.
