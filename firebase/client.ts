import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQPNkz9doMe5GHpyie26PNuitf1rlxXEo",
  authDomain: "prepwise-d797d.firebaseapp.com",
  projectId: "prepwise-d797d",
  storageBucket: "prepwise-d797d.firebasestorage.app",
  messagingSenderId: "805338808514",
  appId: "1:805338808514:web:8225e20fcb72b0e08efb5b",
  measurementId: "G-JMQE7FMX0F"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
