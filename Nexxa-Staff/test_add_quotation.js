import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAqEicD_akUzN74KpoLDbGgeavIZC9Qmoc",
    authDomain: "nexxa-staff.firebaseapp.com",
    projectId: "nexxa-staff",
    storageBucket: "nexxa-staff.firebasestorage.app",
    messagingSenderId: "538910965564",
    appId: "1:538910965564:web:7e860129b9b3ee128fa839"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testQuotation = {
    client: {
        name: "PRUEBA AUTOMATICA",
        phone: "3000000000",
        phone2: ""
    },
    eventDetails: {
        date: "2026-03-20",
        startTime: "18:00",
        endTime: "23:00",
        location: "Casa de Prueba",
        neighborhood: "El Poblado",
        guestCount: 50,
        occasion: "Prueba de Sistema",
        indications: "Probar el auto-cierre y el termómetro"
    },
    logistics: {
        packName: "Celebration",
        selectedExtras: { "extra_makeup": true },
        items: [] // Empty initially, will be filled by app or here
    },
    financials: {
        totalValue: 1200000,
        deposit: 300000,
        extraHourPrice: 120000
    },
    status: "SENT",
    createdAt: new Date().toISOString()
};

async function run() {
    try {
        const docRef = await addDoc(collection(db, "quotations"), testQuotation);
        console.log("Cotización de prueba creada con ID:", docRef.id);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

run();
