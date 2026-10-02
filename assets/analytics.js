// Lightweight Analytics-only init for pages that don't need auth/Firestore
// (index.html, auth.html). Pages that already import firebase.js get
// analytics bundled in there instead — don't add this script to those.
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
logEvent(analytics, 'page_view', { page_title: document.title, page_path: location.pathname });
