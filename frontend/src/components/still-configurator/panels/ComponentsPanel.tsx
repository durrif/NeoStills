import { useStillConfig } from '../hooks/useStillConfig'

function ToggleRow({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-bg-tertiary/70 p-3">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
    </label>
  )
}

export function ComponentsPanel() {
  const components = useStillConfig((state) => state.components)
  const setComponent = useStillConfig((state) => state.setComponent)

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="font-display text-base font-semibold text-text-primary">Componentes opcionales</h3>
      <div className="mt-4 space-y-3">
        <ToggleRow
          checked={components.parrot}
          label="Parrot integrado"
          description="Muestra la salida final para futuras lecturas ABV en tiempo real."
          onChange={(checked) => setComponent('parrot', checked)}
        />
        <ToggleRow
          checked={components.ginBasket}
          label="Gin basket"
          description="Se monta sobre la línea de vapor para futuras recetas aromáticas."
          onChange={(checked) => setComponent('ginBasket', checked)}
        />
        <ToggleRow
          checked={components.dephlegmator}
          label="Deflemador"
          description="Se deja disponible aunque el render de esta fase sigue siendo pot still base."
          onChange={(checked) => setComponent('dephlegmator', checked)}
        />
        <label className="block rounded-xl border border-white/10 bg-bg-tertiary/70 p-3">
          <span className="text-sm font-medium text-text-primary">Tipo de condensador</span>
          <select
            value={components.condenserType}
            onChange={(event) => setComponent('condenserType', event.target.value as 'shell_tube' | 'coil')}
            className="mt-3 w-full rounded-xl border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none"
          >
            <option value="shell_tube">Shell and tube</option>
            <option value="coil">Serpentín</option>
          </select>
        </label>
      </div>
    </section>
  )
}
