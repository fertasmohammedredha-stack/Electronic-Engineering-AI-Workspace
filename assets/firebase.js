import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, browserLocalPersistence, setPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, query,
  where, orderBy, onSnapshot, serverTimestamp, updateDoc, getDocs, deleteDoc, writeBatch
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
  const u = result.user;
  // Create/refresh the user's profile doc on every sign-in.
  await setDoc(doc(db, "users", u.uid), {
    name: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
    lastLogin: serverTimestamp()
  }, { merge: true });
  trackEvent('login_success', { method: 'google' });
  return u;
}

export async function signUpWithEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name, email, createdAt: serverTimestamp()
  }, { merge: true });
  trackEvent('login_success', { method: 'email_signup' });
  return cred.user;
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  trackEvent('login_success', { method: 'email' });
  return cred.user;
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function signOutUser() {
  trackEvent('logout');
  return signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ---- Chats ----
export async function createChat(uid, firstMessage) {
  const ref = await addDoc(collection(db, "chats"), {
    uid,
    title: firstMessage.slice(0, 40) || "محادثة جديدة",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  trackEvent('chat_created');
  return ref.id;
}

export function watchUserChats(uid, callback) {
  // NOTE: filtering by uid only (no orderBy) avoids needing a Firestore
  // composite index — we sort by updatedAt on the client instead.
  const q = query(collection(db, "chats"), where("uid", "==", uid));
  return onSnapshot(q, snap => {
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    chats.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    callback(chats);
  }, err => console.error("watchUserChats error:", err));
}

export function watchMessages(chatId, callback) {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addMessage(chatId, role, text) {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    role, text, createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "chats", chatId), { updatedAt: serverTimestamp() });
}

export async function deleteAllChats(uid) {
  const snap = await getDocs(query(collection(db, "chats"), where("uid", "==", uid)));
  for (const chatDoc of snap.docs) {
    const msgsSnap = await getDocs(collection(db, "chats", chatDoc.id, "messages"));
    const batch = writeBatch(db);
    msgsSnap.forEach(m => batch.delete(m.ref));
    if (!msgsSnap.empty) await batch.commit();
    await deleteDoc(chatDoc.ref);
  }
}
