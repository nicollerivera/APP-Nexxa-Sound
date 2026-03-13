export const packages = [
  {
    id: 'essential',
    name: 'ESSENTIAL',
    price: 450000,
    features: [
      'Cabinas profesionales',
      'DJ Crossover en vivo',
      '4 Luces LED',
      'Cámara de Humo',
      '2 micrófonos inalámbricos'
    ],
    highlight: false,
    imageUrl: '/essential_realistic.png'
  },
  {
    id: 'memories',
    name: 'MEMORIES',
    price: 650000,
    features: [
      'Cabinas de sonido profesional',
      'DJ Crossover (Mezcla en vivo)',
      '4 Luces Rítmicas LED',
      'Cámara de Humo (Efectos)',
      '2 Micrófonos Inalámbricos',
      '<strong>Servicio de Fotografía</strong>'
    ],
    highlight: true, // Recommended
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'celebration',
    name: 'CELEBRATION',
    price: 850000,
    features: [
      'Cabinas de sonido profesional',
      'DJ Crossover (Mezcla en vivo)',
      '4 Luces Rítmicas LED',
      'Cámara de Humo (Efectos)',
      '2 Micrófonos Inalámbricos',
      '<strong>Servicio de Fotografía</strong>',
      '<strong>Decoración con Globos</strong>'
    ],
    highlight: false,
    imageUrl: '/celebration_realistic.png'
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
    price: 120000,
    imageUrl: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'acc_essential',
    name: 'Accesorios Essential',
    desc: 'Incluye 1 Espuma, 50 Manillas Neón, 25 Pitos Espantasuegras.',
    price: 80000,
    imageUrl: 'https://images.unsplash.com/photo-1549413187-052bcdec3413?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'acc_memories',
    name: 'Accesorios Memories',
    desc: 'Incluye 2 Espumas, 50 Manillas Neón, 50 Pitos Espantasuegras, 50 Collares Hawaianos.',
    price: 160000,
    imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd458ad20?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'acc_celebration',
    name: 'Accesorios Celebration',
    desc: 'Incluye 3 Espumas, 25 Manillas Neón, 50 Pitos Espantasuegras, 50 Collares Hawaianos, 50 Antifaces, 3 cañones.',
    price: 280000,
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=400'
  }
];
