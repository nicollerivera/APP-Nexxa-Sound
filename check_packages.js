import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function check() {
    console.log("Fetching app_config/catalog...");
    const snap = await getDoc(doc(db, "app_config", "catalog"));
    if (snap.exists()) {
        const data = snap.data();
        console.log("Packages:", JSON.stringify(data.packages, null, 2));
    } else {
        console.log("No catalog found.");
    }
    process.exit(0);
}

check().catch(console.error);
