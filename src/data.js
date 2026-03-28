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
  },
  {
    id: 'onix',
    name: 'ONIX',
    price: 1250000,
    features: [
      'Sonido e Iluminación Pro',
      'DJ Crossover en vivo',
      '<strong>Servicio de Fotografía</strong>',
      '<strong>Cámara 360</strong>',
      '<strong>Accesorios Especiales</strong>',
      'Audiovisuales (Pantalla/Video)'
    ],
    highlight: false,
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'multii',
    name: 'MULTII',
    price: 1650000,
    features: [
      'Todo lo de ONIX +',
      '<strong>Cámara 360 Aérea</strong>',
      '<strong>Decoración Multii</strong>',
      '<strong>Kits 444 (por invitados)</strong>',
      'Audiovisuales Premium'
    ],
    highlight: true,
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'kaizen',
    name: 'KAIZEN',
    price: 2250000,
    features: [
      'Experiencia Nexxa Total',
      'Montaje de Lujo',
      'Fotografía y Video 4K',
      'Decoración de Autor'
    ],
    highlight: false,
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=800'
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
    name: 'Kit 111',
    desc: 'Incluye 1 Espuma, Manillas Neón y Pitos según cantidad de invitados.',
    price: 80000,
    imageUrl: 'https://images.unsplash.com/photo-1549413187-052bcdec3413?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'acc_memories',
    name: 'Kit 444',
    desc: 'Incluye 2 Espumas, Collares, Manillas y Pitos según cantidad de invitados.',
    price: 160000,
    imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd458ad20?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'acc_celebration',
    name: 'Kit 777',
    desc: 'Incluye 3 Espumas, 3 Cañones, Antifaces, Collares, Manillas y Pitos según cantidad de invitados.',
    price: 280000,
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=400'
  }
];
