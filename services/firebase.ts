import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration from your Firebase Console (Project: signton2)
const firebaseConfig = {
  apiKey: "AIzaSyAEwvwL2HGvSrGMBs20GJHTkAQ7ZcThqzY",
  authDomain: "signton2.firebaseapp.com",
  projectId: "signton2",
  storageBucket: "signton2.firebasestorage.app",
  messagingSenderId: "234472138938",
  appId: "1:234472138938:web:9825457fdb7d05cfc53a83",
  measurementId: "G-HG3FR2N0HQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);