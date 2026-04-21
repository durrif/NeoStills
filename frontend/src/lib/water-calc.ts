// frontend/src/lib/water-calc.ts — Water chemistry calculator for NeoStills v4

import type { IonKey } from '@/data/water-profiles'
import { BREWING_SALTS, ION_KEYS, type WaterProfile, type SaltAddition } from '@/data/water-profiles'

/* ── Ion concentrations after salt additions ─────────────────── */

export interface SaltAmounts {
  /** grams of each salt to add — keyed by SaltAddition.id */
  [saltId: string]: number
}

export interface IonConcentrations {
  calcium: number
  magnesium: number
  sodium: number
  chloride: number
  sulfate: number
  bicarbonate: number
}

/**
 * Calculate the resulting water ion profile after salt additions.
 * @param source   Source water profile
 * @param salts    Grams of each salt to add
 * @param volume   Water volume in liters
 * @returns        Final ion concentrations (ppm)
 */
export function calcAdjustedWater(
  source: IonConcentrations,
  salts: SaltAmounts,
  volume: number,
): IonConcentrations {
  const result: IonConcentrations = { ...source }

  for (const salt of BREWING_SALTS) {
    const grams = salts[salt.id] ?? 0
    if (grams <= 0 || volume <= 0) continue

    for (const ion of ION_KEYS) {
      result[ion] += (salt[ion] * grams) / volume
    }
  }

  return result
}

/**
 * Calculate the delta between adjusted and target profiles.
 * Positive = over target, negative = under target.
 */
export function calcIonDelta(
  adjusted: IonConcentrations,
  target: IonConcentrations,
): IonConcentrations {
  const delta = {} as IonConcentrations
  for (const ion of ION_KEYS) {
    delta[ion] = Math.round((adjusted[ion] - target[ion]) * 10) / 10
  }
  return delta
}

/* ── Chloride/Sulfate Ratio ──────────────────────────────────── */

export type ClSO4Balance = 'very-malty' | 'malty' | 'balanced' | 'hoppy' | 'very-hoppy'

/**
 * Calculate the Cl/SO4 ratio.
 * < 0.4  → very hoppy / bitter accentuated
 * 0.4–0.8 → hoppy
 * 0.8–1.2 → balanced
 * 1.2–2.0 → malty
 * > 2.0  → very malty / full bodied
 */
export function calcClSO4Ratio(chloride: number, sulfate: number): number {
  if (sulfate <= 0) return chloride > 0 ? 10 : 1
  return chloride / sulfate
}

export function getClSO4Balance(ratio: number): ClSO4Balance {
  if (ratio < 0.4) return 'very-hoppy'
  if (ratio < 0.8) return 'hoppy'
  if (ratio <= 1.2) return 'balanced'
  if (ratio <= 2.0) return 'malty'
  return 'very-malty'
}

export const CL_SO4_LABELS: Record<ClSO4Balance, { label: string; color: string }> = {
  'very-hoppy': { label: 'Muy seco', color: '#5F7EA6' },
  hoppy:        { label: 'Seco', color: '#7D96BA' },
  balanced:     { label: 'Equilibrado', color: '#D1A178' },
  malty:        { label: 'Redondo', color: '#B87333' },
  'very-malty': { label: 'Muy redondo', color: '#7D4A22' },
}

/* ── Dilution Calculator ─────────────────────────────────────── */

/**
 * Calculate the dilution ratio needed to reduce a mineral-rich source.
 * @param source  Source water ion value (ppm)
 * @param target  Target ion value (ppm)
 * @returns       Fraction of source water to use (0-1). Rest is RO/distilled.
 */
export function calcDilutionRatio(source: number, target: number): number {
  if (source <= 0) return 1
  if (target <= 0) return 0
  return Math.min(1, Math.max(0, target / source))
}

/**
 * Calculate diluted water profile.
 * @param source     Source water
 * @param roFraction Fraction of RO water (0-1)
 * @returns          Diluted profile
 */
export function calcDilutedWater(
  source: IonConcentrations,
  roFraction: number,
): IonConcentrations {
  const srcFraction = 1 - roFraction
  const result = {} as IonConcentrations
  for (const ion of ION_KEYS) {
    result[ion] = Math.round(source[ion] * srcFraction * 10) / 10
  }
  return result
}

/* ── Mash pH Estimation (Simplified Palmer/Kowalkowski) ──────── */

