import { initializeApp } from 'firebase/app';
import {
  type Auth,
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signInWithPopup as firebaseSignInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  onIdTokenChanged as firebaseOnIdTokenChanged,
  updateProfile as firebaseUpdateProfile,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
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
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const requiredFirebaseEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missingFirebaseEnv = requiredFirebaseEnv.filter((key) => !import.meta.env[key]);

export const firebaseConfigError =
  missingFirebaseEnv.length > 0
    ? `Missing Firebase environment variables: ${missingFirebaseEnv.join(', ')}. Add them in your deployment environment variables.`
    : null;

export const isFirebaseConfigured = firebaseConfigError === null;

const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Initialize Services only when config is present.
// The casts preserve the existing import signatures across the app.
// Runtime use is guarded by the startup gate in main.tsx.
export const auth = (app ? getAuth(app) : null) as Auth;
export const db = (app ? getFirestore(app) : null) as Firestore;

export const analytics = app
  ? isSupported().then((yes) => (yes ? getAnalytics(app) : null))
  : Promise.resolve(null);

// Connect to emulators only when explicitly enabled and Firebase is configured.
if (useFirebaseEmulators && app) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firebase Emulators');
  } catch (e) {
    console.warn('Firebase Emulator connection failed:', e);
  }
}

// Auth Providers
export const googleProvider = (app ? new GoogleAuthProvider() : null) as GoogleAuthProvider;

if (app) {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
}

const notConfiguredError = () =>
  new Error(firebaseConfigError || 'Firebase is not configured for this deployment.');

export const signInWithPopup = (authInstance: Auth | null | undefined, provider: GoogleAuthProvider | null | undefined) => {
  if (!authInstance || !provider) {
    return Promise.reject(notConfiguredError());
  }

  return firebaseSignInWithPopup(authInstance, provider);
};

export const signInWithEmailAndPassword = (
  authInstance: Auth | null | undefined,
  email: string,
  password: string,
) => {
  if (!authInstance) {
    return Promise.reject(notConfiguredError());
  }

  return firebaseSignInWithEmailAndPassword(authInstance, email, password);
};

export const createUserWithEmailAndPassword = (
  authInstance: Auth | null | undefined,
  email: string,
  password: string,
) => {
  if (!authInstance) {
    return Promise.reject(notConfiguredError());
  }

  return firebaseCreateUserWithEmailAndPassword(authInstance, email, password);
};

export const sendPasswordResetEmail = (
  authInstance: Auth | null | undefined,
  email: string,
) => {
  if (!authInstance) {
    return Promise.reject(notConfiguredError());
  }

  return firebaseSendPasswordResetEmail(authInstance, email);
};

export const updateUserProfile = (
  user: User | null | undefined,
  profile: {
    displayName?: string | null;
    photoURL?: string | null;
  },
) => {
  if (!user) {
    return Promise.reject(notConfiguredError());
  }

  return firebaseUpdateProfile(user, profile);
};

export const signOut = (authInstance: Auth | null | undefined) => {
  if (!authInstance) {
    return Promise.reject(notConfiguredError());
  }

  return firebaseSignOut(authInstance);
};

export const onAuthStateChanged = (
  authInstance: Auth | null | undefined,
  nextOrObserver: ((user: User | null) => void) | object,
  error?: (error: Error) => void,
  completed?: () => void,
) => {
  if (!authInstance) {
    if (typeof nextOrObserver === 'function') {
      nextOrObserver(null);
    }
    return () => {};
  }

  return firebaseOnAuthStateChanged(authInstance, nextOrObserver as any, error as any, completed as any);
};

export const onIdTokenChanged = (
  authInstance: Auth | null | undefined,
  nextOrObserver: ((user: User | null) => void) | object,
  error?: (error: Error) => void,
  completed?: () => void,
) => {
  if (!authInstance) {
    if (typeof nextOrObserver === 'function') {
      nextOrObserver(null);
    }
    return () => {};
  }

  return firebaseOnIdTokenChanged(authInstance, nextOrObserver as any, error as any, completed as any);
};

// Types & Helpers
export type { User as FirebaseUser };
export {
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
};
