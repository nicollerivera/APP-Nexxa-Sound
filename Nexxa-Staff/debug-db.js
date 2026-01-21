import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCs-J5btEht71f9FRI-iXrY-7vSpc2CMz8",
    authDomain: "nexxa-staff.firebaseapp.com",
    projectId: "nexxa-staff",
    storageBucket: "nexxa-staff.firebasestorage.app",
    messagingSenderId: "538910965564",
    appId: "1:538910965564:web:7e860129b9b3ee128fa839",
    measurementId: "G-M31H829KPY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log("🔍 Checking Firestore connection...");
    try {
        const eventsRef = collection(db, "events");
        const snapshot = await getDocs(eventsRef);
        console.log(`✅ Success! Found ${snapshot.size} events in cloud.`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(` - [${doc.id}] Client: ${data.client?.name || 'Unknown'}`);
        });
    } catch (error) {
        console.error("❌ Error fetching documents:", error);
    }
}

check();
