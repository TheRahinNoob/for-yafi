import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_EhPmVc8vIwecULfuNFyjgk0gwy-wP0",
  authDomain: "foryafi-a142a.firebaseapp.com",
  databaseURL: "https://foryafi-a142a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "foryafi-a142a",
  storageBucket: "foryafi-a142a.firebasestorage.app",
  messagingSenderId: "831861591944",
  appId: "1:831861591944:web:4aeef54617088a8ca4343d",
  measurementId: "G-QZG8T5TMD1"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Realtime Database instance (this is what we will use for live location)
export const db = getDatabase(app);