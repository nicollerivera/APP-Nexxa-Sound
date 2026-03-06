import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const CONFIG_DOC_PATH = 'app_config/catalog';
const RULES_DOC_PATH = 'app_config/pricing_rules';

export const configService = {
    /**
     * Suscribirse a los cambios de configuración del catálogo
     */
    subscribeToCatalog(onUpdate) {
        return onSnapshot(doc(db, CONFIG_DOC_PATH), (docSnap) => {
            if (docSnap.exists()) {
                onUpdate(docSnap.data());
            } else {
                console.warn("No se encontró el catálogo en Firestore");
                onUpdate(null);
            }
        });
    },

    /**
     * Suscribirse a las reglas de precios y variables de negocio
     */
    subscribeToRules(onUpdate) {
        return onSnapshot(doc(db, RULES_DOC_PATH), (docSnap) => {
            if (docSnap.exists()) {
                onUpdate(docSnap.data());
            } else {
                console.warn("No se encontraron las reglas de precios en Firestore");
                onUpdate(null);
            }
        });
    },

    /**
     * Actualiza el catálogo completo
     */
    async updateCatalog(catalogData) {
        await setDoc(doc(db, CONFIG_DOC_PATH), catalogData);
    },

    /**
     * Actualiza las reglas de precios
     */
    async updateRules(rulesData) {
        await setDoc(doc(db, RULES_DOC_PATH), rulesData);
    },

    /**
     * Obtener configuración inicial (una sola vez)
     */
    async fetchAllConfig() {
        const catalogSnap = await getDoc(doc(db, CONFIG_DOC_PATH));
        const rulesSnap = await getDoc(doc(db, RULES_DOC_PATH));

        return {
            catalog: catalogSnap.exists() ? catalogSnap.data() : null,
            rules: rulesSnap.exists() ? rulesSnap.data() : null
        };
    }
};
