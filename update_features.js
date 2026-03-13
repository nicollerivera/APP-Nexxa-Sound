import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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

const packageUpdates = {
    "essential": {
        features: [
            'Cabinas profesionales',
            'DJ Crossover en vivo',
            '4 Luces LED',
            'Cámara de Humo',
            '2 micrófonos inalámbricos'
        ]
    }
};

async function update() {
    console.log("Fetching app_config/catalog...");
    const snap = await getDoc(doc(db, "app_config", "catalog"));
    if (snap.exists()) {
        const data = snap.data();
        const updatedPackages = data.packages.map(pkg => {
            const idKey = (pkg.id || "").toLowerCase();
            const update = packageUpdates[idKey];
            if (update) {
                console.log(`Updating features for: ${pkg.id}`);
                return {
                    ...pkg,
                    features: update.features
                };
            }
            return pkg;
        });

        await updateDoc(doc(db, "app_config", "catalog"), {
            packages: updatedPackages
        });
        console.log("Updated Firestore with new Essential features.");
    }
    process.exit(0);
}

update().catch(console.error);
