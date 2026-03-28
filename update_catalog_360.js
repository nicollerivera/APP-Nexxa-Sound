import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

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

async function run() {
    const snap = await getDoc(doc(db, "app_config", "catalog"));
    if (snap.exists()) {
        const data = snap.data();
        const extras = data.extras || [];
        // Check if camera_360 already exists
        if (!extras.find(e => e.id === 'camera_360')) {
            console.log("Adding Cámara 360 Aérea to Firestore extras...");
            extras.unshift({
                id: 'camera_360',
                name: 'Cámara 360 Aérea',
                desc: 'Video cinemático 4k con brazo giratorio aéreo para tomas épicas.',
                price: 350000,
                imageUrl: '/camera_360.png'
            });
            await updateDoc(doc(db, "app_config", "catalog"), { extras });
            console.log("SUCCESS: Firestore catalog updated.");
        } else {
            console.log("Cámara 360 Aérea already in Firestore.");
        }
    } else {
        console.log("CATALOG NOT FOUND");
    }
    process.exit(0);
}

run().catch(console.error);
