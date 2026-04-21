// src/components/keezer/keezer-twin.tsx — NeoStills v3 SVG Digital Twin
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { TapConfig } from '@/data/kegs'
import { KEG_MAP } from '@/data/kegs'

// ---- SVG sub-components ----

function WaveDefs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={`beer-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
      </linearGradient>
      <clipPath id={`keg-clip-${id}`}>
        <rect x="6" y="20" width="48" height="100" rx="6" />
      </clipPath>
    </defs>
  )
}

/** Animated wave surface on top of the beer level */
function WaveSurface({ id, y, color }: { id: string; y: number; color: string }) {
  return (
    <g clipPath={`url(#keg-clip-${id})`}>
      {/* Wave path 1 (slower) */}
      <motion.path
        d={`M6,${y} Q18,${y - 3} 30,${y} T54,${y} V120 H6 Z`}
        fill={`url(#beer-${id})`}
        animate={{
          d: [
            `M6,${y} Q18,${y - 3} 30,${y} T54,${y} V120 H6 Z`,
            `M6,${y} Q18,${y + 2} 30,${y} T54,${y} V120 H6 Z`,
            `M6,${y} Q18,${y - 3} 30,${y} T54,${y} V120 H6 Z`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Wave path 2 (faster, translucent — gives depth) */}
      <motion.path
        d={`M6,${y + 1} Q22,${y + 3} 38,${y + 1} T54,${y + 1} V120 H6 Z`}
        fill={color}
        opacity={0.25}
        animate={{
          d: [
            `M6,${y + 1} Q22,${y + 3} 38,${y + 1} T54,${y + 1} V120 H6 Z`,
            `M6,${y + 1} Q22,${y - 1} 38,${y + 1} T54,${y + 1} V120 H6 Z`,
            `M6,${y + 1} Q22,${y + 3} 38,${y + 1} T54,${y + 1} V120 H6 Z`,
          ],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </g>
  )
}

/** Single keg SVG — corny style */
function KegSVG({ tap, selected, onClick, pouring }: {
  tap: TapConfig
  selected: boolean
  onClick: () => void
  pouring?: boolean
}) {
  const keg = KEG_MAP.get(tap.keg_type_id ?? '')
  const pct = tap.liters_total > 0 ? tap.liters_remaining / tap.liters_total : 0
  const isEmpty = tap.status === 'empty'
  const isCleaning = tap.status === 'cleaning'

  // Liquid level: 20 = top of keg body, 120 = bottom → range 100px
  const liquidY = 120 - pct * 100

  const levelColor =
    pct > 0.5 ? '#7CB342' :
    pct > 0.2 ? '#F5A623' :
    pct > 0 ? '#EF5350' :
    '#3A4A5C'

  const beerColor = isEmpty ? '#1A2233' : tap.color_hex

  // Scale for different keg sizes
  const scaleY = keg && keg.type === 'commercial' ? 1.15 : keg && keg.capacity_liters <= 10 ? 0.75 : 1

  return (
    <motion.g
      className="cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Selection glow */}
      {selected && (
        <motion.rect
          x="-2" y="4" width="64" height="126" rx="12"
          fill="none"
          stroke="#F5A623"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Tap handle */}
      <rect x="25" y="2" width="10" height="16" rx="3" fill="#5A6B80" />
      <rect x="26" y="0" width="8" height="6" rx="2" fill={isEmpty ? '#3A4A5C' : '#F5A623'} />

      {/* Keg body */}
      <g transform={`translate(0, ${(1 - scaleY) * 50}) scale(1, ${scaleY})`}>
        {/* Metal shell */}
        <rect x="6" y="20" width="48" height="100" rx="6"
          fill="#1A2233"
          stroke={selected ? '#F5A623' : '#2A3A4C'}
          strokeWidth={selected ? 1.5 : 1}
        />

        {/* Beer fill with wave */}
        {!isEmpty && (
          <>
            <WaveDefs id={String(tap.id)} color={beerColor} />
            <WaveSurface id={String(tap.id)} y={liquidY} color={beerColor} />
          </>
        )}

        {/* Cleaning stripes */}
        {isCleaning && (
          <g clipPath={`url(#keg-clip-${tap.id})`} opacity={0.3}>
            {[30, 50, 70, 90, 110].map(y => (
              <motion.rect
                key={y}
                x="6" y={y} width="48" height="4"
                fill="#42A5F5"
                animate={{ y: [y, y - 20, y] }}
                transition={{ duration: 2, repeat: Infinity, delay: y * 0.01 }}
              />
            ))}
          </g>
        )}

        {/* Keg bands (metal ribs) */}
        <rect x="6" y="30" width="48" height="1.5" fill="#2A3A4C" opacity={0.6} />
        <rect x="6" y="109" width="48" height="1.5" fill="#2A3A4C" opacity={0.6} />

        {/* Capacity label */}
        <text x="30" y="70" textAnchor="middle" fill="#5A6B80" fontSize="7" fontFamily="Inter, sans-serif">
          {keg ? `${keg.capacity_liters}L` : '19L'}
        </text>
      </g>

      {/* Level indicator dot */}
      <circle cx="57" cy="72" r="4" fill={levelColor} opacity={0.9} />

      {/* Percentage text */}
      {!isEmpty && (
        <text x="30" y="140" textAnchor="middle" fill="#E8E0D4" fontSize="9"
          fontFamily="'Space Grotesk', sans-serif" fontWeight="600">
          {(pct * 100).toFixed(0)}%
        </text>
      )}

      {/* Pour flow animation */}
      {pouring && !isEmpty && (
        <g>
          {/* Flow stream from tap handle */}
          <motion.rect
            x="29" y="-8" width="2" height="10" rx="1"
            fill={beerColor}
            animate={{ opacity: [0.9, 0.5, 0.9], height: [10, 14, 10] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          />
          {/* Drip drops */}
          <motion.circle
            cx="30" cy="2" r="1.5"
            fill={beerColor}
            animate={{ cy: [2, 12], opacity: [1, 0], r: [1.5, 0.5] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeIn' }}
          />
          <motion.circle
            cx="30" cy="6" r="1"
            fill={beerColor}
            opacity={0.6}
            animate={{ cy: [6, 14], opacity: [0.6, 0], r: [1, 0.3] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
          />
        </g>
      )}
    </motion.g>
  )
}

// ---- Keezer box (the freezer/fridge unit) ----

function KeezerBox({ taps }: { taps: number }) {
  const width = Math.max(100, taps * 80 + 40)
  return (
    <g>
      {/* Shadow */}
      <rect x="10" y="145" width={width - 20} height="8" rx="4"
        fill="black" opacity={0.3} />

      {/* Main body */}
      <rect x="0" y="15" width={width} height="135" rx="10"
        fill="#111820"
        stroke="#2A3A4C"
        strokeWidth="1"
      />

      {/* Top lid */}
      <rect x="-2" y="12" width={width + 4} height="10" rx="5"
        fill="#1A2233"
        stroke="#2A3A4C"
        strokeWidth="0.5"
      />

      {/* Thermometer icon area */}
      <circle cx={width - 18} cy="142" r="6" fill="#0A0E14" stroke="#2A3A4C" />
      <rect x={width - 19} y="132" width="2" height="10" rx="1" fill="#42A5F5" />

      {/* Vent lines on front */}
      {[130, 134, 138].map(y => (
        <line key={y} x1="14" y1={y} x2={width / 3} y2={y}
          stroke="#2A3A4C" strokeWidth="0.5" opacity={0.4} />
      ))}
    </g>
  )
}

// ---- Main component ----

interface KeezerTwinProps {
  taps: TapConfig[]
  selectedTap: number | null
  onSelectTap: (id: number) => void
  keezerTemp?: number
  pouringTapId?: number | null
}

export default function KeezerTwin({ taps, selectedTap, onSelectTap, keezerTemp = 3, pouringTapId }: KeezerTwinProps) {
  const tapCount = taps.length
  const svgWidth = Math.max(200, tapCount * 80 + 40)
  const svgHeight = 195

  const tapElements = useMemo(() => {
    return taps.map((tap, i) => {
      const xOffset = 20 + i * 80
      return (
        <g key={tap.id} transform={`translate(${xOffset}, 0)`}>
          <KegSVG
            tap={tap}
            selected={selectedTap === tap.id}
            onClick={() => onSelectTap(tap.id)}
            pouring={pouringTapId === tap.id}
          />
          {/* Tap number label below */}
          <text x="30" y="157" textAnchor="middle" fill="#5A6B80"
            fontSize="8" fontFamily="Inter, sans-serif">
            LINEA {tap.id}
          </text>
          {/* Beer name below */}
          <text x="30" y="170" textAnchor="middle" fill="#E8E0D4"
            fontSize="8" fontFamily="'Space Grotesk', sans-serif" fontWeight="500">
            {tap.beer_name ? (tap.beer_name.length > 12 ? tap.beer_name.slice(0, 11) + '…' : tap.beer_name) : '—'}
          </text>
          {/* Volume remaining */}
          <text x="30" y="182" textAnchor="middle" fill="#8B9BB4"
            fontSize="7" fontFamily="'JetBrains Mono', monospace">
            {tap.liters_remaining > 0 ? `${tap.liters_remaining.toFixed(1)}L` : ''}
          </text>
        </g>
      )
    })
  }, [taps, selectedTap, onSelectTap, pouringTapId])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      overflowX: 'auto',
      padding: '16px 0',
    }}>
      <svg
        viewBox={`-10 -5 ${svgWidth + 20} ${svgHeight}`}
        width="100%"
        style={{ maxWidth: svgWidth + 20, height: 'auto' }}
        role="img"
        aria-label="Keezer digital twin visualization"
      >
        {/* Keezer box behind kegs */}
        <KeezerBox taps={tapCount} />

        {/* Temp reading */}
        <text x={svgWidth - 18} y="148" textAnchor="middle"
          fill="#42A5F5" fontSize="6" fontFamily="'JetBrains Mono', monospace">
          {keezerTemp.toFixed(1)}°
        </text>

        {/* Kegs */}
        {tapElements}
      </svg>
    </div>
  )
}
