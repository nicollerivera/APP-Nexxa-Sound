export const formatPeso = (amount) => {
  const value = Number(amount);
  if (isNaN(value)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};


export const formatInputNumber = (val) => {
  if (!val && val !== 0) return '';
  const num = Math.round(Number(String(val).replace(/\D/g, '')));
  if (isNaN(num)) return '';
  return num.toLocaleString('es-CO');
};

export const parseInputNumber = (val) => {
  return String(val).replace(/\D/g, '');
};

export const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const getHours = (start, end) => {
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string' || !start.includes(':') || !end.includes(':')) return 0;
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    return diffMinutes / 60;
  } catch (e) {
    return 0;
  }
};

export const parseLocalStrDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  // Safe ISO parsing (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...)
  const dateOnly = dateStr.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
  return new Date(year, month - 1, day);
};

export const parseFirestoreDate = (date) => {
  if (!date) return new Date(0);
  if (date.toDate) return date.toDate();
  if (typeof date === 'string') {
    if (date.includes('T')) return new Date(date);
    if (date.includes('-')) return parseLocalStrDate(date);
  }
  return new Date(date);
};
export const formatT = (t) => {
  if (!t || typeof t !== 'string' || !t.includes(':')) return '--:--';
  let [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '--:--';
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};

export const subtractMinutes = (timeStr, minutesToSub) => {
  if (!timeStr || !timeStr.includes(':')) return '--:--';
  let [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '--:--';
  let totalMin = h * 60 + m;
  totalMin -= minutesToSub;
  if (totalMin < 0) totalMin += 24 * 60;
  totalMin = totalMin % (24 * 60);
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
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
