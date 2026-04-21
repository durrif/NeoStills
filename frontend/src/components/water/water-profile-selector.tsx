// frontend/src/components/water/water-profile-selector.tsx — NeoStills v4

import { useState, useMemo } from 'react'
import { Search, MapPin, Droplets, FlaskConical, Landmark } from 'lucide-react'
import { WATER_PROFILES, type WaterProfile, ION_LABELS, ION_KEYS } from '@/data/water-profiles'
import type { IonConcentrations } from '@/lib/water-calc'

interface Props {
  label: string
  selectedId: string | null
  customIons: IonConcentrations | null
  onSelectProfile: (id: string | null) => void
  onSetCustom: (ions: IonConcentrations) => void
}

const TYPE_LABELS: Record<WaterProfile['type'], { label: string; icon: typeof Landmark }> = {
  famous_brewing: { label: 'Aguas de referencia', icon: Landmark },
  city_tap:       { label: 'Agua de grifo — España', icon: MapPin },
  mineral_bottled:{ label: 'Agua mineral embotellada', icon: FlaskConical },
  style_target:   { label: 'Objetivo mineral', icon: Droplets },
}

export function WaterProfileSelector({ label, selectedId, customIons, onSelectProfile, onSetCustom }: Props) {
  const [search, setSearch] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [expandedType, setExpandedType] = useState<WaterProfile['type'] | null>(null)
  const [localCustom, setLocalCustom] = useState<IonConcentrations>(
    customIons ?? { calcium: 0, magnesium: 0, sodium: 0, chloride: 0, sulfate: 0, bicarbonate: 0 },
  )

  const grouped = useMemo(() => {
    const groups: Record<string, WaterProfile[]> = {}
    WATER_PROFILES.forEach((p) => {
      const matches =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.region.toLowerCase().includes(search.toLowerCase()) ||
        (p.bestFor ?? '').toLowerCase().includes(search.toLowerCase())
      if (matches) {
        if (!groups[p.type]) groups[p.type] = []
        ;(groups[p.type] ??= []).push(p)
      }
    })
    return groups
  }, [search])

  const selectedProfile = selectedId ? WATER_PROFILES.find((p) => p.id === selectedId) : null

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{label}</h3>

      {/* Selected profile badge */}
      {(selectedProfile || customIons) && (
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-accent-copper/10 border border-accent-copper/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <Droplets size={16} className="text-accent-amber" />
          <span className="text-sm text-text-primary font-medium">
            {selectedProfile
              ? `${selectedProfile.countryFlag} ${selectedProfile.name}`
              : 'Perfil personalizado'}
          </span>
          <button
            onClick={() => { onSelectProfile(null); setShowCustom(false) }}
            className="ml-auto text-xs text-text-tertiary hover:text-accent-danger transition-colors"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Profile picker (when not yet selected) */}
      {!selectedProfile && !customIons && (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar perfil de agua..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-bg-tertiary/70 border border-accent-cobalt/16 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-cobalt/38"
            />
          </div>

          {/* Type groups */}
          <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin">
            {(Object.keys(TYPE_LABELS) as WaterProfile['type'][]).map((type) => {
              const profiles = grouped[type]
              if (!profiles?.length) return null
              const { label: typeLabel, icon: Icon } = TYPE_LABELS[type]
              const isExpanded = expandedType === type

              return (
                <div key={type}>
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : type)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-bg-tertiary/70 hover:border-accent-cobalt/20 border border-transparent transition-colors"
                  >
                    <Icon size={14} />
                    <span>{typeLabel}</span>
                    <span className="ml-auto text-text-tertiary">{profiles.length}</span>
                    <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 mt-1">
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => onSelectProfile(p.id)}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-bg-tertiary/70 border border-transparent hover:border-accent-cobalt/16 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <span>{p.countryFlag}</span>
                            <span className="text-text-primary font-medium">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                            <span>Ca: {p.calcium}</span>
                            <span>SO₄: {p.sulfate}</span>
                            <span>Cl: {p.chloride}</span>
                            <span>HCO₃: {p.bicarbonate}</span>
                          </div>
                          <div className="text-xs text-accent-copper/75 mt-0.5 group-hover:text-accent-copper transition-colors">
                            {p.region}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Custom input toggle */}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="mt-3 w-full text-xs text-accent-cobalt hover:text-accent-cobalt/80 transition-colors text-center py-1"
          >
            {showCustom ? 'Ocultar entrada manual' : '✏️ Introducir valores manualmente'}
          </button>

          {showCustom && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {ION_KEYS.map((ion) => (
                  <div key={ion}>
                    <label className="text-[10px] text-text-tertiary block mb-0.5">
                      {ION_LABELS[ion]?.label ?? ion}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={localCustom[ion]}
                      onChange={(e) =>
                        setLocalCustom((prev) => ({
                          ...prev,
                          [ion]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-2 py-1.5 bg-bg-deep/80 border border-accent-cobalt/14 rounded-lg text-xs text-text-primary text-right focus:outline-none focus:border-accent-cobalt/34"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => onSetCustom(localCustom)}
                className="w-full py-2 bg-copper-gradient text-bg-deep text-xs font-semibold rounded-xl border border-[#DAB18B33] shadow-copper hover:-translate-y-px transition-all"
              >
                Usar estos valores
              </button>
            </div>
          )}
        </>
      )}

      {/* Ion summary for selected profile */}
      {(selectedProfile || customIons) && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {ION_KEYS.map((ion) => {
            const value = selectedProfile ? selectedProfile[ion] : customIons?.[ion] ?? 0
            return (
              <div key={ion} className="text-center p-2 rounded-xl border border-accent-cobalt/12 bg-bg-deep/40">
                <div className="text-[10px] text-text-tertiary">{ION_LABELS[ion]?.label}</div>
                <div className="text-sm font-mono font-semibold" style={{ color: ION_LABELS[ion]?.color }}>
                  {Math.round(value * 10) / 10}
                </div>
                <div className="text-[9px] text-text-tertiary">ppm</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
