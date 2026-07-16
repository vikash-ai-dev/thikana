// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpHfMjjE6RkbHQ8AxoD2jGT4HrrWpxNzo",
  authDomain: "thikana-8ec07.firebaseapp.com",
  projectId: "thikana-8ec07",
  storageBucket: "thikana-8ec07.firebasestorage.app",
  messagingSenderId: "357483924748",
  appId: "1:357483924748:web:bc9a7d9691804f1c2ccd29",
  measurementId: "G-HRJ10PKETE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);