/**
 * Grain types and their contribution to mash pH.
 * distilled_water_pH: pH when mashed with distilled water
 * acidity_meq_per_kg: milliequivalents of acid per kg of grain
 */
export interface GrainPHContribution {
  type: 'base' | 'caramel' | 'roasted' | 'acidulated'
  distilled_water_pH: number
  acidity_meq_per_kg: number
}

export const GRAIN_PH_DATA: Record<string, GrainPHContribution> = {
  base:       { type: 'base',       distilled_water_pH: 5.70, acidity_meq_per_kg: 6 },
  caramel:    { type: 'caramel',    distilled_water_pH: 5.40, acidity_meq_per_kg: 25 },
  roasted:    { type: 'roasted',    distilled_water_pH: 4.80, acidity_meq_per_kg: 55 },
  acidulated: { type: 'acidulated', distilled_water_pH: 3.40, acidity_meq_per_kg: 180 },
}

export interface GrainBillEntry {
  type: 'base' | 'caramel' | 'roasted' | 'acidulated'
  amount_kg: number
}

/**
 * Estimate mash pH using a simplified Palmer method.
 * This gives a reasonable estimate — not a lab-grade calculation.
 *
 * @param grainBill   List of grains with type and weight
 * @param water       Water profile (we use bicarbonate as alkalinity proxy)
 * @param mashVolume  Total mash water volume in liters
 * @returns           Estimated mash pH
 */
export function estimateMashPH(
  grainBill: GrainBillEntry[],
  water: IonConcentrations,
  mashVolume: number,
): number {
  if (grainBill.length === 0 || mashVolume <= 0) return 5.40

  // Residual Alkalinity (RA) — Kolbach equation
  const RA = water.bicarbonate / 3.5 - water.calcium / 7 - water.magnesium / 14

  // Base mash pH from weighted grain contribution
  const totalWeight = grainBill.reduce((s, g) => s + g.amount_kg, 0)
  if (totalWeight <= 0) return 5.40

  const weightedPH = grainBill.reduce((sum, g) => {
    const phData = GRAIN_PH_DATA[g.type] ?? GRAIN_PH_DATA['base']!
    return sum + phData!.distilled_water_pH * g.amount_kg
  }, 0) / totalWeight

  // RA impact on mash pH: approximately +0.03 pH per 10 ppm RA
  const raPHShift = (RA / 10) * 0.03

  // Water-to-grain ratio effect (thicker mash = lower pH)
  const waterToGrain = mashVolume / totalWeight
  const ratioAdjust = (waterToGrain - 3) * 0.01 // 3 L/kg as baseline

  return Math.round((weightedPH + raPHShift + ratioAdjust) * 100) / 100
}

/* ── Acid Additions ──────────────────────────────────────────── */

export interface AcidType {
  id: string
  name: string
  concentration: number  // fraction, e.g. 0.88 for 88%
  normality: number      // meq/mL at concentration
}

export const ACID_TYPES: AcidType[] = [
  { id: 'lactic88',      name: 'Ácido láctico 88%',       concentration: 0.88, normality: 11.39 },
  { id: 'phosphoric10',  name: 'Ácido fosfórico 10%',     concentration: 0.10, normality: 1.03 },
  { id: 'phosphoric85',  name: 'Ácido fosfórico 85%',     concentration: 0.85, normality: 13.08 },
]

/**
 * Calculate acid addition to reach target pH.
 * Uses simplified residual alkalinity model.
 *
 * @param currentPH     Current estimated mash pH
 * @param targetPH      Desired mash pH (typically 5.2-5.4)
 * @param water         Water profile
 * @param mashVolume    Volume of mash water in liters
 * @param acid          Acid type info
 * @returns             mL of acid to add
 */
export function calcAcidAddition(
  currentPH: number,
  targetPH: number,
  water: IonConcentrations,
  mashVolume: number,
  acid: AcidType,
): number {
  if (currentPH <= targetPH || mashVolume <= 0) return 0

  // Each 0.1 pH drop requires neutralizing ~1 meq/L of alkalinity
  const phDrop = currentPH - targetPH
  const meqNeeded = phDrop * 10 * mashVolume // rough approximation

  // Bicarbonate buffering capacity
  const bicarb_meq = (water.bicarbonate / 61) * mashVolume
  const totalMeq = Math.min(meqNeeded, bicarb_meq + meqNeeded * 0.3)

  return Math.round((totalMeq / acid.normality) * 100) / 100
}

