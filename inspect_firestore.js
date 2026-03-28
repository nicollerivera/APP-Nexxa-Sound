
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit, orderBy } from "firebase/firestore";

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

async function inspect() {
    console.log("Fetching last quotation...");
    const q = query(collection(db, "quotations"), orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log("No quotations found.");
    } else {
        const doc = snapshot.docs[0];
        console.log("ID:", doc.id);
        console.log("DATA:", JSON.stringify(doc.data(), null, 2));
    }
    process.exit();
}

inspect();
