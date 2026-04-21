// frontend/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { IngredientCategory } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale = 'es-ES'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date, locale = 'es-ES'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatPrice(amount: number, currency = 'EUR', locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

export function daysUntilExpiry(expiryDate: string): number {
  const now = new Date()
  const expiry = new Date(expiryDate)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function expiryStatus(expiryDate: string | undefined): 'ok' | 'warning' | 'danger' | null {
  if (!expiryDate) return null
  const days = daysUntilExpiry(expiryDate)
  if (days < 0) return 'danger'
  if (days <= 14) return 'danger'
  if (days <= 60) return 'warning'
  return 'ok'
}

export function stockStatus(quantity: number, minStock: number | undefined): 'ok' | 'warning' | 'danger' {
  if (!minStock || minStock <= 0) return 'ok'
  if (quantity === 0) return 'danger'
  if (quantity <= minStock) return 'warning'
  return 'ok'
}

export function categoryColor(category: IngredientCategory): string {
  const map: Record<IngredientCategory, string> = {
    cereal_base: '#C78A2C',
    cereal_especial: '#9B5D2E',
    fruta: '#A84A3B',
    botanico: '#5F8F52',
    levadura: '#FF9800',
    azucar: '#8A6EAF',
    agua_quimica: '#3E8FB0',
    adjunto: '#9E9E9E',
    otro: '#607D8B',
  }
  return map[category] ?? '#A1A1AA'
}

export function categoryIcon(category: IngredientCategory): string {
  const map: Record<IngredientCategory, string> = {
    cereal_base: '🌾',
    cereal_especial: '🔥',
    fruta: '🍎',
    botanico: '🌿',
    levadura: '🔬',
    azucar: '🍯',
    agua_quimica: '🧪',
    adjunto: '🧂',
    otro: '📦',
  }
  return map[category] ?? '📦'
}

export function abvColor(abv: number): string {
  if (abv < 4) return '#4CAF50'
  if (abv < 6) return '#F59E0B'
  if (abv < 9) return '#FF9800'
  return '#EF4444'
}

export function srmToColor(srm: number): string {
  // Approximate beer color from SRM value
  const colors: Record<number, string> = {
    1: '#FFE699', 2: '#FFD878', 3: '#FFCA5A', 4: '#FFBF42',
    5: '#FBB123', 6: '#F8A600', 7: '#F39C00', 8: '#EA8F00',
    9: '#E58500', 10: '#DE7C00', 11: '#D77200', 12: '#CF6900',
    13: '#CB6200', 14: '#C35900', 15: '#BB5100', 16: '#B54C00',
    17: '#B04500', 18: '#A63E00', 20: '#9B3900', 24: '#8D2D00',
    30: '#7B1A00', 40: '#600000',
  }
  const keys = Object.keys(colors).map(Number).sort((a, b) => a - b)
  const closest = keys.reduce((prev, curr) => Math.abs(curr - srm) < Math.abs(prev - srm) ? curr : prev)
  return colors[closest] ?? '#FFE699'
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
