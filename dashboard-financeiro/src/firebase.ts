import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCHJ0jtNFuYd0nvD569eVufYpLQCp730rs",
  authDomain: "sistema-financeiro-41aa8.firebaseapp.com",
  projectId: "sistema-financeiro-41aa8",
  storageBucket: "sistema-financeiro-41aa8.firebasestorage.app",
  messagingSenderId: "330704928158",
  appId: "1:330704928158:web:e44c2d3396957b61756a8f",
  measurementId: "G-EKWNSK4EV9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };