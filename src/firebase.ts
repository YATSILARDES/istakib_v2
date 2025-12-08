import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Firebase Console'dan projenizin ayarlarını alıp buraya yapıştırın.
// https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: "AIzaSyD8BGX9HxswFXV3OtT4bqbIMN3DN9fkE4k",
    authDomain: "is-takip-11d57.firebaseapp.com",
    projectId: "is-takip-11d57",
    storageBucket: "is-takip-11d57.firebasestorage.app",
    messagingSenderId: "307165484762",
    appId: "1:307165484762:web:4b46898bf6917cf0dbb7e3",
    measurementId: "G-WXSRFSJKMH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
