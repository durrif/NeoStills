// frontend/src/data/cereals.ts
// Base de datos de cereales y materias primas fermentables — NeoStills v2

export interface CerealSpec {
  id: string
  name: string
  name_es: string
  category: 'grain' | 'fruit' | 'sugar' | 'other'
  typical_sugar_pct: number
  gelatinization_temp_c: number
  saccharification_temp_c: number
  requires_enzymes: boolean
  spirits_affinity: string[]   // tipos de destilado donde se usa
  flavor_contribution: string[]
  notes_es: string
}

export const CEREAL_DATABASE: CerealSpec[] = [
  { id: 'maiz', name: 'Corn / Maize', name_es: 'Maiz',
    category: 'grain', typical_sugar_pct: 72, gelatinization_temp_c: 75, saccharification_temp_c: 63.5,
    requires_enzymes: true, spirits_affinity: ['bourbon', 'grain_vodka'],
    flavor_contribution: ['Sweet', 'Neutral', 'Creamy'],
    notes_es: 'Cereal base del bourbon. Requiere gelatinizacion y enzimas externas.' },
  { id: 'cebada_malteada', name: 'Malted Barley', name_es: 'Cebada malteada',
    category: 'grain', typical_sugar_pct: 78, gelatinization_temp_c: 52, saccharification_temp_c: 64,
    requires_enzymes: false, spirits_affinity: ['single_malt', 'bourbon', 'rye_whisky'],
    flavor_contribution: ['Malty', 'Biscuity', 'Complex', 'Nutty'],
    notes_es: 'Enzimas propias (alfa y beta-amilasa). Fuente de enzimas para otros cereales.' },
  { id: 'centeno', name: 'Rye', name_es: 'Centeno',
    category: 'grain', typical_sugar_pct: 68, gelatinization_temp_c: 60, saccharification_temp_c: 63.5,
    requires_enzymes: true, spirits_affinity: ['rye_whisky', 'bourbon'],
    flavor_contribution: ['Spicy', 'Earthy', 'Peppery', 'Dry'],
    notes_es: 'Caracter especiado caracteristico. Alto contenido en beta-glucanos, macerado dificil.' },
  { id: 'trigo', name: 'Wheat', name_es: 'Trigo',
    category: 'grain', typical_sugar_pct: 75, gelatinization_temp_c: 58, saccharification_temp_c: 63,
    requires_enzymes: true, spirits_affinity: ['grain_vodka', 'london_dry_gin'],
    flavor_contribution: ['Bread', 'Clean', 'Neutral', 'Soft'],
    notes_es: 'Base de vodka premium y alcohol neutro para gin. Requiere agitacion constante.' },
  { id: 'melaza', name: 'Sugarcane Molasses', name_es: 'Melaza de cana',
    category: 'sugar', typical_sugar_pct: 55, gelatinization_temp_c: 0, saccharification_temp_c: 0,
    requires_enzymes: false, spirits_affinity: ['white_rum', 'dark_rum'],
    flavor_contribution: ['Sweet', 'Caramel', 'Tropical', 'Rich'],
    notes_es: 'No requiere macerado. Fermentacion directa con levadura rum.' },
  { id: 'uva', name: 'Grape / Wine', name_es: 'Uva / Mosto',
    category: 'fruit', typical_sugar_pct: 18, gelatinization_temp_c: 0, saccharification_temp_c: 0,
    requires_enzymes: false, spirits_affinity: ['brandy_uva', 'orujo'],
    flavor_contribution: ['Fruity', 'Floral', 'Wine', 'Complex'],
    notes_es: 'Usar Brix del mosto fresco. Fermentacion con levadura de vino.' },
  { id: 'manzana', name: 'Apple / Cider', name_es: 'Manzana / Sidra',
    category: 'fruit', typical_sugar_pct: 12, gelatinization_temp_c: 0, saccharification_temp_c: 0,
    requires_enzymes: false, spirits_affinity: ['calvados'],
    flavor_contribution: ['Apple', 'Fruity', 'Floral', 'Fresh'],
    notes_es: 'Usar manzanas de sidra (alta acidez, tanino). Fermentacion lenta a baja temperatura.' },
]
