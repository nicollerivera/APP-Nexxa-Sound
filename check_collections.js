
import { initializeApp } from "firebase/app";
import { getFirestore, listCollections } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAqEicD_akUzN74KpoLDbGgeavIZC9Qmoc",
    authDomain: "nexxa-staff.firebaseapp.com",
    projectId: "nexxa-staff",
    storageBucket: "nexxa-staff.firebasestorage.app",
    messagingSenderId: "538910965564",
    appId: "1:538910965564:web:7e860129b9b3ee128fa839",
    measurementId: "G-M31H829KPY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTest() {
    // Note: listCollections is only available in Admin SDK or Node client with specific setup
    // For standard Firestore web/node client, we can't easily list collections without knowing names.
    // Instead I will try to check common names.
    try {
        const collections = ["quotations", "events", "users", "inventory", "globalTx", "damageReports"];
        for (const name of collections) {
            console.log(`Checking collection: ${name}...`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

runTest();
