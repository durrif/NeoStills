// src/components/inventory/ingredient-tooltip.tsx — NeoStills v4 distillery
// Ingredient details with matched type, technical specs, recommended uses
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Zap } from 'lucide-react'
import { categoryColor, categoryIcon } from '@/lib/utils'
import {
  matchIngredient, originToFlag,
} from '@/lib/ingredient-matcher'
import type { Ingredient } from '@/lib/types'

interface IngredientTooltipProps {
  ingredient: Ingredient
  allInventory?: Ingredient[]
}

export function IngredientTooltip({ ingredient }: IngredientTooltipProps) {
  const catColor = categoryColor(ingredient.category)
  const emoji = categoryIcon(ingredient.category)

  const matched = useMemo(() => matchIngredient(ingredient), [ingredient])
  const originFlag = ingredient.origin ? originToFlag(ingredient.origin) : '🌍'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 pointer-events-none"
    >
      <div className="glass-card rounded-xl border border-white/15 p-4 space-y-2.5 shadow-elevated backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span className="text-lg">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-text-primary truncate">
              {ingredient.name}
            </p>
            {ingredient.supplier && (
              <p className="text-[10px] text-text-tertiary">{ingredient.supplier}</p>
            )}
          </div>
          <div
            className="h-3 w-3 rounded-full ring-2 ring-white/10"
            style={{ backgroundColor: catColor }}
          />
        </div>

        {/* Origin */}
        {ingredient.origin && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin size={11} className="text-text-tertiary" />
            <span>{originFlag} {ingredient.origin}</span>
          </div>
        )}

        {/* Flavor profile */}
        {ingredient.flavor_profile && (
          <div className="flex gap-1 flex-wrap">
            {ingredient.flavor_profile.split(',').map((f, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white/5 text-text-secondary border border-white/5">
                {f.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Matched type + recommended uses */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Zap size={10} className="text-amber-400" />
            <span className="font-mono capitalize">{matched.type.replace(/_/g, ' ')}</span>
          </div>
          {matched.recommendedUses.length > 0 && (
            <div className="text-[10px] text-text-tertiary">
              <span className="font-semibold text-text-secondary">Usos recomendados:</span>
              <p className="mt-0.5">{matched.recommendedUses.join(', ')}</p>
            </div>
          )}
        </div>

        {/* Technical info */}
        {Object.keys(matched.technical ?? {}).length > 0 && (
          <div className="pt-1 border-t border-white/10">
            <p className="text-[10px] font-semibold text-text-secondary mb-1">Técnico</p>
            {Object.entries(matched.technical ?? {}).map(([k, v]) => (
              <div key={k} className="text-[9px] text-text-tertiary flex justify-between">
                <span className="capitalize">{k.replace(/_/g, ' ')}:</span>
                <span className="text-text-secondary font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stock & price footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px]">
          <span className="text-text-tertiary">
            Stock: <span className="font-mono text-text-secondary">{ingredient.quantity} {ingredient.unit}</span>
          </span>
          {ingredient.purchase_price != null && ingredient.purchase_price > 0 && (
            <span className="text-text-tertiary">
              <span className="font-mono text-text-secondary">{ingredient.purchase_price.toFixed(2)}€</span>/{ingredient.unit}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
