export const packages = [
  {
    id: 'essential',
    name: 'ESSENTIAL',
    price: 450000,
    features: [
      '<strong>Servicio por 4 Horas</strong>',
      '2 Cabinas de Sonido Potenciadas',
      'DJ Crossover (Mezcla en vivo)',
      '4 Luces Rítmicas LED',
      'Cámara de Humo (Efectos)',
      'Micrófono para Animación'
    ],
    highlight: false
  },
  {
    id: 'memories',
    name: 'MEMORIES',
    price: 650000,
    features: [
      '<strong>Servicio por 4 Horas</strong>',
      '2 Cabinas de Sonido Potenciadas',
      'DJ Crossover (Mezcla en vivo)',
      '4 Luces Rítmicas LED',
      'Cámara de Humo (Efectos)',
      'Micrófono para Animación',
      '<strong>Servicio de Fotografía</strong>'
    ],
    highlight: true // Recommended
  },
  {
    id: 'celebration',
    name: 'CELEBRATION',
    price: 850000,
    features: [
      '<strong>Servicio por 4 Horas</strong>',
      '2 Cabinas de Sonido Potenciadas',
      'DJ Crossover (Mezcla en vivo)',
      '4 Luces Rítmicas LED',
      'Cámara de Humo (Efectos)',
      'Micrófono para Animación',
      '<strong>Servicio de Fotografía</strong>',
      '<strong>Decoración con Globos</strong>'
    ],
    highlight: false
  }
];

export const extras = [
  {
    id: 'extra_hour',
    name: 'Hora Adicional de Evento',
    desc: 'Extiende la duración de los servicios contratados.',
    price: 0 // Will be calculated dynamically
  },
  {
    id: 'makeup',
    name: 'Maquillaje Neón',
    desc: 'Incluye pinturas y maquillador por 2 horas.',
    price: 120000
  },
  {
    id: 'acc_essential',
    name: 'Accesorios Essential',
    desc: 'Incluye 1 Espuma, 50 Manillas Neón, 25 Pitos Espantasuegras.',
    price: 80000
  },
  {
    id: 'acc_memories',
    name: 'Accesorios Memories',
    desc: 'Incluye 2 Espumas, 50 Manillas Neón, 50 Pitos Espantasuegras, 2 Cañones.',
    price: 160000
  },
  {
    id: 'acc_celebration',
    name: 'Accesorios Celebration',
    desc: 'Incluye 3 Espumas, 25 Manillas Neón, 50 Pitos Espantasuegras, 50 Collares Hawaianos, 50 Antifaces, 3 cañones.',
    price: 280000
  }
];
