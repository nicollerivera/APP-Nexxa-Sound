// SCRIPT DE LIMPIEZA DE FIREBASE - ELIMINAR REGISTROS SIN NOMBRE
// Este script elimina PERMANENTEMENTE todos los registros corruptos

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Configuración de Firebase
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

async function cleanupFirebase() {
    console.log("🔍 INICIANDO LIMPIEZA DE FIREBASE...\n");

    let totalDeleted = 0;

    // 1. LIMPIAR EVENTOS
    console.log("📋 Revisando EVENTOS...");
    const eventsSnapshot = await getDocs(collection(db, "events"));
    const corruptedEvents = [];

    eventsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.client || (!data.client.name && !data.clientName)) {
            corruptedEvents.push({ id: docSnap.id, data });
        }
    });

    if (corruptedEvents.length > 0) {
        console.log(`❌ Encontrados ${corruptedEvents.length} eventos corruptos:`);
        for (const evt of corruptedEvents) {
            console.log(`  - ${evt.id}: client=${JSON.stringify(evt.data.client)}, clientName=${evt.data.clientName}`);

            // ELIMINANDO AUTOMÁTICAMENTE:
            await deleteDoc(doc(db, "events", evt.id));
            console.log(`    ✅ ELIMINADO`);
            totalDeleted++;
        }
    } else {
        console.log("✅ Todos los eventos tienen nombre\n");
    }

    // 2. LIMPIAR COTIZACIONES
    console.log("📋 Revisando COTIZACIONES...");
    const quotationsSnapshot = await getDocs(collection(db, "quotations"));
    const corruptedQuotations = [];

    quotationsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.client || (!data.client.name && !data.clientName)) {
            corruptedQuotations.push({ id: docSnap.id, data });
        }
    });

    if (corruptedQuotations.length > 0) {
        console.log(`❌ Encontradas ${corruptedQuotations.length} cotizaciones corruptas:`);
        for (const quo of corruptedQuotations) {
            console.log(`  - ${quo.id}: client=${JSON.stringify(quo.data.client)}, clientName=${quo.data.clientName}`);

            // ELIMINANDO AUTOMÁTICAMENTE:
            await deleteDoc(doc(db, "quotations", quo.id));
            console.log(`    ✅ ELIMINADO`);
            totalDeleted++;
        }
    } else {
        console.log("✅ Todas las cotizaciones tienen nombre\n");
    }

    // 3. LIMPIAR INVENTARIO
    console.log("📋 Revisando INVENTARIO...");
    const inventorySnapshot = await getDocs(collection(db, "inventory"));
    const corruptedInventory = [];

    inventorySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.name) {
            corruptedInventory.push({ id: docSnap.id, data });
        }
    });

    if (corruptedInventory.length > 0) {
        console.log(`❌ Encontrados ${corruptedInventory.length} items de inventario corruptos:`);
        for (const item of corruptedInventory) {
            console.log(`  - ${item.id}: name=${item.data.name}, category=${item.data.category}`);

            // ELIMINANDO AUTOMÁTICAMENTE:
            await deleteDoc(doc(db, "inventory", item.id));
            console.log(`    ✅ ELIMINADO`);
            totalDeleted++;
        }
    } else {
        console.log("✅ Todos los items de inventario tienen nombre\n");
    }

    console.log("\n🔍 LIMPIEZA COMPLETADA");
    console.log(`📊 Total de registros eliminados: ${totalDeleted}`);

    if (totalDeleted === 0) {
        console.log("✅ No se encontraron registros corruptos. La base de datos está limpia.");
    } else {
        console.log(`✅ Se eliminaron ${totalDeleted} registros corruptos exitosamente.`);
    }

    process.exit(0);
}

// Ejecutar
cleanupFirebase().catch((error) => {
    console.error("❌ ERROR:", error);
    process.exit(1);
});
