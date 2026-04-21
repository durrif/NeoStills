// frontend/src/components/water/salt-additions.tsx — NeoStills v4

import { BREWING_SALTS, ION_KEYS, ION_LABELS } from '@/data/water-profiles'
import { useWaterStore } from '@/stores/water-store'
import { calcIonDelta } from '@/lib/water-calc'
import { Sparkles, RotateCcw } from 'lucide-react'

export function SaltAdditions() {
  const {
    saltAmounts, setSaltAmount,
    getDilutedSource, getTargetWater, getAdjustedWater,
    mashVolume, spargeVolume,
    autoSuggestSalts,
  } = useWaterStore()

  const target = getTargetWater()
  const adjusted = getAdjustedWater()
  const delta = calcIonDelta(adjusted, target)
  const totalVolume = mashVolume + spargeVolume

  const hasTarget = ION_KEYS.some((ion) => target[ion] > 0)

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Adición de sales</h3>
        <div className="flex gap-2">
          {hasTarget && (
            <button
              onClick={autoSuggestSalts}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-copper-gradient text-bg-deep text-xs font-semibold rounded-xl border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all"
            >
              <Sparkles size={12} />
              Auto-ajustar
            </button>
          )}
          <button
            onClick={() => BREWING_SALTS.forEach((s) => setSaltAmount(s.id, 0))}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Volume info */}
      <div className="text-[10px] text-text-tertiary mb-3">
        Volumen total de agua: {totalVolume} L (macerado: {mashVolume} L + sparging: {spargeVolume} L)
      </div>

      {/* Salt inputs */}
      <div className="space-y-2">
        {BREWING_SALTS.map((salt) => {
          const grams = saltAmounts[salt.id] ?? 0
          const contributions = ION_KEYS.filter((ion) => salt[ion] > 0)

          return (
            <div key={salt.id} className="group">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary font-medium truncate">
                    {salt.name}
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    {contributions.map((ion) => {
                      const ppmPerGramPerL = salt[ion]
                      return `${ION_LABELS[ion]?.label ?? ion}: +${Math.round(ppmPerGramPerL * grams / Math.max(totalVolume, 1))} ppm`
                    }).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={grams || ''}
                    onChange={(e) => setSaltAmount(salt.id, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 px-2 py-1.5 bg-bg-deep/80 border border-accent-cobalt/14 rounded-xl text-xs text-text-primary text-right font-mono focus:outline-none focus:border-accent-cobalt/34 transition-colors"
                  />
                  <span className="text-[10px] text-text-tertiary w-4">g</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ion delta display */}
      {hasTarget && (
        <div className="mt-4 pt-3 border-t border-accent-cobalt/10">
          <div className="text-[10px] text-text-tertiary mb-2 font-medium uppercase tracking-wider">
            Delta vs objetivo
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ION_KEYS.map((ion) => {
              const d = delta[ion]
              const abs = Math.abs(d)
              const isGood = abs <= 10
              const isOver = d > 10
              const isUnder = d < -10

              return (
                <div
                  key={ion}
                  className={`text-center p-1.5 rounded-xl border transition-colors ${
                    isGood
                      ? 'bg-status-success/5 border-status-success/20'
                      : isOver
                        ? 'bg-status-danger/5 border-status-danger/20'
                        : 'bg-accent-info/5 border-accent-info/20'
                  }`}
                >
                  <div className="text-[10px] text-text-tertiary">{ION_LABELS[ion]?.label ?? ion}</div>
                  <div
                    className={`text-xs font-mono font-semibold ${
                      isGood
                        ? 'text-status-success'
                        : isOver
                          ? 'text-status-danger'
                          : 'text-accent-info'
                    }`}
                  >
                    {d > 0 ? '+' : ''}{Math.round(d)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
