// frontend/src/components/water/mash-ph-estimator.tsx — NeoStills v4

import { useWaterStore } from '@/stores/water-store'
import { GRAIN_PH_DATA, calcResidualAlkalinity, type GrainBillEntry } from '@/lib/water-calc'
import { Plus, Trash2 } from 'lucide-react'

const GRAIN_TYPES: { value: GrainBillEntry['type']; label: string; emoji: string }[] = [
  { value: 'base', label: 'Malta base', emoji: '🌾' },
  { value: 'caramel', label: 'Malta caramelo/crystal', emoji: '🍯' },
  { value: 'roasted', label: 'Malta tostada/oscura', emoji: '☕' },
  { value: 'acidulated', label: 'Malta acidulada', emoji: '🍋' },
]

export function MashPHEstimator() {
  const {
    grainBill, setGrainBill,
    targetPH, setTargetPH,
    mashVolume, setMashVolume,
    spargeVolume, setSpargeVolume,
    getEstimatedPH, getAdjustedWater,
  } = useWaterStore()

  const estimated = getEstimatedPH()
  const adjusted = getAdjustedWater()
  const ra = calcResidualAlkalinity(adjusted)

  const phDiff = estimated - targetPH
  const phIsGood = Math.abs(phDiff) <= 0.1
  const phTooHigh = phDiff > 0.1
  const phTooLow = phDiff < -0.1

  const addGrain = () => {
    setGrainBill([...grainBill, { type: 'base', amount_kg: 1 }])
  }

  const removeGrain = (index: number) => {
    setGrainBill(grainBill.filter((_, i) => i !== index))
  }

  const updateGrain = (index: number, field: keyof GrainBillEntry, value: string | number) => {
    const updated: GrainBillEntry[] = grainBill.map((g, i) => {
      if (i !== index) return g
      if (field === 'type') return { ...g, type: value as GrainBillEntry['type'] }
      return { ...g, amount_kg: typeof value === 'number' ? value : parseFloat(value) || 0 }
    })
    setGrainBill(updated)
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        Estimador de pH del macerado
      </h3>
      <p className="text-[10px] text-text-tertiary mb-4">
        Método simplificado Palmer/Kowalkowski
      </p>

      {/* Volume inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-text-tertiary block mb-1">Vol. macerado (L)</label>
          <input
            type="number"
            min={1}
            step={0.5}
            value={mashVolume}
            onChange={(e) => setMashVolume(parseFloat(e.target.value) || 1)}
            className="w-full px-2 py-1.5 bg-bg-deep/80 border border-accent-cobalt/14 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-accent-cobalt/34"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-tertiary block mb-1">Vol. sparging (L)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={spargeVolume}
            onChange={(e) => setSpargeVolume(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 bg-bg-deep/80 border border-accent-cobalt/14 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-accent-cobalt/34"
          />
        </div>
      </div>

      {/* Grain bill */}
      <div className="space-y-2 mb-3">
        {grainBill.map((grain, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={grain.type}
              onChange={(e) => updateGrain(i, 'type', e.target.value)}
              className="flex-1 px-2 py-1.5 bg-bg-deep/80 border border-accent-cobalt/14 rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-cobalt/34 appearance-none"
            >
              {GRAIN_TYPES.map((gt) => (
                <option key={gt.value} value={gt.value}>
                  {gt.emoji} {gt.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step={0.1}
              value={grain.amount_kg}
              onChange={(e) => updateGrain(i, 'amount_kg', parseFloat(e.target.value) || 0)}
              className="w-20 px-2 py-1.5 bg-bg-deep/80 border border-accent-cobalt/14 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-accent-cobalt/34"
            />
            <span className="text-[10px] text-text-tertiary">kg</span>
            {grainBill.length > 1 && (
              <button
                onClick={() => removeGrain(i)}
                className="p-1 text-text-tertiary hover:text-accent-danger transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addGrain}
        className="flex items-center gap-1 text-xs text-accent-info hover:text-accent-info/80 transition-colors mb-4"
      >
        <Plus size={12} />
        Añadir grano
      </button>

      {/* Target pH */}
      <div className="mb-4">
        <label className="text-[10px] text-text-tertiary block mb-1">pH objetivo</label>
        <input
          type="range"
          min={4.8}
          max={5.8}
          step={0.05}
          value={targetPH}
          onChange={(e) => setTargetPH(parseFloat(e.target.value))}
          className="w-full accent-accent-amber"
        />
        <div className="flex justify-between text-[9px] text-text-tertiary mt-0.5">
          <span>4.8</span>
          <span className="text-accent-amber font-mono font-semibold">{targetPH.toFixed(2)}</span>
          <span>5.8</span>
        </div>
      </div>

      {/* Results */}
      <div className="bg-bg-deep/45 rounded-2xl border border-accent-cobalt/12 p-3 space-y-3">
        {/* Estimated pH */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">pH estimado</span>
          <span
            className={`text-xl font-mono font-bold ${
              phIsGood
                ? 'text-status-success'
                : phTooHigh
                  ? 'text-status-warning'
                  : 'text-accent-info'
            }`}
          >
            {estimated.toFixed(2)}
          </span>
        </div>

        {/* RA */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Alcalinidad residual (RA)</span>
          <span className="text-sm font-mono text-text-primary">{ra} ppm</span>
        </div>

        {/* Recommendation */}
        <div className={`text-[10px] p-2 rounded-lg ${
          phIsGood
            ? 'bg-status-success/10 text-status-success'
            : phTooHigh
              ? 'bg-status-warning/10 text-status-warning'
              : 'bg-accent-info/10 text-accent-info'
        }`}>
          {phIsGood && 'pH dentro del rango ideal para el macerado.'}
          {phTooHigh && `pH ${phDiff.toFixed(2)} por encima del objetivo. Corrige con ácido láctico o malta acidulada.`}
          {phTooLow && `pH ${Math.abs(phDiff).toFixed(2)} por debajo del objetivo. Compensa con bicarbonato de sodio o carbonato de calcio.`}
        </div>
      </div>
    </div>
  )
}
