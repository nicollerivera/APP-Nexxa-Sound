import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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

async function deletePersonalizado() {
    console.log("Updating app_config/catalog...");
    const ref = doc(db, "app_config", "catalog");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data();
        data.packages = data.packages.filter(p => p.id !== 'Personalizado');
        await setDoc(ref, data);
        console.log("Deleted Personalizado package from catalog successfully.");
    } else {
        console.log("No catalog found.");
    }
    process.exit(0);
}

deletePersonalizado().catch(console.error);
