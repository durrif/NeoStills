// frontend/src/data/botanicals.ts
// Base de datos de botanicos para ginebra y destilados de hierbas — NeoStills v2

export interface BotanicalSpec {
  id: string
  name: string
  name_es: string
  category: 'root' | 'berry' | 'citrus' | 'spice' | 'herb' | 'flower' | 'seed' | 'bark'
  typical_dose_g_per_liter: [number, number]  // [min, max] g/L de alcohol neutro
  flavor_profile: string[]
  volatile: boolean           // Si necesita cold compound (no vapor basket)
  distillation_method: 'vapor' | 'maceration' | 'both'
  maceration_hours?: [number, number]  // [min, max]
  notes: string
}

export const BOTANICAL_DATABASE: BotanicalSpec[] = [
  // Raices / Roots
  { id: 'juniper', name: 'Juniper Berries', name_es: 'Bayas de junipero (enebro)', category: 'berry',
    typical_dose_g_per_liter: [10, 30], flavor_profile: ['Pine', 'Resinous', 'Citrus', 'Earthy'],
    volatile: false, distillation_method: 'both', maceration_hours: [12, 48],
    notes: 'Botanico base del gin. Requiere presencia dominante. Aplasta ligeramente antes de usar.' },
  { id: 'angelica_root', name: 'Angelica Root', name_es: 'Raiz de angelica', category: 'root',
    typical_dose_g_per_liter: [0.5, 2], flavor_profile: ['Earthy', 'Woody', 'Musky', 'Herbal'],
    volatile: false, distillation_method: 'both', maceration_hours: [24, 72],
    notes: 'Fijador natural de aromas. Aporta cuerpo y estabiliza otros botanicos.' },
  { id: 'orris_root', name: 'Orris Root', name_es: 'Raiz de lirio de Florencia', category: 'root',
    typical_dose_g_per_liter: [0.5, 1.5], flavor_profile: ['Floral', 'Violet', 'Waxy', 'Earthy'],
    volatile: false, distillation_method: 'both', maceration_hours: [24, 48],
    notes: 'Fijador floral clasico. Muy poca cantidad. Base de muchos gins londinenses.' },
  { id: 'liquorice_root', name: 'Liquorice Root', name_es: 'Raiz de regaliz', category: 'root',
    typical_dose_g_per_liter: [0.3, 1.5], flavor_profile: ['Sweet', 'Anise', 'Woody'],
    volatile: false, distillation_method: 'both', maceration_hours: [12, 24],
    notes: 'Aporta dulzor sin azucar y redondea el paladar. Usar con moderacion.' },
  // Citricos / Citrus
  { id: 'lemon_peel', name: 'Lemon Peel', name_es: 'Corteza de limon', category: 'citrus',
    typical_dose_g_per_liter: [2, 10], flavor_profile: ['Citrus', 'Bright', 'Fresh', 'Zesty'],
    volatile: true, distillation_method: 'vapor', maceration_hours: [1, 4],
    notes: 'Solo la parte amarilla, sin albedo blanco. Los aceites esenciales son muy volatiles.' },
  { id: 'orange_peel', name: 'Orange Peel', name_es: 'Corteza de naranja', category: 'citrus',
    typical_dose_g_per_liter: [2, 8], flavor_profile: ['Orange', 'Sweet citrus', 'Marmalade'],
    volatile: true, distillation_method: 'vapor', maceration_hours: [1, 4],
    notes: 'La naranja dulce aporta redondez. La amarga (Curacao) da mas complejidad.' },
  // Especias / Spices
  { id: 'coriander_seed', name: 'Coriander Seed', name_es: 'Semilla de cilantro', category: 'seed',
    typical_dose_g_per_liter: [2, 8], flavor_profile: ['Citrus', 'Lemony', 'Spicy', 'Herbal'],
    volatile: false, distillation_method: 'both', maceration_hours: [12, 24],
    notes: 'Segundo botanico mas comun en gin tras el junipero. Aplasta antes de usar.' },
  { id: 'cardamom', name: 'Cardamom', name_es: 'Cardamomo verde', category: 'spice',
    typical_dose_g_per_liter: [0.5, 2], flavor_profile: ['Spice', 'Eucalyptus', 'Mint', 'Sweet'],
    volatile: false, distillation_method: 'both', maceration_hours: [6, 24],
    notes: 'Muy potente. Comenzar con 0.5 g/L y ajustar. Usar vaina entera o semillas.' },
  { id: 'black_pepper', name: 'Black Pepper', name_es: 'Pimienta negra', category: 'spice',
    typical_dose_g_per_liter: [0.3, 1.5], flavor_profile: ['Spicy', 'Woody', 'Earthy'],
    volatile: false, distillation_method: 'both', maceration_hours: [6, 12],
    notes: 'Aporta picor seco en el final. Mejor ligeramente aplastada.' },
  { id: 'cassia_bark', name: 'Cassia Bark', name_es: 'Corteza de canela cassia', category: 'bark',
    typical_dose_g_per_liter: [0.5, 2], flavor_profile: ['Cinnamon', 'Warm', 'Spicy', 'Sweet'],
    volatile: false, distillation_method: 'both', maceration_hours: [12, 36],
    notes: 'Canela china mas intensa que la ceylan. Usar en fragmentos pequeños.' },
  // Flores / Flowers
  { id: 'lavender', name: 'Lavender', name_es: 'Lavanda', category: 'flower',
    typical_dose_g_per_liter: [0.3, 1.5], flavor_profile: ['Floral', 'Herbal', 'Medicinal', 'Perfumed'],
    volatile: true, distillation_method: 'vapor', maceration_hours: [1, 4],
    notes: 'Muy volatil y dominante. Exceso da sabor a jabon. Preferir vapor basket.' },
  { id: 'chamomile', name: 'Chamomile Flowers', name_es: 'Flores de manzanilla', category: 'flower',
    typical_dose_g_per_liter: [1, 4], flavor_profile: ['Floral', 'Apple', 'Sweet', 'Honey'],
    volatile: true, distillation_method: 'vapor', maceration_hours: [2, 8],
    notes: 'Sabor delicado. Cuidado con sobremacer que puede volverse amarga.' },
  // Hierbas / Herbs
  { id: 'rosemary', name: 'Rosemary', name_es: 'Romero', category: 'herb',
    typical_dose_g_per_liter: [0.5, 2], flavor_profile: ['Herbal', 'Pine', 'Camphor', 'Mediterranean'],
    volatile: true, distillation_method: 'vapor', maceration_hours: [2, 6],
    notes: 'Botanico mediterraneo excelente. Compatible con citricos y enebro.' },
  { id: 'thyme', name: 'Thyme', name_es: 'Tomillo', category: 'herb',
    typical_dose_g_per_liter: [0.5, 1.5], flavor_profile: ['Herbal', 'Earthy', 'Camphor'],
    volatile: true, distillation_method: 'vapor', maceration_hours: [2, 6],
    notes: 'Aporta caracter herbal mediterraneo. Combina bien con limon y enebro.' },
  { id: 'lemongrass', name: 'Lemongrass', name_es: 'Limonaria (hierba limon)', category: 'herb',
    typical_dose_g_per_liter: [1, 4], flavor_profile: ['Citrus', 'Lemon', 'Ginger', 'Herbal'],
    volatile: true, distillation_method: 'vapor', maceration_hours: [2, 8],
    notes: 'Aroma citrico tropical fresco. Muy usado en gins contemporaneos.' },
]

export const BOTANICAL_CATEGORIES = [
  { id: 'root', label_es: 'Raices', label_en: 'Roots' },
  { id: 'berry', label_es: 'Bayas', label_en: 'Berries' },
  { id: 'citrus', label_es: 'Citricos', label_en: 'Citrus' },
  { id: 'spice', label_es: 'Especias', label_en: 'Spices' },
  { id: 'herb', label_es: 'Hierbas', label_en: 'Herbs' },
  { id: 'flower', label_es: 'Flores', label_en: 'Flowers' },
  { id: 'seed', label_es: 'Semillas', label_en: 'Seeds' },
  { id: 'bark', label_es: 'Cortezas', label_en: 'Barks' },
] as const
