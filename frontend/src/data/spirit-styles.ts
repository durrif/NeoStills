// frontend/src/data/spirit-styles.ts
// Base de datos de estilos de destilados para NeoStills v2

export interface SpiritStyle {
  id: string
  name: string
  category: 'whisky' | 'gin' | 'brandy' | 'rum' | 'vodka' | 'aguardiente' | 'mezcal' | 'other'
  description_es: string
  raw_materials: string[]      // materias primas tipicas
  fermentable_types: string[]  // keys de FERMENTABLE_DATABASE
  distillation_method: 'pot_still' | 'column_still' | 'reflux_still' | 'alembic' | 'mixed'
  typical_wash_abv: [number, number]  // [min, max] %
  target_abv_range: [number, number]  // [min, max] % destilado final
  aging_required: boolean
  botanicals_used: boolean
  regulations_note?: string
}

export const SPIRIT_STYLES: SpiritStyle[] = [
  // ── Whiskies ──────────────────────────────────────────────
  { id: 'bourbon', name: 'Bourbon Whiskey', category: 'whisky',
    description_es: 'Whisky americano de maiz (min 51%). Pot still o column. Barrica de roble americano nueva.',
    raw_materials: ['Maiz', 'Centeno', 'Cebada malteada'],
    fermentable_types: ['maiz', 'centeno', 'cebada_malteada'],
    distillation_method: 'pot_still', typical_wash_abv: [7, 10], target_abv_range: [62, 80],
    aging_required: true, botanicals_used: false,
    regulations_note: 'Min 51% maiz. Destilado maximo 80% ABV. Entrada en barrica max 62.5% ABV.' },
  { id: 'single_malt', name: 'Single Malt Whisky', category: 'whisky',
    description_es: 'Whisky de cebada malteada 100%, pot still, de una sola destileria.',
    raw_materials: ['Cebada malteada'],
    fermentable_types: ['cebada_malteada'],
    distillation_method: 'pot_still', typical_wash_abv: [7, 9], target_abv_range: [63, 70],
    aging_required: true, botanicals_used: false },
  { id: 'rye_whisky', name: 'Rye Whisky', category: 'whisky',
    description_es: 'Whisky de centeno con caracter especiado. Popular en Canada y USA.',
    raw_materials: ['Centeno', 'Cebada malteada'],
    fermentable_types: ['centeno', 'cebada_malteada'],
    distillation_method: 'pot_still', typical_wash_abv: [7, 10], target_abv_range: [60, 75],
    aging_required: true, botanicals_used: false },
  // ── Gins ──────────────────────────────────────────────────
  { id: 'london_dry_gin', name: 'London Dry Gin', category: 'gin',
    description_es: 'Gin redistilado con botanicos naturales. Sin azucar anadido antes del embotellado.',
    raw_materials: ['Alcohol neutro de cereales'],
    fermentable_types: ['trigo', 'cebada_malteada'],
    distillation_method: 'pot_still', typical_wash_abv: [0, 0], target_abv_range: [70, 96],
    aging_required: false, botanicals_used: true,
    regulations_note: 'Min 37.5% ABV final. Solo aromas naturales. Sin colorantes.' },
  { id: 'contemporary_gin', name: 'Contemporary / New Western Gin', category: 'gin',
    description_es: 'Gin moderno donde el junipero no es dominante. Mayor libertad botanica.',
    raw_materials: ['Alcohol neutro'],
    fermentable_types: ['trigo', 'maiz'],
    distillation_method: 'pot_still', typical_wash_abv: [0, 0], target_abv_range: [40, 60],
    aging_required: false, botanicals_used: true },
  // ── Brandies ──────────────────────────────────────────────
  { id: 'brandy_uva', name: 'Brandy de Uva', category: 'brandy',
    description_es: 'Destilado de vino de uva. Incluye Cognac, Armagnac y brandies regionales.',
    raw_materials: ['Uva vinera'],
    fermentable_types: ['uva'],
    distillation_method: 'pot_still', typical_wash_abv: [8, 12], target_abv_range: [60, 75],
    aging_required: true, botanicals_used: false },
  { id: 'calvados', name: 'Calvados / Apple Brandy', category: 'brandy',
    description_es: 'Brandy de manzana (y pera) normando. Pot still. Minimo 2 anos en barrica.',
    raw_materials: ['Manzana de sidra', 'Pera'],
    fermentable_types: ['manzana'],
    distillation_method: 'pot_still', typical_wash_abv: [6, 9], target_abv_range: [60, 72],
    aging_required: true, botanicals_used: false },
  // ── Rones ──────────────────────────────────────────────────
  { id: 'white_rum', name: 'White Rum / Ron Blanco', category: 'rum',
    description_es: 'Ron ligero de melaza de cana. Column still. Poco o nada de crianza.',
    raw_materials: ['Melaza de cana', 'Jugo de cana'],
    fermentable_types: ['melaza'],
    distillation_method: 'column_still', typical_wash_abv: [8, 12], target_abv_range: [65, 96],
    aging_required: false, botanicals_used: false },
  { id: 'agricole_rum', name: 'Rhum Agricole', category: 'rum',
    description_es: 'Ron de jugo fresco de cana. Caracter vegetal y complejo. Pot still o hybrid.',
    raw_materials: ['Jugo fresco de cana de azucar'],
    fermentable_types: ['melaza'],
    distillation_method: 'pot_still', typical_wash_abv: [10, 14], target_abv_range: [65, 75],
    aging_required: false, botanicals_used: false },
  // ── Vodkas ────────────────────────────────────────────────
  { id: 'grain_vodka', name: 'Vodka de Cereales', category: 'vodka',
    description_es: 'Vodka neutro de cereales (trigo, maiz, centeno). Redistilacion multiple.',
    raw_materials: ['Trigo', 'Maiz', 'Centeno'],
    fermentable_types: ['trigo', 'maiz', 'centeno'],
    distillation_method: 'column_still', typical_wash_abv: [8, 12], target_abv_range: [90, 96],
    aging_required: false, botanicals_used: false },
  // ── Aguardientes ──────────────────────────────────────────
  { id: 'orujo', name: 'Orujo / Grappa', category: 'aguardiente',
    description_es: 'Aguardiente de orujo de uva (hollejos, pepitas, rabillos fermentados).',
    raw_materials: ['Orujo de uva fermentado'],
    fermentable_types: ['uva'],
    distillation_method: 'alembic', typical_wash_abv: [3, 7], target_abv_range: [50, 72],
    aging_required: false, botanicals_used: false },
  { id: 'mezcal', name: 'Mezcal / Tequila', category: 'mezcal',
    description_es: 'Destilado de agave cocido. Terroir unico, produccion artesanal.',
    raw_materials: ['Agave cocido y fermentado'],
    fermentable_types: ['otro'],
    distillation_method: 'alembic', typical_wash_abv: [4, 8], target_abv_range: [40, 55],
    aging_required: false, botanicals_used: false },
]

export const SPIRIT_CATEGORIES = [
  { id: 'whisky', label_es: 'Whisky', icon: '🥃' },
  { id: 'gin', label_es: 'Gin', icon: '🌿' },
  { id: 'brandy', label_es: 'Brandy', icon: '🍇' },
  { id: 'rum', label_es: 'Ron', icon: '🍬' },
  { id: 'vodka', label_es: 'Vodka', icon: '❄️' },
  { id: 'aguardiente', label_es: 'Aguardiente', icon: '🌾' },
  { id: 'mezcal', label_es: 'Mezcal', icon: '🌵' },
  { id: 'other', label_es: 'Otro', icon: '🧪' },
] as const
