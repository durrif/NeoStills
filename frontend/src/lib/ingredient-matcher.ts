// src/lib/ingredient-matcher.ts — Distillery ingredient classification
import type { Ingredient, IngredientCategory } from '@/lib/types'

/* ── Origin Flags ──────────────────────────────────────────────────────────── */
export const ORIGIN_FLAGS: Record<string, string> = {
  DE: '🇩🇪', BE: '🇧🇪', GB: '🇬🇧', US: '🇺🇸', AU: '🇦🇺', NZ: '🇳🇿',
  CZ: '🇨🇿', IE: '🇮🇪', FR: '🇫🇷', CA: '🇨🇦', DK: '🇩🇰', NO: '🇳🇴',
  ES: '🇪🇸', NL: '🇳🇱', JP: '🇯🇵', CN: '🇨🇳', AR: '🇦🇷', ZA: '🇿🇦',
}

/** Resolve country name → flag emoji */
export function originToFlag(origin: string): string {
  const upper = origin.toUpperCase()
  const flag = ORIGIN_FLAGS[upper]
  if (flag) return flag
  const o = origin.toLowerCase()
  if (o.includes('alemania') || o.includes('germany')) return '🇩🇪'
  if (o.includes('bélgica') || o.includes('belgium')) return '🇧🇪'
  if (o.includes('reino unido') || o.includes('uk') || o.includes('england')) return '🇬🇧'
  if (o.includes('estados unidos') || o.includes('usa') || o.includes('us')) return '🇺🇸'
  if (o.includes('república checa') || o.includes('czech')) return '🇨🇿'
  if (o.includes('australia')) return '🇦🇺'
  if (o.includes('nueva zelanda') || o.includes('new zealand')) return '🇳🇿'
  if (o.includes('francia') || o.includes('france')) return '🇫🇷'
  if (o.includes('españa') || o.includes('spain')) return '🇪🇸'
  if (o.includes('holanda') || o.includes('netherlands')) return '🇳🇱'
  return '🌍'
}

/* ── Distillery ingredient types & classification ────────────────────────── */
export type DistilleryIngredientType =
  | 'cereal_fermentable'
  | 'fruit_fermentable'
  | 'botanical'
  | 'yeast'
  | 'sugar'
  | 'water_chemical'
  | 'adjunct'
  | 'other'

export type MajorCategory = 'fermentables' | 'botanicos' | 'fermentacion' | 'proceso' | 'otros'
export type Subcategory = string

export interface MatchedDistilleryIngredient {
  type: DistilleryIngredientType
  descriptorTags: string[]
  recommendedUses: string[]
  technical?: Record<string, string | number>
}

export interface MajorCategoryInfo {
  key: MajorCategory
  label: string
  color: string
  subcategories: Array<{ value: IngredientCategory; label: string; emoji: string }>
}

/** Major categories for warehouse view */
export const MAJOR_CATEGORIES: MajorCategoryInfo[] = [
  {
    key: 'fermentables',
    label: 'Fermentables',
    color: '#C78A2C',
    subcategories: [
      { value: 'cereal_base', label: 'Cereal base', emoji: '🌾' },
      { value: 'cereal_especial', label: 'Cereal especial', emoji: '🔥' },
      { value: 'fruta', label: 'Frutas', emoji: '🍎' },
      { value: 'azucar', label: 'Azúcares', emoji: '🍯' },
    ],
  },
  {
    key: 'botanicos',
    label: 'Botánicos & Infusiones',
    color: '#5F8F52',
    subcategories: [
      { value: 'botanico', label: 'Botánicos', emoji: '🌿' },
    ],
  },
  {
    key: 'fermentacion',
    label: 'Fermentación',
    color: '#FF9800',
    subcategories: [
      { value: 'levadura', label: 'Levaduras', emoji: '🔬' },
      { value: 'agua_quimica', label: 'Químicos de agua', emoji: '🧪' },
    ],
  },
  {
    key: 'proceso',
    label: 'Proceso',
    color: '#3E8FB0',
    subcategories: [
      { value: 'adjunto', label: 'Adjuntos', emoji: '🧂' },
    ],
  },
  {
    key: 'otros',
    label: 'Otros',
    color: '#607D8B',
    subcategories: [
      { value: 'otro', label: 'Otros', emoji: '📦' },
    ],
  },
]

/** Map category to major category */
export function toMajorCategory(category: IngredientCategory): MajorCategory {
  if (['cereal_base', 'cereal_especial', 'fruta', 'azucar'].includes(category as string))
    return 'fermentables'
  if (category === 'botanico') return 'botanicos'
  if (['levadura', 'agua_quimica'].includes(category as string)) return 'fermentacion'
  if (category === 'adjunto') return 'proceso'
  return 'otros'
}

