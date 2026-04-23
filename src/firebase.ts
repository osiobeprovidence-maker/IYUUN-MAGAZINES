import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, onIdTokenChanged, connectAuthEmulator, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer, collection, getDocs, setDoc, query, orderBy, deleteDoc, updateDoc, increment, addDoc, where, serverTimestamp, limit, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const requiredFirebaseEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
] as const;

const missingFirebaseEnv = requiredFirebaseEnv.filter((key) => !import.meta.env[key]);

if (missingFirebaseEnv.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingFirebaseEnv.join(', ')}. Add them in Vercel Project Settings -> Environment Variables.`
  );
}

const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (Browser-only)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

// Connect to emulators only when explicitly enabled.
if (useFirebaseEmulators) {
  // Use try-catch to avoid crashing if emulators aren't running
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
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
  onIdTokenChanged,
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
  limit
};
