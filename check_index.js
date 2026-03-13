
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
        console.log("🔍 Consultando cotizaciones ordenadas por createdAt desc...");
        const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"), limit(20));
        const snapshot = await getDocs(q);

        console.log("Top 20 cotizaciones:");
        snapshot.forEach(doc => {
            const data = doc.data();
            const ts = data.createdAt;
            const dateStr = ts && ts.toDate ? ts.toDate().toISOString() : "NO TIMESTAMP";
            console.log(`- [${doc.id}] ${dateStr} | Cliente: ${data.client?.name || data.clientName} | Status: ${data.status}`);
        });

    } catch (e) {
        console.error("❌ Error de Firebase:", e);
        if (e.code === 'failed-precondition') {
            console.error("⚠️ FALTA ÍNDICE para el ordenamiento por createdAt.");
        }
    } finally {
        process.exit();
    }
}

runTest();
