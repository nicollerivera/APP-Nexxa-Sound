
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy, limit } from "firebase/firestore";

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
    console.log("🚀 Iniciando prueba de guardado en Firebase...");

    const testData = {
        status: 'SENT',
        createdAt: serverTimestamp(),
        client: {
            name: "PRUEBA ANTIGRAVITY " + new Date().getTime(),
            phone: "3221234567",
            phone2: ''
        },
        eventDetails: {
            date: "2026-02-10",
            occasion: "Test System",
            startTime: "20:00",
            endTime: "02:00",
            location: "Calle Falsa 123",
            neighborhood: "Bocagrande",
            guestCount: 100
        },
        financials: {
            totalValue: 1200000,
            deposit: 0,
            balance: 1200000
        },
        logistics: {
            packName: 'MEMORIES',
            selectedExtras: { makeup: true },
            makeupCount: 1
        }
    };

    try {
        const docRef = await addDoc(collection(db, "quotations"), testData);
        console.log("✅ Cotización guardada exitosamente con ID:", docRef.id);

        console.log("🔍 Verificando lectura desde Staff App...");
        const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"), limit(5));
        const querySnapshot = await getDocs(q);

        console.log("Últimas 5 cotizaciones encontradas:");
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`- [${doc.id}] Cliente: ${data.client?.name} | Estado: ${data.status}`);
        });

    } catch (e) {
        console.error("❌ Error en la prueba:", e);
    } finally {
        process.exit();
    }
}

runTest();
