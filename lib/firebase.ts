/**
 * ██████████████████████████████████████████████████████████████
 * FIREBASE CLIENT – SAFE FOR NEXT.JS + VERCEL (v2.0)
 * 
 * ✅ Only initializes on the CLIENT (browser)
 * ✅ Prevents double initialization
 * ✅ Uses environment variables (recommended) or falls back to hardcoded
 * ✅ Zero server-side execution → fixes "This page couldn’t load"
 * ✅ Ready for production on Vercel
 * ██████████████████████████████████████████████████████████████
 */

import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

// ←←← BEST PRACTICE: Use environment variables on Vercel
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA_EhPmVc8vIwecULfuNFyjgk0gwy-wP0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "foryafi-a142a.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://foryafi-a142a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "foryafi-a142a",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "foryafi-a142a.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "831861591944",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:831861591944:web:4aeef54617088a8ca4343d",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QZG8T5TMD1",
};

// Only initialize on the client (browser)
let db: any;

if (typeof window !== "undefined") {
  // Prevent multiple initializations (important in Next.js)
  if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  } else {
    db = getDatabase(getApps()[0]);
  }
} else {
  // On server we return null (no crash)
  db = null;
}

export { db };