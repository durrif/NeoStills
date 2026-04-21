// frontend/src/components/water/dilution-calculator.tsx — NeoStills v4

import { useWaterStore } from '@/stores/water-store'
import { ION_KEYS, ION_LABELS } from '@/data/water-profiles'
import { Droplets } from 'lucide-react'

export function DilutionCalculator() {
  const {
    roFraction, setRoFraction,
    getSourceWater, getDilutedSource,
    mashVolume, spargeVolume,
  } = useWaterStore()

  const source = getSourceWater()
  const diluted = getDilutedSource()
  const totalVolume = mashVolume + spargeVolume
  const hasSource = ION_KEYS.some((ion) => source[ion] > 0)

  const roLiters = Math.round(totalVolume * roFraction * 10) / 10
  const srcLiters = Math.round(totalVolume * (1 - roFraction) * 10) / 10

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Droplets size={14} className="text-accent-cobalt" />
        Dilución con agua RO/destilada
      </h3>
      <p className="text-[10px] text-text-tertiary mb-4">
        Si tu agua de origen es demasiado mineral, mezcla con RO/destilada
      </p>

      {/* Slider */}
      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={roFraction}
          onChange={(e) => setRoFraction(parseFloat(e.target.value))}
          className="w-full accent-accent-info"
        />
        <div className="flex justify-between mt-1 text-[10px]">
          <span className="text-accent-amber font-medium">
            {Math.round((1 - roFraction) * 100)}% origen ({srcLiters} L)
          </span>
          <span className="text-accent-cobalt font-medium">
            {Math.round(roFraction * 100)}% RO ({roLiters} L)
          </span>
        </div>
      </div>

      {/* Visual bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-4">
        <div
          className="h-full bg-accent-amber/40 transition-all duration-300"
          style={{ width: `${(1 - roFraction) * 100}%` }}
        />
        <div
          className="h-full bg-accent-cobalt/50 transition-all duration-300"
          style={{ width: `${roFraction * 100}%` }}
        />
      </div>

      {/* Diluted profile */}
      {hasSource && roFraction > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {ION_KEYS.map((ion) => (
            <div key={ion} className="text-center p-1.5 rounded-xl border border-accent-cobalt/12 bg-bg-deep/40">
              <div className="text-[10px] text-text-tertiary">{ION_LABELS[ion]?.label}</div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[9px] text-text-tertiary line-through">
                  {Math.round(source[ion])}
                </span>
                <span className="text-xs font-mono font-semibold" style={{ color: ION_LABELS[ion]?.color }}>
                  {Math.round(diluted[ion])}
                </span>
              </div>
              <div className="text-[9px] text-text-tertiary">ppm</div>
            </div>
          ))}
        </div>
      )}

      {!hasSource && (
        <div className="text-[10px] text-text-tertiary text-center py-2">
          Selecciona primero un agua de origen
        </div>
      )}
    </div>
  )
}
