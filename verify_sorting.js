
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
    console.log("🚀 Iniciando prueba de guardado SIN timestamp (para forzar posición superior)...");

    const testData = {
        status: 'SENT',
        // createdAt: serverTimestamp(), // ELIMINADO PARA PROBAR LÓGICA DE POSICIÓN
        client: {
            name: "PRUEBA POSICIÓN SUPERIOR " + new Date().getTime(),
            phone: "0000000000",
            phone2: ''
        },
        eventDetails: {
            date: "2026-02-10",
            occasion: "Test Sorting",
            startTime: "12:00",
            endTime: "16:00",
            location: "Test Loc",
            neighborhood: "Test Neighborhood",
            guestCount: 10
        }
    };

    try {
        const docRef = await addDoc(collection(db, "quotations"), testData);
        console.log("✅ Cotización guardada exitosamente con ID:", docRef.id);

        console.log("🔍 Verificando lectura...");
        const snapshot = await getDocs(collection(db, "quotations"));
        const allQuos = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // Simular la lógica de parseFirestoreDate de helpers.js
        const parseDate = (date) => {
            if (!date) return new Date(8640000000000000);
            if (date.toDate) return date.toDate();
            return new Date(date);
        };

        const sorted = allQuos.sort((a, b) => {
            const dateA = parseDate(a.createdAt);
            const dateB = parseDate(b.createdAt);
            if (dateA.getTime() === dateB.getTime()) return b.id.localeCompare(a.id);
            return dateB - dateA;
        });

        console.log("--- TOP 3 COTIZACIONES ORDENADAS ---");
        sorted.slice(0, 3).forEach((data, i) => {
            console.log(`${i + 1}. [${data.id}] ${data.client?.name} | Fecha Creación: ${data.createdAt ? "CON FECHA" : "SIN FECHA (TOP)"}`);
        });

    } catch (e) {
        console.error("❌ Error en la prueba:", e);
    } finally {
        process.exit();
    }
}

runTest();
