
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

async function createHighValueTest() {
    const testName = "💎 CLIENTE PREMIUM TEST";
    console.log(`🚀 Generando cotización de prueba por > $1.700.000...`);

    const testData = {
        status: 'SENT',
        createdAt: serverTimestamp(),
        client: {
            name: testName,
            phone: "3204863127",
            phone2: ''
        },
        eventDetails: {
            date: "2026-03-15",
            occasion: "Evento VIP",
            startTime: "19:00",
            endTime: "03:00",
            location: "Club Social",
            neighborhood: "Rosales",
            guestCount: 150
        },
        financials: {
            totalValue: 1850000,
            deposit: 0,
            balance: 1850000
        },
        logistics: {
            packName: 'CELEBRATION',
            selectedExtras: { makeup: true, sparklers: true, bridge: true },
            makeupCount: 1
        }
    };

    try {
        const docRef = await addDoc(collection(db, "quotations"), testData);
        console.log("✅ COTIZACIÓN DE ALTO VALOR CREADA. ID:", docRef.id);
        console.log(`Nombre: "${testName}"`);
        console.log(`Valor: $1.850.000`);
    } catch (e) {
        console.error("❌ Fallo:", e);
    } finally {
        process.exit();
    }
}

createHighValueTest();
