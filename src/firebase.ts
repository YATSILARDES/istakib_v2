import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// ... App Init ...
export const storage = getStorage(app);
export const messaging = getMessaging(app);
