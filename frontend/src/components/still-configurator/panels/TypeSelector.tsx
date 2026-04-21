import { Waves, Flame, TestTubeDiagonal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStillConfig } from '../hooks/useStillConfig'

const OPTIONS = [
  {
    value: 'pot_still',
    title: 'Pot still',
    description: 'Configurador inicial activo en esta fase. Ideal para whiskey, brandy y rum.',
    icon: Flame,
    disabled: false,
  },
  {
    value: 'reflux_still',
    title: 'Reflux still',
    description: 'Bloqueado temporalmente. Se habilita en la siguiente fase del roadmap.',
    icon: Waves,
    disabled: true,
  },
  {
    value: 'column_still',
    title: 'Column still',
    description: 'Bloqueado temporalmente. Requiere platos y columna completa.',
    icon: TestTubeDiagonal,
    disabled: true,
  },
] as const

export function TypeSelector() {
  const type = useStillConfig((state) => state.type)
  const setType = useStillConfig((state) => state.setType)

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="font-display text-base font-semibold text-text-primary">Tipo base</h3>
      <div className="mt-3 space-y-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const isActive = type === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && setType(option.value)}
              disabled={option.disabled}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                isActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-bg-tertiary/70',
                option.disabled ? 'cursor-not-allowed opacity-55' : 'hover:border-primary/60',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-lg bg-black/20 p-2 text-primary">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{option.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
