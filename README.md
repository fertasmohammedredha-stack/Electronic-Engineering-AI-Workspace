# ElectroRed AI — Electronic Engineering AI Workspace

*Your Intelligent Partner in Electronics.* A bilingual (Arabic / English) AI study partner for electronics students.

## Files (upload ALL of them together — they depend on each other)
```
index.html  auth.html  login.html  chat.html  settings.html
favicon.ico  favicon.svg  favicon-active.svg  apple-touch-icon.png  site.webmanifest
firestore.rules                      ← paste into Firebase Console → Firestore → Rules → Publish
api/chat.js                          ← Vercel serverless function (Groq + Gemini)
assets/  analytics.js  brand.js  filegen.js  firebase-config.js  firebase.js  lang.js  styles.css
assets/brand/  logo-mark.svg  logo-mark-light.svg  logo-full.svg  og-image.png  icon-192.png  icon-512.png  icon-maskable-512.png  favicon-16/32/48.png
```
(`assets/updates.js` no longer exists — delete it from the repo if you still have it.)

## Brand
- `assets/brand.js` builds the H circuit logo (inline SVG), tracks whether the AI is generating (`ElectroRed.setActivity(true|false)`)
  and animates the browser-tab icon only while it is. `assets/styles.css` holds the colours (dark + light theme) and the logo animation.
- Colours: navy `#07111F` · electric blue `#168BFF` · cyan `#00D9FF` · neon red `#FF3158` (filled red buttons use the slightly deeper `#E01F3D` so white text stays readable).
- Logo variants: full lockup (`data-er-logo="full"`), mark only (`compact`), never-animated (`static`), wordmark only (`word`).
- Tab icon: static `favicon.ico` / `favicon.svg`; while the AI answers, a few pre-drawn frames cycle (one timer, removed the moment the answer ends).
  Safari and some mobile browsers ignore dynamically-changed tab icons; Google Search shows its own copy of the icon and updates it on its own schedule.

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

## File creation
`assets/filegen.js` builds Word / PowerPoint / Excel / CSV / code files in the browser (Word and PowerPoint libraries load from the CDN on first use). PDF uses the browser's print dialog ("Save as PDF") because that is the only route that handles Arabic and equations correctly.

## Announce a new feature on the landing page
Edit the `UPDATES` list at the top of the script in `index.html` — add one object at the top of the released list.

## On every delivery
Bump `APP_VERSION` (assets/lang.js) and `API_VERSION` (api/chat.js) to the same value.
