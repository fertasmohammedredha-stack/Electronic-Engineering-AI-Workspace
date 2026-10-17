# دارة (Dara) — Electronics AI Tutor

## Files (upload ALL of them together — they depend on each other)
```
index.html  auth.html  login.html  chat.html  settings.html
firestore.rules                      ← paste into Firebase Console → Firestore → Rules → Publish
api/chat.js                          ← Vercel serverless function (Groq + Gemini)
assets/  analytics.js  firebase-config.js  firebase.js  lang.js  styles.css
```
(`assets/updates.js` no longer exists — delete it from the repo if you still have it.)

## Vercel → Settings → Environment Variables
- `GROQ_API_KEY_1` … and `GEMINI_API_KEY_1` … (Gemini is REQUIRED for images and PDFs)
- optional: `FIREBASE_PROJECT_ID` (default `electronic-engineering-ai`), `RATE_USER_PER_MIN`, `RATE_GUEST_PER_MIN`, `RATE_GUEST_PER_DAY`, `SHOW_DEBUG_ERRORS=0` (hide technical error text)

## Firebase Console
- Authentication → Sign-in method: **Google** and **Email/Password** enabled
- Authentication → Settings → Authorized domains: your `*.vercel.app` domain
- Firestore rules: publish `firestore.rules`

## Check that the deployment is in sync (30 seconds)
1. Open `https://YOUR-SITE/api/chat` → must show JSON with `"version"` and `"providers"` (`groq`/`gemini` should be `true`).
2. Settings page, bottom line: `Web X · API X` — both must be the same. Red text = some files are old.

## Announce a new feature on the landing page
Edit the `UPDATES` list at the top of the script in `index.html` — add one object at the top of the released list.

## On every delivery
Bump `APP_VERSION` (assets/lang.js) and `API_VERSION` (api/chat.js) to the same value.
