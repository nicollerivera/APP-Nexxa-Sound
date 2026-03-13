
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, orderBy, query, limit } from "firebase/firestore";

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
    try {
        const snapshot = await getDocs(collection(db, "quotations"));
        snapshot.forEach(doc => {
            const data = doc.data();
            const ts = data.createdAt;
            if (doc.id.startsWith("QUO-DEMO")) {
                console.log(`ID: ${doc.id} | createdAt type: ${typeof ts} | value: ${JSON.stringify(ts)}`);
            }
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

runTest();
