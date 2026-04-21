// src/components/inventory/ingredient-card.tsx — NeoStills v3
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Edit2, Trash2, Plus, Minus, Package,
  MapPin, Wheat, Leaf, Pill, Beaker, Apple, FlaskRound, Droplets,
} from 'lucide-react'
import { cn, daysUntilExpiry, categoryColor, categoryIcon, stockStatus } from '@/lib/utils'
import { ExpiryBadge } from './expiry-badge'
import { LiquidProgress } from './liquid-progress'
import { IngredientTooltip } from './ingredient-tooltip'
import type { Ingredient } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface IngredientCardProps {
  ingredient: Ingredient
  allInventory?: Ingredient[]
  onEdit?: (ingredient: Ingredient) => void
  onDelete?: (ingredient: Ingredient) => void
  onAdjust?: (ingredient: Ingredient, delta: number) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  cereal_base: 'Cereal base',
  cereal_especial: 'Cereal especial',
  fruta: 'Fruta',
  botanico: 'Botanico',
  levadura: 'Levadura',
  azucar: 'Azucar / melaza',
  agua_quimica: 'Quimica de agua',
  adjunto: 'Adjunto',
  otro: 'Otro',
}

const CAT_ICON_MAP: Record<string, typeof Wheat> = {
  cereal_base: Wheat,
  cereal_especial: Wheat,
  fruta: Apple,
  botanico: Leaf,
  levadura: Pill,
  azucar: FlaskRound,
  agua_quimica: Droplets,
  adjunto: Beaker,
  otro: Package,
}

export function IngredientCard({
  ingredient,
  allInventory,
  onEdit,
  onDelete,
  onAdjust,
}: IngredientCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const hoverRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const daysLeft = daysUntilExpiry(ingredient.expiry_date ?? '')
  const stock = stockStatus(ingredient.quantity, ingredient.min_stock ?? 0)
  const catColor = categoryColor(ingredient.category)
  const CatIcon = CAT_ICON_MAP[ingredient.category] ?? Package

  const handleMouseEnter = () => {
    hoverRef.current = setTimeout(() => setShowTooltip(true), 400)
  }
  const handleMouseLeave = () => {
    if (hoverRef.current) clearTimeout(hoverRef.current)
    setShowTooltip(false)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Rich tooltip on hover */}
      <AnimatePresence>
        {showTooltip && !expanded && (
          <IngredientTooltip ingredient={ingredient} allInventory={allInventory} />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className={cn(
          'glass-card rounded-xl border overflow-hidden cursor-pointer transition-all',
          stock === 'danger' && 'border-red-500/40',
          stock === 'warning' && 'border-amber-500/40',
          stock === 'ok' && 'border-white/10 hover:border-white/20',
        )}
        whileHover={{ y: -2 }}
        onClick={() => setExpanded(v => !v)}
      >
        {/* top colour strip */}
        <div className="h-1" style={{ backgroundColor: catColor }} />

        <div className="p-4">
          {/* header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${catColor}20` }}
              >
                <CatIcon className="h-4 w-4" style={{ color: catColor }} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-text-primary truncate">
                  {ingredient.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[10px] px-1.5 py-0 rounded-full border"
                    style={{
                      color: catColor,
                      borderColor: `${catColor}40`,
                      backgroundColor: `${catColor}10`,
                    }}
                  >
                    {CATEGORY_LABELS[ingredient.category] ?? ingredient.category}
                  </span>
                  {ingredient.supplier && (
                    <span className="text-[10px] text-text-tertiary truncate max-w-[80px]">
                      {ingredient.supplier}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <ExpiryBadge daysLeft={daysLeft} />
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
              </motion.div>
            </div>
          </div>

          {/* stock bar */}
          <div className="mt-3">
            <LiquidProgress
              value={ingredient.quantity}
              max={Math.max(ingredient.quantity, (ingredient.min_stock ?? 0) * 3, 1)}
              low={ingredient.min_stock}
              unit={ingredient.unit}
            />
          </div>

          {/* compact meta row */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-text-tertiary">
            {ingredient.origin && (
              <span className="flex items-center gap-0.5">
                <MapPin size={9} /> {ingredient.origin}
              </span>
            )}
            {ingredient.purchase_price != null && ingredient.purchase_price > 0 && (
              <span className="font-mono">
                {ingredient.purchase_price.toFixed(2)}€/{ingredient.unit}
              </span>
            )}
            {ingredient.min_stock != null && ingredient.min_stock > 0 && (
              <span className="ml-auto">
                mín: {ingredient.min_stock} {ingredient.unit}
              </span>
            )}
          </div>
        </div>

        {/* expanded details */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3"
                onClick={e => e.stopPropagation()}
              >
                {/* metadata grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {ingredient.supplier && (
                    <>
                      <span className="text-text-tertiary">Proveedor</span>
                      <span className="text-text-secondary">{ingredient.supplier}</span>
                    </>
                  )}
                  {ingredient.origin && (
                    <>
                      <span className="text-text-tertiary">Origen</span>
                      <span className="text-text-secondary">{ingredient.origin}</span>
                    </>
                  )}
                  {ingredient.purchase_price != null && ingredient.purchase_price > 0 && (
                    <>
                      <span className="text-text-tertiary">Precio</span>
                      <span className="text-text-secondary font-mono">
                        {ingredient.purchase_price.toFixed(2)} €/{ingredient.unit}
                      </span>
                    </>
                  )}
                  {ingredient.lot_number && (
                    <>
                      <span className="text-text-tertiary">Lote</span>
                      <span className="text-text-secondary font-mono">{ingredient.lot_number}</span>
                    </>
                  )}
                  <span className="text-text-tertiary">Stock mín.</span>
                  <span className="text-text-secondary">
                    {ingredient.min_stock ?? 0} {ingredient.unit}
                  </span>
                </div>

                {/* flavour profile */}
                {ingredient.flavor_profile && (
                  <div>
                    <span className="text-[10px] text-text-tertiary block mb-1">Perfil</span>
                    <div className="flex flex-wrap gap-1">
                      {ingredient.flavor_profile.split(',').map(f => (
                        <span key={f.trim()} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-text-secondary border border-white/5">
                          {f.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {ingredient.notes && (
                  <p className="text-xs text-text-tertiary italic">{ingredient.notes}</p>
                )}

                {/* quick adjust */}
                {onAdjust && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary mr-auto">Ajuste rápido</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-white/10"
                      onClick={() => onAdjust(ingredient, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-mono w-16 text-center text-text-primary">
                      {ingredient.quantity} {ingredient.unit}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-white/10"
                      onClick={() => onAdjust(ingredient, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* actions */}
                <div className="flex justify-end gap-2 pt-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-text-secondary hover:text-accent-amber"
                      onClick={() => onEdit(ingredient)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-400 hover:text-red-300"
                      onClick={() => onDelete(ingredient)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
