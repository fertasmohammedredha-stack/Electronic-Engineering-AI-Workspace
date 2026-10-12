import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, browserLocalPersistence, setPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, sendPasswordResetEmail,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, query,
  where, orderBy, onSnapshot, serverTimestamp, updateDoc, getDocs, deleteDoc, writeBatch, deleteField
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const analytics = getAnalytics(app);
export function trackEvent(name, params = {}) {
  try { logEvent(analytics, name, params); } catch (e) { /* analytics should never break the app */ }
}
// Explicit page_view so every .html file (this is a multi-page, not single-page, app) is counted.
trackEvent('page_view', { page_title: document.title, page_path: location.pathname });

// Keeps the user signed in across visits/tabs — this is what makes login "stick"
// instead of asking again every time they open the site.
setPersistence(auth, browserLocalPersistence);

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);