/** Get info for a subcategory */
export function getSubcategoryInfo(major: MajorCategory, sub: Subcategory): { label: string; emoji: string } {
  const majorInfo = MAJOR_CATEGORIES.find(m => m.key === major)
  const subInfo = majorInfo?.subcategories.find(s => s.value === sub)
  return subInfo ? { label: subInfo.label, emoji: subInfo.emoji } : { label: sub, emoji: '📦' }
}

/** Group ingredients by major and subcategory */
export function groupByMajorAndSub(ingredients: Ingredient[]): Map<MajorCategory, Map<Subcategory, Ingredient[]>> {
  const result = new Map<MajorCategory, Map<Subcategory, Ingredient[]>>()
  for (const ing of ingredients) {
    const major = toMajorCategory(ing.category)
    if (!result.has(major)) result.set(major, new Map())
    const subMap = result.get(major)!
    if (!subMap.has(ing.category)) subMap.set(ing.category, [])
    subMap.get(ing.category)!.push(ing)
  }
  return result
}

/** Classify ingredient into distillery type */
export function matchIngredient(ingredient: Ingredient): MatchedDistilleryIngredient {
  const { category, name, flavor_profile } = ingredient
  const nameLower = name.toLowerCase()
  const flavorTags = flavor_profile?.split(',').map(f => f.trim()).filter(Boolean) ?? []

  // Map category to distillery type
  if (category.startsWith('cereal')) {
    const tags = category === 'cereal_base' ? ['fermentable_base'] : ['fermentable_special']
    if (nameLower.includes('malta')) tags.push('malted')
    if (nameLower.includes('tostado') || nameLower.includes('chocolate')) tags.push('roasted')

    return {
      type: 'cereal_fermentable',
      descriptorTags: [...tags, ...flavorTags],
      recommendedUses: ['mashing', 'grain_bill'],
      technical: {
        'potencial ABV': '~1.5% por kg/25L',
        'uso': category === 'cereal_base' ? 'Base del macerado' : 'Sabor especializado',
      },
    }
  }

  if (category === 'fruta') {
    return {
      type: 'fruit_fermentable',
      descriptorTags: ['fermentable', ...flavorTags],
      recommendedUses: ['fruit_spirits', 'brandy', 'aguardiente'],
      technical: {
        'potencial ABV': 'Según azúcar natural',
        'uso': 'Fermentación directa o concentrado',
      },
    }
  }

  if (category === 'botanico') {
    const method = nameLower.includes('maceraci') ? 'maceración' : 'infusión vapor'
    return {
      type: 'botanical',
      descriptorTags: ['aromático', ...flavorTags],
      recommendedUses: ['gin_botanical_bill', 'infusiones', 'licores'],
      technical: {
        'método': method,
        'dosis típica': '5-15g/L de destilado',
      },
    }
  }

  if (category === 'levadura') {
    const isDistillery = nameLower.includes('destiler') || nameLower.includes('turbo')
    const strain = isDistillery ? 'Destilería' : 'Fermentación general'
    return {
      type: 'yeast',
      descriptorTags: [strain, ...flavorTags],
      recommendedUses: ['wash_fermentation', 'high_abv'],
      technical: {
        'tipo': strain,
        'tolerancia': 'Ver datasheet',
        'dosis': '~2g por 20-30L de wash',
      },
    }
  }

  if (category === 'azucar') {
    const source = nameLower.includes('caña') || nameLower.includes('melaza') ? 'caña' : 'grano'
    return {
      type: 'sugar',
      descriptorTags: ['fermentable', source],
      recommendedUses: ['sugar_wash', 'boost_abv'],
      technical: {
        'origen': source,
        'uso': source === 'caña' ? 'Sugar wash: 1kg/L agua' : 'Grano: usar en macerado',
      },
    }
  }

  if (category === 'agua_quimica') {
    return {
      type: 'water_chemical',
      descriptorTags: ['pH_ajuste', 'mineral'],
      recommendedUses: ['water_profiling'],
      technical: {
        'uso': 'Según análisis de agua local',
      },
    }
  }

  if (category === 'adjunto') {
    return {
      type: 'adjunct',
      descriptorTags: ['clarificación_o_procesamiento', ...flavorTags],
      recommendedUses: ['clarification', 'flavor_addition'],
      technical: {
        'uso': 'Dosis variable según tipo',
      },
    }
  }

  // Default: other
  return {
    type: 'other',
    descriptorTags: flavorTags.length > 0 ? flavorTags : ['ingrediente'],
    recommendedUses: ['custom_use'],
    technical: {},
  }
}
