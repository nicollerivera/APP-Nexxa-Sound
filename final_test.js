
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
    const testName = "🔥 PRUEBA SISTEMA OK " + new Date().toLocaleTimeString();
    console.log(`🚀 Generando cotización de prueba: "${testName}"...`);

    const testData = {
        status: 'SENT',
        createdAt: serverTimestamp(),
        client: {
            name: testName,
            phone: "3204863127",
            phone2: ''
        },
        eventDetails: {
            date: "2026-02-28",
            occasion: "Validación Sistema",
            startTime: "18:00",
            endTime: "00:00",
            location: "Centro de Eventos",
            neighborhood: "Chicó",
            guestCount: 50
        },
        financials: {
            totalValue: 950000,
            deposit: 0,
            balance: 950000
        },
        logistics: {
            packName: 'ESSENTIAL',
            selectedExtras: {},
            makeupCount: 0
        }
    };

    try {
        const docRef = await addDoc(collection(db, "quotations"), testData);
        console.log("✅ GUARDADO EXITOSO. ID generado:", docRef.id);

        console.log("---");
        console.log("👉 Por favor, abre la Staff App y confirma que aparece:");
        console.log(`Nombre: "${testName}"`);
        console.log("---");

    } catch (e) {
        console.error("❌ Fallo en la prueba:", e);
    } finally {
        process.exit();
    }
}

runTest();
