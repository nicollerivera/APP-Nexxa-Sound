import { db } from './src/firebase.js';
import { doc, setDoc } from 'firebase/firestore';

const services = [
    {
        id: 'decor_onix',
        category: 'decoraciones',
        name: 'DECORACIÓN ONIX',
        desc: 'Arco de globos, cortinas y topper personalizado.',
        longDesc: 'Protocolo Onix: composición orgánica de globos con texturas metálicas y montaje profesional adaptable.',
        includesDetail: [
            { name: 'Set de Globos Orgánico (100)', desc: 'Composición unificada de alta densidad con Globos Grandes (4), Medianos (66) y Pequeños (30) para un arco profesional.', icon: 'sparkles' },
            { name: 'Topper Temático', desc: 'Pieza personalizada diseñada según la ocasión.', icon: 'pen-tool' },
            { name: 'Cortinas en Tiras (2)', desc: 'Fondo metálico brillante para estaciones fotográficas.', icon: 'layout-grid' },
            { name: 'Mantel Desechable (2)', desc: 'Manteles coordinados para la mesa principal.', icon: 'columns' }
        ],
        price: 200000,
        img: 'onix_balloons_final.png',
        tags: ['Popular'],
        // Logistics Metadata
        requiredRoles: ['decor'],
        materialArea: ['DECORACIÓN']
    },
    {
        id: 'decor_multii',
        category: 'decoraciones',
        name: 'DECORACIÓN MULTII',
        desc: 'Arco circular con manguera Neón LED y estructura metálica.',
        longDesc: 'Protocolo Multii: diseño minimalista con globos de alta densidad y halo de luz Neón LED perimetral.',
        includesDetail: [
            { name: 'Set de Globos Orgánico (150)', desc: 'Composición de alta densidad con Globos Grandes (8), Medianos (97) y Pequeños (45) para un arco circular imponente.', icon: 'sparkles' },
            { name: 'Estructura Circular (Alquiler)', desc: 'Soporte metálico de 2m para una base perfectamente circular.', icon: 'target' },
            { name: 'Fondo en Velo con Luces (Alquiler)', desc: 'Velo cinematográfico con integración de luces blancas cálidas.', icon: 'sun' },
            { name: 'Manguera Neón LED', desc: 'Luz flexible perimetral que resalta el contorno del diseño.', icon: 'zap' },
            { name: 'Manteles con Temática (2)', desc: 'Set de manteles coordinados con la temática del evento.', icon: 'columns' },
            { name: 'Topper Temático', desc: 'Pieza personalizada diseñada según la ocasión de tu evento.', icon: 'pen-tool' }
        ],
        price: 340000,
        img: 'multii_balloons_final.png',
        tags: ['Nuevo'],
        requiredRoles: ['decor'],
        materialArea: ['DECORACIÓN']
    },
    {
        id: 'decor_kaizen',
        category: 'decoraciones',
        name: 'DECORACIÓN KAIZEN',
        desc: 'Respaldo personalizado, set de cilindros y máxima densidad de globos.',
        longDesc: 'Protocolo Kaizen: nuestra gama más alta con respaldo de 1m y cilindros de lujo personalizados.',
        includesDetail: [
            { name: 'Set de Globos Premium (200)', desc: 'Máxima densidad orgánica con Globos Grandes (7), Medianos (130) y Pequeños (63) para un impacto visual de lujo.', icon: 'sparkles' },
            { name: 'Respaldo Circular 1m (Alquiler)', desc: 'Panel circular personalizado de 1 metro de diámetro con el diseño de tu evento.', icon: 'disc' },
            { name: 'Trío de Cilindros (Alquiler)', desc: 'Set de 3 cilindros personalizados para una composición de mesa en distintas alturas.', icon: 'cylinder' },
            { name: 'Manteles con Temática (2)', desc: 'Dúo de manteles coordinados con la estética y temática elegida.', icon: 'columns' }
        ],
        price: 550000,
        img: 'kaizen_gold_fabric_final.png',
        tags: ['Premium'],
        requiredRoles: ['decor'],
        materialArea: ['DECORACIÓN']
    },
    {
        id: 'audiovisual',
        category: 'audiovisual',
        name: 'SONIDO ESSENTIAL',
        desc: 'Cabinas pro, DJ (4h), micrófonos inalámbricos, luces y humo.',
        longDesc: 'Protocolo rítmico: sonido profesional calibrado, DJ en vivo y efectos de iluminación para una atmósfera inmersiva.',
        includesDetail: [
            { name: 'Sonido Pro', desc: '2 cabinas de alta potencia con 2 micrófonos inalámbricos.', icon: 'speaker' },
            { name: 'DJ Crossover', desc: 'Mezcla profesional en vivo adaptada al ritmo de tu evento.', icon: 'disc-3' },
            { name: 'Show de Luces', desc: '4 luces rítmicas LED sincronizadas y cámara de humo.', icon: 'zap' }
        ],
        price: 450000,
        img: 'nexus_plata.png',
        tags: ['Essential'],
        requiredRoles: ['dj', 'logistica'],
        materialArea: ['DJ']
    },
    {
        id: 'camara_360',
        category: 'camara360',
        name: 'CÁMARA 360° MASTER',
        desc: 'Estructura colosal de 2.50m × 3.00m.',
        longDesc: 'Estación videobooth 360°: captura cinematográfica 4K, slow-motion y entrega instantánea por código QR.',
        includesDetail: [
            { name: 'Plataforma XL', desc: 'Capacidad real para hasta 15 personas simultáneamente.', icon: 'rotate-3d' },
            { name: 'Videos 4K', desc: 'Edición automática con efectos visuales y entrega inmediata.', icon: 'video' },
            { name: 'Operador Pro', desc: 'Técnico encargado de guiar y optimizar cada toma.', icon: 'user-check' }
        ],
        price: 550000,
        img: 'overhead_360.png',
        tags: ['Trending'],
        requiredRoles: ['logistica'],
        materialArea: ['VIDEO360']
    },
    {
        id: 'camara_360_aerea',
        category: 'camara360',
        name: 'CÁMARA 360 AÉREA',
        desc: 'Cámara 360 suspendida para tomas desde las alturas.',
        longDesc: 'Protocolo Aéreo: Estructura cenital que permite capturas 360° sin plataforma, logrando tomas cinematográficas desde un ángulo superior único.',
        includesDetail: [
            { name: 'Toma Cenital', desc: 'Captura desde arriba que despeja el suelo para una coreografía total.', icon: 'arrow-up-circle' },
            { name: 'Efecto Matrix', desc: 'Sincronización de luces neón en la estructura superior.', icon: 'zap' },
            { name: 'Entrega Instantánea', desc: 'Renderizado automático con música y efectos visuales.', icon: 'qr-code' }
        ],
        price: 650000,
        img: 'camara360_neon.png',
        tags: ['Nuevo', 'Premium'],
        requiredRoles: ['logistica'],
        materialArea: ['VIDEO360']
    },
    {
        id: 'foto_pro',
        category: 'fotografia',
        name: 'FOTOGRAFÍA PRO',
        desc: 'Registro profesional con entrega inmediata en MicroSD.',
        longDesc: 'Cobertura integral del evento con fotógrafo profesional y entrega física del material al finalizar.',
        includesDetail: [
            { name: 'Registro Social', desc: 'Cobertura de momentos clave, grupos y detalles estéticos.', icon: 'camera' },
            { name: 'Material Pro', desc: 'Fotografía en alta resolución con equipamiento cinematográfico.', icon: 'aperture' },
            { name: 'MicroSD 32GB', desc: 'Entrega física de la tarjeta con todas las fotos al terminar.', icon: 'hard-drive' }
        ],
        price: 200000,
        img: 'foto_pro_camera.png',
        tags: ['Essential'],
        requiredRoles: ['foto'],
        materialArea: ['PHOTO']
    },
    {
        id: 'maquillaje_neon',
        category: 'accesorios',
        name: 'MAQUILLAJE NEÓN',
        desc: 'Maquillaje neón y maquillador asignado por 2 horas.',
        longDesc: 'Intervención artística: diseños reactivos a luz UV para resaltar la estética de tus invitados.',
        includesDetail: [
            { name: 'Sesión Artística', desc: '2 horas de maquillaje continuo con pigmentos neón UV.', icon: 'palette' },
            { name: 'Body Paint', desc: 'Diseños rápidos y de alto impacto visual para los asistentes.', icon: 'brush' },
            { name: 'Bio-Seguridad', desc: 'Pigmentos hipoalergénicos fáciles de retirar tras la fiesta.', icon: 'sun' }
        ],
        price: 120000,
        img: 'maquillaje_neon.png',
        tags: ['Trending'],
        requiredRoles: ['logistica'], // Artist handled as logistics/staff fee
        materialArea: ['ACCESORIOS']
    },
    {
        id: 'acc_essential',
        category: 'accesorios',
        name: 'ACCESORIOS 111',
        desc: '1 Espuma de carnaval, 10 manillas neón y 10 pitos para 10 personas.',
        longDesc: 'Protocolo de dispersión base: elementos rítmicos y visuales para equipar la pista.',
        includesDetail: [
            { name: 'Espuma Carnaval', desc: '1 unidad de spray de alta densidad.', icon: 'wind' },
            { name: 'Mix Neón (10)', desc: '10 manillas UV-Ready y 10 pitos rítmicos.', icon: 'circle' }
        ],
        price: 20000,
        img: 'acc_111.png',
        tags: ['Base'],
        requiredRoles: [],
        materialArea: ['ACCESORIOS']
    },
    {
        id: 'acc_memories',
        category: 'accesorios',
        name: 'ACCESORIOS 444',
        desc: '2 Espumas de carnaval, collares hawaianos, manillas y pitos para 10 personas.',
        longDesc: 'Protocolo reforzado: añade color y volumen festivo con accesorios hawaianos.',
        includesDetail: [
            { name: 'Dúo Espumas', desc: '2 unidades de espuma para doble impacto visual.', icon: 'wind' },
            { name: 'Carga Táctica (20)', desc: '20 collares, 10 manillas neón y 10 pitos.', icon: 'flower' }
        ],
        price: 40000,
        img: 'acc_444.png',
        tags: ['Pro'],
        requiredRoles: [],
        materialArea: ['ACCESORIOS']
    },
    {
        id: 'acc_celebration',
        category: 'accesorios',
        name: 'ACCESORIOS 777',
        desc: '3 Espumas de carnaval, 2 cañones de confetti, antifaces, gafas, diademas y corbatines para 10 personas.',
        longDesc: 'Zenit de accesorios: máxima densidad de props, cañones de confetti y antifaces de gala.',
        includesDetail: [
            { name: 'Arsenal Triple', desc: '3 espumas y 2 cañones de confetti de aire comprimido.', icon: 'sparkles' },
            { name: 'Set de Gala (30)', desc: 'Antifaces, collares, manillas y pitos especializados.', icon: 'ghost' }
        ],
        price: 70000,
        img: 'acc_777.png',
        tags: ['Premium'],
        requiredRoles: [],
        materialArea: ['ACCESORIOS']
    },
    {
        id: 'paquete_plata',
        category: 'paquetes',
        name: 'ONIX',
        desc: 'Sonido Essential + Foto + Cámara 360° + Accesorios 111.',
        longDesc: 'Fusión integral: resolvemos el registro, la atmósfera sonora y la animación base en un solo protocolo técnico.',
        includesDetail: [
            { name: 'Sonido & DJ', desc: '4 horas de DJ Crossover con sonido profesional calibrado.', icon: 'music' },
            { name: 'Registro 360°', desc: '2 horas de estación videobooth 360 con plataforma XL.', icon: 'rotate-3d' },
            { name: 'Fotografía', desc: '4 horas de cobertura con entrega inmediata en MicroSD.', icon: 'camera' },
            { name: 'Accesorios 111', desc: 'Espumas, manillas neón y pitos para animación de pista.', icon: 'zap' }
        ],
        modules: ['audiovisual', 'foto_pro', 'camara_360', 'acc_essential'],
        price: 1220000,
        img: 'nexus_plata.png',
        tags: ['Nexus Onix'],
        requiredRoles: ['dj', 'foto', 'logistica'],
        materialArea: ['DJ', 'PHOTO', 'VIDEO360', 'ACCESORIOS']
    },
    {
        id: 'paquete_elite',
        category: 'paquetes',
        name: 'MULTII',
        desc: 'Paquete Onix + Decoración Ónix + Accesorios 444.',
        longDesc: 'Equilibrio perfecto: sumamos la estética visual y una carga mayor de accesorios a la potencia técnica del paquete Onix.',
        includesDetail: [
            { name: 'Protocolo Onix', desc: 'Sonido Pro, DJ, Foto, Cámara 360 y Accesorios 111.', icon: 'check-circle' },
            { name: 'Decoración Ónix', desc: 'Arco de globos premium y fondo shimmer decorativo.', icon: 'sparkles' },
            { name: 'Accesorios 444', desc: 'Dúo de espumas, collares hawaianos y más accesorios neón.', icon: 'flower' }
        ],
        modules: ['audiovisual', 'foto_pro', 'camara_360', 'decor_onix', 'acc_memories'],
        price: 1440000,
        img: 'onix_balloons_final.png',
        tags: ['Popular'],
        requiredRoles: ['dj', 'foto', 'decor', 'logistica'],
        materialArea: ['DJ', 'PHOTO', 'VIDEO360', 'DECORACIÓN', 'ACCESORIOS']
    },
    {
        id: 'paquete_diamond',
        category: 'paquetes',
        name: 'KAIZEN',
        desc: 'Sonido Essential + Foto + Cámara 360° + Decoración Kaizen + Maquillaje + Accesorios 777.',
        longDesc: 'Experiencia total: el zenit de NEXXA que unifica todas nuestras dimensiones de servicio.',
        includesDetail: [
            { name: 'Sonido, DJ, 360° y Fotos', desc: 'Protocolo Orbit: Sonido Pro, DJ en vivo, Cámara 360 y Fotografíá.', icon: 'crown' },
            { name: 'Maquillaje UV', desc: '2 horas de maquillaje neón artístico para invitados.', icon: 'palette' },
            { name: 'Accesorios 777', desc: 'Arsenal completo de props, espumas y cañones de confetti.', icon: 'zap' }
        ],
        modules: ['audiovisual', 'foto_pro', 'camara_360', 'decor_kaizen', 'maquillaje_neon', 'acc_celebration'],
        price: 1940000,
        img: 'kaizen_gold_fabric_final.png',
        tags: ['Zenit Protocol'],
        requiredRoles: ['dj', 'foto', 'decor', 'logistica'],
        materialArea: ['DJ', 'PHOTO', 'VIDEO360', 'DECORACIÓN', 'ACCESORIOS']
    }
];

async function migrate() {
    console.log("Migrando catálogo...");
    try {
        await setDoc(doc(db, 'app_config', 'catalog'), {
            updatedAt: new Date().toISOString(),
            services: services
        });
        console.log("Migración exitosa.");
    } catch (e) {
        console.error("Error migrando:", e);
    }
}

migrate();
