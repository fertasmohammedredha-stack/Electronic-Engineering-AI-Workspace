import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, browserLocalPersistence, setPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, query,
  where, orderBy, onSnapshot, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

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
  return u;
}

export function signOutUser() {
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
  return ref.id;
}

export function watchUserChats(uid, callback) {
  const q = query(collection(db, "chats"), where("uid", "==", uid), orderBy("updatedAt", "desc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
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
