
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

async function cleanTests() {
    console.log("🧹 Iniciando limpieza de datos de prueba...");
    const snapshot = await getDocs(collection(db, "quotations"));
    let count = 0;

    for (const d of snapshot.docs) {
        const data = d.data();
        const name = data.client?.name || "";
        if (name.includes("PRUEBA") || name.includes("Vahask")) {
            console.log(`🗑️ Eliminando documento: [${d.id}] - ${name}`);
            await deleteDoc(doc(db, "quotations", d.id));
            count++;
        }
    }

    console.log(`✅ Limpieza terminada. Se eliminaron ${count} registros.`);
    process.exit();
}

cleanTests();
