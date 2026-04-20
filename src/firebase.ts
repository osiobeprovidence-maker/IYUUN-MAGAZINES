import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer, collection, getDocs, setDoc, query, orderBy, deleteDoc, updateDoc, increment, addDoc, where, serverTimestamp, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export type { User as FirebaseUser };
export { signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, getDocFromServer, collection, getDocs, setDoc, query, orderBy, deleteDoc, updateDoc, increment, addDoc, where, serverTimestamp, limit };
export { ref, uploadBytes, getDownloadURL };
