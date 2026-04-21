import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, connectAuthEmulator, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer, collection, getDocs, setDoc, query, orderBy, deleteDoc, updateDoc, increment, addDoc, where, serverTimestamp, limit, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DB_ID?.trim();

// Initialize Services
export const auth = getAuth(app);
export const db =
  firestoreDatabaseId && firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firestoreDatabaseId)
    : getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (Browser-only)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

// Connect to Emulators if running locally
if (window.location.hostname === 'localhost') {
  // Use try-catch to avoid crashing if emulators aren't running
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase Emulators');
  } catch (e) {
    console.warn('Firebase Emulator connection failed:', e);
  }
}

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Types & Helpers
export type { User as FirebaseUser };
export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  getDocFromServer, 
  collection, 
  getDocs, 
  setDoc, 
  query, 
  orderBy, 
  deleteDoc, 
  updateDoc, 
  increment, 
  addDoc, 
  where, 
  serverTimestamp, 
  limit,
  ref, 
  uploadBytes, 
  getDownloadURL 
};
