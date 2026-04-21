import { useStillConfig } from '../hooks/useStillConfig'

export function DimensionsPanel() {
  const capacityLiters = useStillConfig((state) => state.capacityLiters)
  const setCapacityLiters = useStillConfig((state) => state.setCapacityLiters)
  const material = useStillConfig((state) => state.material)
  const setMaterial = useStillConfig((state) => state.setMaterial)
  const heaterType = useStillConfig((state) => state.heaterType)
  const setHeaterType = useStillConfig((state) => state.setHeaterType)

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="font-display text-base font-semibold text-text-primary">Dimensiones y material</h3>
      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-text-secondary">Capacidad</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={25}
              max={1000}
              step={25}
              value={capacityLiters}
              onChange={(event) => setCapacityLiters(Number(event.target.value))}
              className="h-2 w-full accent-primary"
            />
            <span className="min-w-20 rounded-lg border border-white/10 bg-bg-tertiary px-3 py-2 text-sm text-text-primary">
              {capacityLiters} L
            </span>
          </div>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-text-secondary">Material</span>
          <select
            value={material}
            onChange={(event) => setMaterial(event.target.value as 'copper' | 'stainless' | 'mixed')}
            className="mt-2 w-full rounded-xl border border-white/10 bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none"
          >
            <option value="copper">Cobre</option>
            <option value="stainless">Acero inoxidable</option>
            <option value="mixed">Mixto</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-text-secondary">Calentamiento</span>
          <select
            value={heaterType}
            onChange={(event) => setHeaterType(event.target.value as 'gas' | 'electric' | 'steam')}
            className="mt-2 w-full rounded-xl border border-white/10 bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none"
          >
            <option value="gas">Gas</option>
            <option value="electric">Eléctrico</option>
            <option value="steam">Vapor</option>
          </select>
        </label>
      </div>
    </section>
  )
}
