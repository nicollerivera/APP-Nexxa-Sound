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

const packageImages = {
    "essential": "/essential_realistic.png", // Corrected to show 2 speakers and 4 lights
    "memories": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800", // Canon T7i
    "celebration": "/celebration_realistic.png" // Realistic balloon garland
};

async function update() {
    console.log("Fetching app_config/catalog...");
    const snap = await getDoc(doc(db, "app_config", "catalog"));
    if (snap.exists()) {
        const data = snap.data();
        const updatedPackages = data.packages.map(pkg => {
            const idKey = (pkg.id || "").toLowerCase();
            const img = packageImages[idKey] || "";
            return {
                ...pkg,
                imageUrl: img
            };
        });

        await updateDoc(doc(db, "app_config", "catalog"), {
            packages: updatedPackages
        });
        console.log("Updated Essentials with realistic speakers and lights setup.");
    }
    process.exit(0);
}

update().catch(console.error);
