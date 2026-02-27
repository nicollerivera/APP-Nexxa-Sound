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
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') return 0;
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    return diffMinutes / 60;
  } catch (e) { return 0; }
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
export const getDynamicExtras = (guests, userMakeupCount) => {
  const g = Math.max(10, Number(guests) || 10);

  // Costos Unitarios (Sync with Client App)
  const C_FOAM = 13000;
  const C_CANNON = 5000;
  const C_BLOWOUT = 200;
  const C_BRACELET = 400;
  const C_NECKLACE = 400;
  const C_MASK = 400;

  // 1. Maquillaje (1 por cada 50 invitados O manual)
  const recommendedMakeup = Math.ceil(g / 50);
  const qty = (typeof userMakeupCount === 'number') ? userMakeupCount : recommendedMakeup;
  const makeupPrice = qty * 120000;

  // 2. Accesorios Essential
  const rawEssential = C_FOAM + (g * (C_BLOWOUT + C_BRACELET));
  const priceEssential = Math.round(rawEssential / 5000) * 5000;

  // 3. Accesorios Memories
  const rawMemories = (2 * C_FOAM) + (2 * C_CANNON) + (g * (C_BLOWOUT + C_BRACELET));
  const priceMemories = Math.round(rawMemories / 5000) * 5000;

  // 4. Accesorios Celebration
  const rawCelebration = (3 * C_FOAM) + (3 * C_CANNON) + (g * (C_BLOWOUT + C_BRACELET + C_NECKLACE + C_MASK));
  const priceCelebration = Math.round(rawCelebration / 5000) * 5000;

  return [
    {
      id: 'extra_makeup',
      name: `Maquillaje Neón`,
      price: makeupPrice,
      qty: qty,
      isMakeup: true,
      area: 'Photo',
      details: `${qty} Artista(s) (1 por c/50 invitados)`
    },
    {
      id: 'acc_essential',
      name: 'Accesorios Essential',
      price: priceEssential,
      area: 'Decor',
      details: `1 Espuma + (${g} Pitos, ${g} Manillas)`
    },
    {
      id: 'acc_memories',
      name: 'Accesorios Memories',
      price: priceMemories,
      area: 'Decor',
      details: `2 Espumas, 2 Cañones + (${g} Pitos, ${g} Manillas)`
    },
    {
      id: 'acc_celebration',
      name: 'Accesorios Celebration',
      price: priceCelebration,
      area: 'Decor',
      details: `3 Espumas, 3 Cañones + (${g} de: Pitos, Manillas, Collares, Antifaces)`
    }
  ];
};

export const getClientName = (evt) => {
  if (!evt) return 'Cliente';
  if (typeof evt.client === 'string') return evt.client;
  return evt.client?.name || evt.clientName || 'Cliente';
};
