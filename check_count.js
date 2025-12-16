import { initializeApp } from "firebase/app";
import { getFirestore, collection, getCountFromServer } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD8BGX9HxswFXV3OtT4bqbIMN3DN9fkE4k",
    authDomain: "is-takip-11d57.firebaseapp.com",
    projectId: "is-takip-11d57",
    storageBucket: "is-takip-11d57.firebasestorage.app",
    messagingSenderId: "307165484762",
    appId: "1:307165484762:web:4b46898bf6917cf0dbb7e3",
    measurementId: "G-WXSRFSJKMH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
    console.log("Checking collections...");

    // Check 'randevular' (Correct spelling)
    try {
        const coll = collection(db, "randevular");
        const snapshot = await getCountFromServer(coll);
        console.log(`'randevular' koleksiyonundaki belge sayısı: ${snapshot.data().count}`);
    } catch (e) {
        console.error("Error checking 'randevular':", e.message);
    }

    // Check 'randvular' (Possible typo from user)
    try {
        const collTypo = collection(db, "randvular");
        const snapshotTypo = await getCountFromServer(collTypo);
        console.log(`'randvular' (typo?) koleksiyonundaki belge sayısı: ${snapshotTypo.data().count}`);
    } catch (e) {
        console.error("Error checking 'randvular':", e.message);
    }

    // Check 'randevu' (Another possibility)
    try {
        const collSingular = collection(db, "randevu");
        const snapshotSingular = await getCountFromServer(collSingular);
        console.log(`'randevu' koleksiyonundaki belge sayısı: ${snapshotSingular.data().count}`);
    } catch (e) {
        // Ignore
    }

    process.exit(0);
}

checkCollections();
