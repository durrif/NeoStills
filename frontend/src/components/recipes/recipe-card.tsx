// src/components/recipes/recipe-card.tsx — NeoStills v3
import { motion } from 'framer-motion'
import { Droplets, Wheat, Leaf, Edit3, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CanBrewBadge } from './can-brew-badge'
import { cn } from '@/lib/utils'
import type { Recipe } from '@/lib/types'

interface RecipeCardProps {
  recipe: Recipe
  index?: number
  onEdit?: () => void
  onBrew?: () => void
}

function srmToHex(srm: number): string {
  // SRM to approximate hex colour (simplified Morey equation palette)
  const clamp = Math.min(Math.max(Math.round(srm), 1), 40);
  const palette: Record<number, string> = {
    1: "#F3F993", 2: "#F5F75C", 3: "#F6F513", 4: "#EAE510",
    5: "#E0D01B", 6: "#D5BC26", 7: "#CDAA37", 8: "#C1963C",
    9: "#BE8C3A", 10: "#BE823A", 11: "#BE7732", 12: "#BE6B25",
    13: "#BE611D", 14: "#BE5716", 15: "#BE4E0F", 16: "#BE430A",
    17: "#B03A05", 18: "#8E2D04", 19: "#701D05", 20: "#5A0F05",
    21: "#4F0E03", 22: "#430C03", 23: "#390A03", 24: "#300802",
    25: "#280702", 26: "#200601", 27: "#180501", 28: "#100300",
    29: "#0C0200", 30: "#080100", 31: "#060100", 32: "#040000",
    33: "#030000", 34: "#020000", 35: "#010000", 40: "#010000",
  };
  return palette[clamp] ?? "#A06010";
}

export function RecipeCard({ recipe, index = 0, onEdit, onBrew }: RecipeCardProps) {
  const totalIngredients =
    (recipe.fermentables?.length ?? 0) +
    (recipe.hops?.length ?? 0) +
    (recipe.yeasts?.length ?? 0) +
    (recipe.adjuncts?.length ?? 0)

  const statItems = [
    recipe.abv != null ? { label: 'ABV', value: `${recipe.abv.toFixed(1)}%` } : null,
    recipe.og != null ? { label: 'OG', value: recipe.og.toFixed(3) } : null,
    recipe.batch_size_liters
      ? { label: 'Volumen', value: `${recipe.batch_size_liters}L` }
      : totalIngredients > 0
        ? { label: 'Insumos', value: `${totalIngredients}` }
        : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="glass-card rounded-xl border border-white/10 hover:border-accent-amber/40 transition-all h-full group cursor-pointer overflow-hidden"
        onClick={onEdit}
      >
        {/* SRM colour bar */}
        {recipe.srm != null && (
          <div
            className="h-1.5"
            style={{ background: srmToHex(recipe.srm) }}
          />
        )}

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-sm leading-tight text-text-primary group-hover:text-accent-amber transition-colors line-clamp-2">
                {recipe.name}
              </h3>
              {recipe.style && (
                <Badge variant="outline" className="w-fit text-[10px] mt-1.5 border-white/10 text-text-tertiary">
                  {recipe.style}
                </Badge>
              )}
            </div>
            <CanBrewBadge recipeId={Number(recipe.id)} compact />
          </div>

          {/* Stats grid */}
          <div className={cn('grid gap-2', statItems.length > 2 ? 'grid-cols-3' : 'grid-cols-2')}>
            {statItems.map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-mono text-sm font-bold text-text-primary">{item.value}</p>
                <p className="text-[10px] text-text-tertiary">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Ingredients summary */}
          <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
            {(recipe.fermentables?.length ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <Wheat size={10} className="text-amber-400" />
                {recipe.fermentables!.length}
              </span>
            )}
            {(recipe.hops?.length ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <Leaf size={10} className="text-green-400" />
                {recipe.hops!.length}
              </span>
            )}
            {recipe.batch_size_liters && (
              <span className="flex items-center gap-0.5">
                <Droplets size={10} className="text-blue-400" />
                {recipe.batch_size_liters}L
              </span>
            )}
          </div>

          {/* Hover actions */}
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
            <Button size="sm" variant="outline"
              className="flex-1 border-white/10 text-text-secondary text-[10px] h-7"
              onClick={e => { e.stopPropagation(); onEdit?.() }}>
              <Edit3 size={10} className="mr-1" /> Editar
            </Button>
            <Button size="sm"
              className="flex-1 bg-accent-amber text-bg-primary text-[10px] h-7"
              onClick={e => { e.stopPropagation(); onBrew?.() }}>
              <PlayCircle size={10} className="mr-1" /> Iniciar lote
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
