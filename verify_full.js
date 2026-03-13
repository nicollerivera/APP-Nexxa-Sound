
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";

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
        const testName = "TEST_" + Date.now();
        console.log("🚀 Guardando cotización con nombre:", testName);
        const docRef = await addDoc(collection(db, "quotations"), {
            clientName: testName,
            status: 'SENT',
            createdAt: serverTimestamp()
        });
        console.log("✅ Guardado con ID:", docRef.id);

        console.log("🔍 Esperando 2 segundos...");
        await new Promise(r => setTimeout(r, 2000));

        console.log("🔍 Leyendo todas las cotizaciones...");
        const snapshot = await getDocs(collection(db, "quotations"));
        console.log("Total encontradas:", snapshot.size);
        
        let found = false;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.clientName === testName) {
                console.log("🎯 ¡ENCONTRADA! ID:", doc.id);
                found = true;
            }
        });

        if (!found) {
            console.log("❌ NO SE ENCONTRÓ la cotización recién guardada.");
        }

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        process.exit();
    }
}

runTest();
