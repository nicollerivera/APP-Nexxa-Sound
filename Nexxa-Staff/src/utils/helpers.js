// --- HELPERS ---
export const formatPeso = (amount) => {
  try {
    const val = Number(amount) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  } catch (e) {
    return '$ 0';
  }
};


export const formatInputNumber = (val) => {
  if (!val && val !== 0) return '';
  const num = String(val).replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('es-CO');
};

export const parseInputNumber = (val) => {
  return String(val).replace(/\D/g, '');
};

export const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const getHours = (start, end) => {
  if (!start || !end) return 0;

  const parse = (str) => {
    if (typeof str !== 'string') return [0, 0];
    // Extraer solo los números
    const parts = str.match(/\d+/g);
    if (!parts || parts.length < 1) return [0, 0];

    let h = parseInt(parts[0], 10);
    let m = parts.length > 1 ? parseInt(parts[1], 10) : 0;

    // Si contiene PM y no es 12, sumar 12
    if (/PM/i.test(str) && h < 12) h += 12;
    // Si contiene AM y es 12, a 0
    if (/AM/i.test(str) && h === 12) h = 0;

    return [h, m];
  };

  try {
    const [h1, m1] = parse(start);
    const [h2, m2] = parse(end);

    let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    // Si termina al día siguiente
    if (diffMinutes < 0) diffMinutes += 24 * 60;

    return diffMinutes / 60;
  } catch (e) {
    return 0;
  }
};

export const parseLocalStrDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return new Date();
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  } catch (e) { return new Date(); }
};

export const parseFirestoreDate = (date) => {
  if (!date) return new Date();
  try {
    if (date.toDate) return date.toDate();
    if (typeof date === 'string' && date.includes('-')) return parseLocalStrDate(date);
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) { return new Date(); }
};
export const formatT = (t) => {
  if (!t || typeof t !== 'string' || !t.includes(':')) return '--:--';
  try {
    let [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '--:--';
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  } catch (e) { return '--:--'; }
};

export const subtractMinutes = (timeStr, minutesToSub) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return '--:--';
  try {
    let [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '--:--';
    let totalMin = h * 60 + m;
    totalMin -= minutesToSub;
    if (totalMin < 0) totalMin += 24 * 60;
    totalMin = totalMin % (24 * 60);
    const newH = Math.floor(totalMin / 60);
    const newM = totalMin % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  } catch (e) { return '--:--'; }
};
export const addMinutes = (timeStr, minutesToAdd) => {
  return subtractMinutes(timeStr, -minutesToAdd);
};

export const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const getDynamicExtras = (guests, makeupCount, extraQtys = {}) => {
  const g = Math.max(10, Number(guests) || 10);
  const accMultiplier = Math.ceil(g / 10);

  // 1. Maquillaje (Manual or suggest 1 per 50)
  const recommendedMakeup = Math.ceil(g / 50);
  const mQty = (typeof makeupCount === 'number') ? makeupCount : recommendedMakeup;
  // Stitch pricing: 150k per artist
  const makeupPrice = 150000; 

  const items = [
    {
      id: 'maquillaje_neon',
      name: `Maquillaje Neón`,
      price: makeupPrice,
      qty: mQty,
      isMakeup: true,
      category: 'Servicios',
      details: `${mQty} Artista(s) (1 por c/50 invitados)`
    },
    // KITS (Calculated by Pax/10)
    {
      id: 'acc_essential',
      name: 'Accesorios 111 (Base)',
      price: 111000 * accMultiplier,
      category: 'Kits',
      details: `Incluye ${111 * accMultiplier} items | Sugerido para ${g} pax.`
    },
    {
      id: 'acc_memories',
      name: 'Accesorios 444 (Pro)',
      price: 444000 * accMultiplier,
      category: 'Kits',
      details: `Incluye ${444 * accMultiplier} items | Sugerido para ${g} pax.`
    },
    {
      id: 'acc_celebration',
      name: 'Accesorios 777 (Premium)',
      price: 777000 * accMultiplier,
      category: 'Kits',
      details: `Incluye ${777 * accMultiplier} items | Sugerido para ${g} pax.`
    },
    // INDIVIDUAL ITEMS (Manual Qty)
    {
      id: 'acc_espuma',
      name: 'Espuma',
      price: 13000,
      qty: extraQtys['acc_espuma'] || 1,
      isItem: true,
      category: 'Artículos',
      details: 'Lata de espuma para animación.'
    },
    {
      id: 'acc_canon',
      name: 'Cañón de Confeti',
      price: 5000,
      qty: extraQtys['acc_canon'] || 1,
      isItem: true,
      category: 'Artículos',
      details: 'Cañón manual de confeti o CO2.'
    },
    {
      id: 'acc_manilla',
      name: 'Manilla Neón',
      price: 400,
      qty: extraQtys['acc_manilla'] || 1,
      isItem: true,
      category: 'Artículos',
      details: 'Manilla reactiva luz UV.'
    },
    {
      id: 'acc_antifaz',
      name: 'Antifaz',
      price: 300,
      qty: extraQtys['acc_antifaz'] || 1,
      isItem: true,
      category: 'Artículos',
      details: 'Antifaz de cartón decorado.'
    },
    {
      id: 'acc_collar',
      name: 'Collar Hawaiano',
      price: 400,
      qty: extraQtys['acc_collar'] || 1,
      isItem: true,
      category: 'Artículos',
      details: 'Collar de flores sintéticas.'
    },
    {
      id: 'acc_pito',
      name: 'Pito',
      price: 200,
      qty: extraQtys['acc_pito'] || 1,
      isItem: true,
      category: 'Artículos',
      details: 'Silbato plástico para rumba.'
    }
  ];

  return items;
};

export const getClientName = (evt) => {
  if (!evt) return 'Cliente';
  if (typeof evt.client === 'string') return evt.client;
  return evt.client?.name || evt.clientName || 'Cliente';
};
