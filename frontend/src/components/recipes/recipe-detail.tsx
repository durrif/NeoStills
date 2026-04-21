// src/components/recipes/recipe-detail.tsx
import { useTranslation } from 'react-i18next'
import { Clock, Droplets, Flame, Loader2, Wheat, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CanBrewBadge } from "./can-brew-badge";
import type { Recipe, RecipeIngredient } from "@/lib/types";

interface RecipeDetailProps {
  recipe: Recipe;
  isLoading?: boolean;
}

export function RecipeDetail({ recipe, isLoading = false }: RecipeDetailProps) {
  const { t } = useTranslation('common')
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  const sections: { label: string; items: RecipeIngredient[] }[] = [
    { label: t('recipes.fermentables'), items: recipe.fermentables ?? [] },
    { label: t('recipes.hops'), items: recipe.hops ?? [] },
    { label: t('recipes.yeasts'), items: recipe.yeasts ?? [] },
    { label: t('recipes.adjuncts'), items: recipe.adjuncts ?? [] },
  ].filter((s) => s.items.length > 0);

  const ingredientCount = sections.reduce((total, section) => total + section.items.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{recipe.name}</h1>
          {recipe.style && (
            <Badge variant="outline" className="mt-1 border-zinc-600 text-zinc-400">
              {recipe.style}
            </Badge>
          )}
        </div>
        <CanBrewBadge recipeId={Number(recipe.id)} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Zap className="w-4 h-4 text-amber-400" />, label: "ABV", value: recipe.abv != null ? `${recipe.abv.toFixed(1)}%` : "—" },
          { icon: <Droplets className="w-4 h-4 text-blue-400" />, label: t('recipes.volume'), value: recipe.batch_size_liters ? `${recipe.batch_size_liters} L` : "—" },
          { icon: <Clock className="w-4 h-4 text-zinc-400" />, label: "OG", value: recipe.og ? recipe.og.toFixed(3) : "—" },
          { icon: <Wheat className="w-4 h-4 text-accent-copper" />, label: t('recipes.ingredients'), value: ingredientCount > 0 ? ingredientCount.toString() : "—" },
        ].map(({ icon, label, value }) => (
          <Card key={label} className="bg-zinc-900/60 border-zinc-700">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-zinc-400">{label}</span></div>
              <p className="font-semibold text-lg">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ingredients by use */}
      <Card className="bg-zinc-900/60 border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('recipes.ingredients')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {sections.map(({ label, items }, idx) => (
            <div key={label}>
              {idx > 0 && <Separator className="my-3 bg-zinc-800" />}
              <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
                {label}
              </p>
              <ul className="space-y-1.5">
                {items.map((ing, i) => (
                  <li
                    key={ing.name + i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-white">
                      {ing.name}
                    </span>
                    <span className="text-zinc-400 text-xs">
                      {ing.amount_kg ? `${ing.amount_kg} kg` : ing.amount_g ? `${ing.amount_g} g` : ''}
                      {ing.time_min != null && ` · ${ing.time_min} min`}
                      {ing.alpha_pct != null && ` · ${ing.alpha_pct}% α`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mash schedule */}
      {recipe.mash_steps && recipe.mash_steps.length > 0 && (
        <Card className="bg-zinc-900/60 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" /> {t('recipes.mash_schedule')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {recipe.mash_steps.map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="font-medium">{step.name ?? `${t('recipes.step')} ${i + 1}`}</span>
                  <span className="text-zinc-400 ml-auto text-xs">
                    {step.temp_c} °C · {step.duration_min ?? step.time_min} min
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {recipe.notes && (
        <Card className="bg-zinc-900/60 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('recipes.notes')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-zinc-300 whitespace-pre-line">{recipe.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
