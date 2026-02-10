// SCRIPT DE LIMPIEZA DE FIREBASE - ELIMINAR REGISTROS SIN NOMBRE
// Este script elimina PERMANENTEMENTE todos los registros corruptos

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Configuración de Firebase (copia de tu firebase.js)
const firebaseConfig = {
    apiKey: "AIzaSyBLHN5v7OqYEWZ8gKxHLQxJ8u9QJ0KZJQE",
    authDomain: "nexxa-staff.firebaseapp.com",
    projectId: "nexxa-staff",
    storageBucket: "nexxa-staff.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
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

            // DESCOMENTAR PARA ELIMINAR:
            // await deleteDoc(doc(db, "events", evt.id));
            // console.log(`    ✅ ELIMINADO`);
            // totalDeleted++;
        }
        console.log(`⚠️  Para eliminar, descomenta las líneas 37-40 y ejecuta de nuevo.\n`);
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

            // DESCOMENTAR PARA ELIMINAR:
            // await deleteDoc(doc(db, "quotations", quo.id));
            // console.log(`    ✅ ELIMINADO`);
            // totalDeleted++;
        }
        console.log(`⚠️  Para eliminar, descomenta las líneas 63-66 y ejecuta de nuevo.\n`);
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

            // DESCOMENTAR PARA ELIMINAR:
            // await deleteDoc(doc(db, "inventory", item.id));
            // console.log(`    ✅ ELIMINADO`);
            // totalDeleted++;
        }
        console.log(`⚠️  Para eliminar, descomenta las líneas 89-92 y ejecuta de nuevo.\n`);
    } else {
        console.log("✅ Todos los items de inventario tienen nombre\n");
    }

    console.log("🔍 LIMPIEZA COMPLETADA");
    console.log(`📊 Total de registros que se eliminarían: ${corruptedEvents.length + corruptedQuotations.length + corruptedInventory.length}`);

    if (totalDeleted > 0) {
        console.log(`✅ Total eliminados: ${totalDeleted}`);
    }
}

// Ejecutar
cleanupFirebase().catch(console.error);
