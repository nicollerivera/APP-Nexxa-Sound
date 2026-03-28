import { db } from './src/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function checkCatalog() {
  try {
    const snap = await getDoc(doc(db, 'app_config', 'catalog'));
    if (snap.exists()) {
      console.log('--- CATALOG DATA ---');
      const data = snap.data();
      if (data.packages) {
        data.packages.forEach((pkg, i) => {
          console.log(`\n📦 PKG ${i+1}: ${pkg.name.toUpperCase()} ($${pkg.price})`);
          console.log(`- Features: ${pkg.features.join(', ')}`);
        });
      }
      if (data.extras) {
        console.log('\n✨ EXTRAS:');
        data.extras.forEach(ex => console.log(`- ${ex.name} ($${ex.price})`));
      }
    } else {
      console.log('Catalog document not found in Firestore.');
    }
  } catch (e) {
    console.error('Error reading catalog:', e);
  }
}

checkCatalog().then(() => process.exit());
