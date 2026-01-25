import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

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

// Offline Persistence (Önbellekleme) Özelliği
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export const storage = getStorage(app);


let messagingInstance: any = null;
try {
    // Only init messaging if supported (checks for window, indexedDB, ServiceWorker)
    // And implicitly checks for Secure Context (HTTPS/localhost)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        messagingInstance = getMessaging(app);
    }
} catch (e) {
    console.warn("Firebase Messaging not supported (likely due to insecure origin or missing SW support):", e);
}
export const messaging = messagingInstance;
