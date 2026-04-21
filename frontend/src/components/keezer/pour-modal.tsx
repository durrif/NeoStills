// src/components/keezer/pour-modal.tsx — Quick Pour modal
import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassWater, X, Minus, Plus } from 'lucide-react'
import type { TapConfig } from '@/data/kegs'
import { useKeezerStore } from '@/stores/keezer-store'

const PRESETS = [
  { label: 'Muestra', ml: 50 },
  { label: 'Tasting', ml: 100 },
  { label: 'Copa', ml: 200 },
  { label: 'Botella', ml: 500 },
]

interface PourModalProps {
  tap: TapConfig
  onClose: () => void
}

export default function PourModal({ tap, onClose }: PourModalProps) {
  const [volumeMl, setVolumeMl] = useState(330)
  const { pourBeer } = useKeezerStore()

  const handlePour = () => {
    pourBeer(tap.id, volumeMl / 1000)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm glass-card rounded-2xl p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tap.color_hex}20` }}
            >
              <GlassWater size={20} style={{ color: tap.color_hex }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Servicio rápido — Línea {tap.id}
              </h3>
              <p className="text-xs text-text-tertiary">{tap.beer_name || 'Lote asignado'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.05] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setVolumeMl(p.ml)}
              className={`py-2 rounded-lg text-xs font-medium text-center transition-all ${
                volumeMl === p.ml
                  ? 'bg-accent-amber/15 text-accent-amber border border-accent-amber/30'
                  : 'bg-white/[0.03] text-text-secondary border border-border-subtle hover:bg-white/[0.06]'
              }`}
            >
              <div className="font-bold">{p.ml}ml</div>
              <div className="text-[10px] opacity-70">{p.label}</div>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setVolumeMl(Math.max(50, volumeMl - 50))}
            className="w-9 h-9 rounded-xl bg-white/[0.05] border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <Minus size={16} />
          </button>
          <div className="text-center">
            <span className="text-3xl font-bold text-accent-amber font-mono">
              {volumeMl}
            </span>
            <span className="text-sm text-text-tertiary ml-1">ml</span>
          </div>
          <button
            onClick={() => setVolumeMl(Math.min(2000, volumeMl + 50))}
            className="w-9 h-9 rounded-xl bg-white/[0.05] border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Remaining info */}
        <div className="text-center text-xs text-text-tertiary mb-4">
          Quedan {tap.liters_remaining.toFixed(1)}L → {Math.max(0, tap.liters_remaining - volumeMl / 1000).toFixed(1)}L
        </div>

        {/* Pour button */}
        <button
          onClick={handlePour}
          disabled={volumeMl <= 0 || tap.liters_remaining <= 0}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #D1A178, #22E6FF)',
            color: '#0A0E14',
          }}
        >
          Registrar salida {volumeMl}ml
        </button>
      </motion.div>
    </div>
  )
}
