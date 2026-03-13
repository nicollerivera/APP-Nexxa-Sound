
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
        console.log("🔍 Analizando las últimas 15 cotizaciones para ver por qué no aparecen...");
        const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"), limit(15));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const clientName = data.client?.name || data.clientName || 'SIN NOMBRE';
            const status = data.status || 'SIN ESTADO';
            const date = data.eventDetails?.date || 'SIN FECHA';

            let issues = [];
            if (clientName === 'SIN NOMBRE') issues.push("Falta nombre del cliente");
            if (status !== 'SENT') issues.push(`Estado es ${status} (debería ser SENT)`);

            console.log(`- [${id}] Cliente: ${clientName} | Estado: ${status} | Fecha Evento: ${date}`);
            if (issues.length > 0) {
                console.log(`   ⚠️ PROBLEMAS: ${issues.join(', ')}`);
            } else {
                console.log(`   ✅ Debería ser visible en la App de Staff (Sección Ventas)`);
            }
        });

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        process.exit();
    }
}

runTest();
