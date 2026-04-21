// frontend/src/components/water/water-comparison-chart.tsx — NeoStills v4

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { useState } from 'react'
import { useWaterStore } from '@/stores/water-store'
import { ION_KEYS, ION_LABELS, WATER_PROFILES } from '@/data/water-profiles'

type ChartMode = 'radar' | 'bar'

export function WaterComparisonChart() {
  const [mode, setMode] = useState<ChartMode>('bar')
  const {
    sourceProfileId, targetProfileId,
    getSourceWater, getTargetWater, getDilutedSource, getAdjustedWater,
    roFraction,
  } = useWaterStore()

  const source = getSourceWater()
  const target = getTargetWater()
  const diluted = getDilutedSource()
  const adjusted = getAdjustedWater()

  const hasSource = ION_KEYS.some((ion) => source[ion] > 0)
  const hasTarget = ION_KEYS.some((ion) => target[ion] > 0)
  const hasDilution = roFraction > 0

  const sourceName = sourceProfileId
    ? WATER_PROFILES.find((p) => p.id === sourceProfileId)?.name ?? 'Origen'
    : 'Origen'
  const targetName = targetProfileId
    ? WATER_PROFILES.find((p) => p.id === targetProfileId)?.name ?? 'Objetivo'
    : 'Objetivo'

  const chartData = ION_KEYS.map((ion) => ({
    ion: ION_LABELS[ion]?.label ?? ion,
    source: Math.round(source[ion]),
    ...(hasDilution ? { diluted: Math.round(diluted[ion]) } : {}),
    adjusted: Math.round(adjusted[ion]),
    ...(hasTarget ? { target: Math.round(target[ion]) } : {}),
  }))

  // Normalize for radar (0-100 scale)
  const maxValues: Record<string, number> = {}
  ION_KEYS.forEach((ion) => {
    maxValues[ION_LABELS[ion]?.label ?? ion] = Math.max(
      source[ion], adjusted[ion], target[ion], 1,
    )
  })

  const radarData = ION_KEYS.map((ion) => {
    const label = ION_LABELS[ion]?.label ?? ion
    const max = maxValues[label] ?? 1
    return {
      ion: label,
      source: Math.round((source[ion] / max) * 100),
      adjusted: Math.round((adjusted[ion] / max) * 100),
      ...(hasTarget ? { target: Math.round((target[ion] / max) * 100) } : {}),
    }
  })

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#111A24',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      fontSize: '11px',
    },
    labelStyle: { color: '#E8E0D4' },
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Comparación de perfiles
        </h3>
        <div className="flex bg-bg-deep/70 border border-accent-cobalt/12 rounded-xl p-0.5">
          <button
            onClick={() => setMode('bar')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'bar'
                ? 'bg-accent-amber/20 text-accent-amber'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Barras
          </button>
          <button
            onClick={() => setMode('radar')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'radar'
                ? 'bg-accent-amber/20 text-accent-amber'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Radar
          </button>
        </div>
      </div>

      {!hasSource && !hasTarget ? (
        <div className="flex items-center justify-center h-48 text-sm text-text-tertiary">
          Selecciona agua de origen y/o objetivo para ver la comparación
        </div>
      ) : mode === 'bar' ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="ion"
              tick={{ fill: '#8B9BB4', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8B9BB4', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              iconSize={8}
            />
            {hasSource && (
              <Bar
                dataKey="source"
                name={sourceName}
                fill="#5F7EA6"
                opacity={0.35}
                radius={[2, 2, 0, 0]}
              />
            )}
            {hasDilution && (
              <Bar
                dataKey="diluted"
                name="Diluido"
                fill="#8794B0"
                opacity={0.35}
                radius={[2, 2, 0, 0]}
              />
            )}
            <Bar
              dataKey="adjusted"
              name="Ajustado"
              fill="#B87333"
              opacity={0.85}
              radius={[2, 2, 0, 0]}
            />
            {hasTarget && (
              <Bar
                dataKey="target"
                name={targetName}
                fill="#D1A178"
                opacity={0.6}
                radius={[2, 2, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="ion"
              tick={{ fill: '#8B9BB4', fontSize: 10 }}
            />
            <PolarRadiusAxis
              tick={false}
              axisLine={false}
              domain={[0, 100]}
            />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
            {hasSource && (
              <Radar
                name={sourceName}
                dataKey="source"
                stroke="#5F7EA6"
                fill="#5F7EA6"
                fillOpacity={0.15}
              />
            )}
            <Radar
              name="Ajustado"
              dataKey="adjusted"
              stroke="#B87333"
              fill="#B87333"
              fillOpacity={0.25}
            />
            {hasTarget && (
              <Radar
                name={targetName}
                dataKey="target"
                stroke="#D1A178"
                fill="#D1A178"
                fillOpacity={0.15}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
