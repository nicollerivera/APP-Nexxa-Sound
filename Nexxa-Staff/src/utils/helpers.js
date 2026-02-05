// --- HELPERS ---
export const formatPeso = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const getHours = (start, end) => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  return diffMinutes / 60;
};

export const parseFirestoreDate = (date) => {
  if (!date) return new Date(); // Treat missing date as 'now' for sorting
  if (date.toDate) return date.toDate();
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
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};