/* ── Residual Alkalinity ─────────────────────────────────────── */

/**
 * Calculate Residual Alkalinity (RA) in ppm as CaCO3.
 * RA = Alkalinity - Ca/1.4 - Mg/1.7  (Kolbach)
 */
export function calcResidualAlkalinity(water: IonConcentrations): number {
  const alkalinity = water.bicarbonate * 50 / 61 // Convert HCO3 to ppm as CaCO3
  return Math.round(alkalinity - water.calcium / 1.4 - water.magnesium / 1.7)
}

/* ── Auto Salt Suggestion ────────────────────────────────────── */

/**
 * Suggest approximate salt additions to move from source to target.
 * Uses a simple greedy approach — pick salts that move the most-deficient ions.
 * Returns grams per liter, multiply by total volume.
 */
export function suggestSaltAdditions(
  source: IonConcentrations,
  target: IonConcentrations,
  volume: number,
): SaltAmounts {
  const result: SaltAmounts = {}
  if (volume <= 0) return result

  const delta: IonConcentrations = {
    calcium: Math.max(0, target.calcium - source.calcium),
    magnesium: Math.max(0, target.magnesium - source.magnesium),
    sodium: Math.max(0, target.sodium - source.sodium),
    chloride: Math.max(0, target.chloride - source.chloride),
    sulfate: Math.max(0, target.sulfate - source.sulfate),
    bicarbonate: Math.max(0, target.bicarbonate - source.bicarbonate),
  }

  // Gypsum for sulfate + calcium
  if (delta.sulfate > 0) {
    const gypsumSalt = BREWING_SALTS.find((s) => s.id === 'gypsum')
    if (gypsumSalt && gypsumSalt.sulfate > 0) {
      const grams = (delta.sulfate / gypsumSalt.sulfate) * volume
      result.gypsum = Math.round(grams * 10) / 10
      delta.calcium = Math.max(0, delta.calcium - (gypsumSalt.calcium * grams) / volume)
    }
  }

  // CaCl2 for chloride + remaining calcium
  if (delta.chloride > 0) {
    const caclSalt = BREWING_SALTS.find((s) => s.id === 'cacl2')
    if (caclSalt && caclSalt.chloride > 0) {
      const grams = (delta.chloride / caclSalt.chloride) * volume
      result.cacl2 = Math.round(grams * 10) / 10
      delta.calcium = Math.max(0, delta.calcium - (caclSalt.calcium * grams) / volume)
    }
  }

  // Epsom salt for magnesium
  if (delta.magnesium > 5) {
    const epsomSalt = BREWING_SALTS.find((s) => s.id === 'epsom')
    if (epsomSalt && epsomSalt.magnesium > 0) {
      const grams = (delta.magnesium / epsomSalt.magnesium) * volume
      result.epsom = Math.round(grams * 10) / 10
    }
  }

  // Baking soda for bicarbonate + sodium
  if (delta.bicarbonate > 10) {
    const bakingSalt = BREWING_SALTS.find((s) => s.id === 'nahco3')
    if (bakingSalt && bakingSalt.bicarbonate > 0) {
      const grams = (delta.bicarbonate / bakingSalt.bicarbonate) * volume
      result.nahco3 = Math.round(grams * 10) / 10
    }
  }

  // Table salt for sodium (if still needed and not already covered)
  if (delta.sodium > 10 && !result.nahco3) {
    const tableSalt = BREWING_SALTS.find((s) => s.id === 'nacl')
    if (tableSalt && tableSalt.sodium > 0) {
      const grams = (delta.sodium / tableSalt.sodium) * volume
      result.nacl = Math.round(grams * 10) / 10
    }
  }

  return result
}

/* ── Utility: Profile to IonConcentrations ───────────────────── */

export function profileToIons(profile: WaterProfile): IonConcentrations {
  return {
    calcium: profile.calcium,
    magnesium: profile.magnesium,
    sodium: profile.sodium,
    chloride: profile.chloride,
    sulfate: profile.sulfate,
    bicarbonate: profile.bicarbonate,
  }
}

/** Check if all ions are within +/- tolerance of target */
export function isWithinTolerance(
  adjusted: IonConcentrations,
  target: IonConcentrations,
  tolerance = 10,
): boolean {
  return ION_KEYS.every(
    (ion) => Math.abs(adjusted[ion] - target[ion]) <= tolerance,
  )
}
