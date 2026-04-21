// frontend/src/components/water/cl-so4-ratio.tsx — NeoStills v4

import { useWaterStore } from '@/stores/water-store'
import { calcClSO4Ratio, getClSO4Balance, CL_SO4_LABELS } from '@/lib/water-calc'

export function ClSO4Ratio() {
  const getAdjustedWater = useWaterStore((s) => s.getAdjustedWater)
  const adjusted = getAdjustedWater()
  const ratio = calcClSO4Ratio(adjusted.chloride, adjusted.sulfate)
  const balance = getClSO4Balance(ratio)
  const { label, color } = CL_SO4_LABELS[balance]

  // Position on the slider (log scale, 0.1 to 10 → 0% to 100%)
  const clampedRatio = Math.max(0.1, Math.min(10, ratio))
  const position = (Math.log10(clampedRatio) + 1) / 2 * 100 // maps 0.1→0%, 1→50%, 10→100%

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        Ratio Cl⁻/SO₄²⁻
      </h3>
      <p className="text-[10px] text-text-tertiary mb-4">
        Determina el equilibrio entre redondez mineral y perfil seco en el macerado
      </p>

      {/* Visual slider */}
      <div className="relative">
        {/* Gradient bar */}
        <div className="h-3 rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(to right, #466690 0%, #5C7FAE 24%, #D1A178 52%, #B87333 76%, #7D4A22 100%)',
          }}
        />

        {/* Position marker */}
        <div
          className="absolute top-0 -translate-x-1/2 transition-all duration-500 ease-out"
          style={{ left: `${Math.max(2, Math.min(98, position))}%` }}
        >
          <div className="w-5 h-5 -mt-1 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* Labels below bar */}
        <div className="flex justify-between mt-2 text-[9px] text-text-tertiary">
          <span>Seco</span>
          <span>Balance</span>
          <span>Redondo</span>
        </div>
      </div>

      {/* Ratio value + label */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-mono font-bold" style={{ color }}>
            {ratio.toFixed(2)}
          </div>
          <div className="text-xs font-medium" style={{ color }}>
            {label}
          </div>
        </div>
        <div className="text-right text-xs text-text-tertiary space-y-0.5">
          <div>Cl⁻: <span className="font-mono text-text-secondary">{Math.round(adjusted.chloride)} ppm</span></div>
          <div>SO₄²⁻: <span className="font-mono text-text-secondary">{Math.round(adjusted.sulfate)} ppm</span></div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-text-tertiary">
        {balance === 'very-hoppy' && 'Perfil seco y nítido, útil para bases neutras, vodka o botánicos muy definidos.'}
        {balance === 'hoppy' && 'Perfil firme y ligero, adecuado para washes limpios y destilados de corte más seco.'}
        {balance === 'balanced' && 'Equilibrado — adecuado para la mayoría de maceraciones y fermentaciones de cereal.'}
        {balance === 'malty' && 'Perfil redondo, interesante para whiskey de cereal y destilados con más cuerpo.'}
        {balance === 'very-malty' && 'Muy redondo y estructurado — mejor para recetas donde buscas textura y profundidad.'}
      </div>
    </div>
  )
}
