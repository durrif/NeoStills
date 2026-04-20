// src/components/brewing/new-batch-modal.tsx — Create New Brew Batch
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FlaskConical, PlayCircle, Beaker, Calendar, Ruler } from 'lucide-react'
import { toast } from 'sonner'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useRecipes } from '@/hooks/use-recipes'
import { useStartBrewFromRecipe } from '@/hooks/use-recipes'
import { useCreateSession } from '@/hooks/use-brewing'
import { calcStrikeTemp, calcSpargeVolume } from '@/lib/brew-calc'
import type { Recipe } from '@/lib/types'

interface NewBatchModalProps {
  open: boolean
  onClose: () => void
}

export function NewBatchModal({ open, onClose }: NewBatchModalProps) {
  const { t, i18n } = useTranslation('common')
  const { data: recipes = [] } = useRecipes()
  const startBrew = useStartBrewFromRecipe()
  const createSession = useCreateSession()

  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [batchSize, setBatchSize] = useState(20)
  const [brewDate, setBrewDate] = useState(new Date().toISOString().slice(0, 10))

  const selectedRecipe = recipes.find((r: Recipe) => String(r.id) === String(selectedRecipeId))

  // Calculate strike temp and sparge vol if recipe selected
  const grainWeightKg = selectedRecipe?.fermentables
    ?.reduce((acc: number, f) => acc + (f.amount_kg ?? 0), 0) ?? 0
  const mashTemp = selectedRecipe?.mash_steps?.[0]?.temp_c ?? 67
  const mashRatio = grainWeightKg > 0 ? (batchSize * 0.6) / grainWeightKg : 2.5
  const strikeTemp = grainWeightKg > 0
    ? calcStrikeTemp(mashRatio, 20, mashTemp)
    : null
  const spargeVol = grainWeightKg > 0
    ? calcSpargeVolume(batchSize, grainWeightKg, mashRatio, 4, 60, 1)
    : null

  const handleCreate = () => {
    if (selectedRecipeId) {
      startBrew.mutate(selectedRecipeId, {
        onSuccess: () => {
          toast.success(t('brew_day.batch_started'))
          onClose()
        },
        onError: () => toast.error(t('brew_day.advance_error')),
      })
    } else {
      createSession.mutate(
        {
          name: `${t('brew_day.batch_prefix')} ${new Date(brewDate).toLocaleDateString(i18n.language)}`,
          phase: 'planned',
          wash_volume_liters: batchSize,
          wash_date: brewDate,
        },
        {
          onSuccess: () => {
            toast.success(t('brew_day.batch_created'))
            onClose()
          },
          onError: () => toast.error(t('brew_day.advance_error')),
        },
      )
    }
  }

  const isPending = startBrew.isPending || createSession.isPending

  return (
    <Modal open={open} onClose={onClose} title={t('brew_day.new_batch')} description={t('brew_day.new_batch_desc', { defaultValue: 'Selecciona una receta o crea un lote vacío' })} size="lg">
      <div className="space-y-5">
        {/* Recipe selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Beaker size={12} />
            {t('brew_day.select_recipe', { defaultValue: 'Receta' })}
          </label>
          <select
            value={selectedRecipeId ?? ''}
            onChange={(e) => setSelectedRecipeId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-amber/50"
          >
            <option value="">{t('brew_day.no_recipe')}</option>
            {recipes.map((r: Recipe) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.style ? `(${r.style})` : ''} {r.og ? `OG ${r.og.toFixed(3)}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Batch size + Brew date row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Ruler size={12} />
              {t('brew_day.batch_size', { defaultValue: 'Volumen (L)' })}
            </label>
            <input
              type="number"
              min={5}
              max={200}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-white/10 text-text-primary font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent-amber/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} />
              {t('brew_day.brew_date', { defaultValue: 'Fecha' })}
            </label>
            <input
              type="date"
              value={brewDate}
              onChange={(e) => setBrewDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-amber/50"
            />
          </div>
        </div>

        {/* Recipe Quick Stats */}
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'OG', value: selectedRecipe.og?.toFixed(3), color: 'text-accent-amber' },
                { label: 'IBU', value: selectedRecipe.ibu?.toFixed(0), color: 'text-accent-hop' },
                { label: 'SRM', value: selectedRecipe.srm?.toFixed(1), color: 'text-amber-400' },
                { label: 'ABV', value: selectedRecipe.abv ? `${selectedRecipe.abv.toFixed(1)}%` : undefined, color: 'text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-bg-elevated rounded-lg p-3 text-center border border-white/5">
                  <p className="text-[10px] text-text-muted">{label}</p>
                  <p className={`text-lg font-mono font-bold ${color}`}>{value ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Strike temp + sparge volume */}
            {strikeTemp && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-accent-amber/5 border border-accent-amber/15 rounded-lg p-3">
                  <p className="text-[10px] text-text-muted">Temp. empaste</p>
                  <p className="text-lg font-mono font-bold text-accent-amber">{strikeTemp.toFixed(1)}°C</p>
                </div>
                {spargeVol != null && (
                  <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-3">
                    <p className="text-[10px] text-text-muted">Vol. lavado</p>
                    <p className="text-lg font-mono font-bold text-blue-400">{spargeVol.toFixed(1)} L</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Action */}
        <Button
          onClick={handleCreate}
          disabled={isPending}
          className="w-full bg-accent-amber hover:bg-accent-amber-bright text-bg-primary font-bold py-3 text-base"
        >
          <PlayCircle className="h-5 w-5 mr-2" />
          {isPending ? t('brew_day.starting') : selectedRecipeId
            ? t('brew_day.start_brew')
            : t('brew_day.create_empty_batch', { defaultValue: 'Crear lote vacío' })}
        </Button>
      </div>
    </Modal>
  )
}
