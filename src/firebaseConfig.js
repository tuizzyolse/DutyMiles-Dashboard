import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgTgvpmQJg-7E77IyriJ6sJCIJDOcUejI",
  authDomain: "dutymiles.firebaseapp.com",
  projectId: "dutymiles",
  storageBucket: "dutymiles.firebasestorage.app",
  messagingSenderId: "745046177264",
  appId: "1:745046177264:web:794ceaea2398fdab915935",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);