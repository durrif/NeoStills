// frontend/src/pages/brewing.tsx — NeoStills v3 Brew Day Command Center
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FlaskConical, PlayCircle, Thermometer, Droplet,
  ChevronRight, Clock, Zap, ListChecks, Box,
} from 'lucide-react'
import { toast } from 'sonner'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

import { useUIStore } from '@/stores/ui-store'
import { useBrewStore } from '@/stores/brew-store'
import {
  useBrewSessions,
  useActiveSession,
  useAdvancePhase,
  useCreateSession,
  useRecipes,
} from '@/hooks/use-brewing'
import { useStartBrewFromRecipe, useRecipe } from '@/hooks/use-recipes'
import { BrewTimeline, type BrewPhase as TimelinePhase } from '@/components/brewing/brew-timeline'
import { DualTimer } from '@/components/brewing/dual-timer'
import { KanbanTimeline, BREW_PHASES } from '@/components/brewing/kanban-timeline'
import { HopSchedule, HopAlertBanner, type HopAddition } from '@/components/brewing/hop-schedule'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NewBatchModal } from '@/components/brewing/new-batch-modal'
import type { BrewSession, BrewPhase, Recipe, RecipeIngredient } from '@/lib/types'

/* ── Utilities ─────────────────────────────────────────────────── */
function phaseIndex(phase: BrewPhase): number {
  const order: BrewPhase[] = ['planned', 'mashing', 'fermenting', 'stripping_run', 'spirit_run', 'cuts_collection', 'aging', 'bottling', 'completed']
  return order.indexOf(phase)
}

function nextPhase(phase: BrewPhase): BrewPhase | undefined {
  const order: BrewPhase[] = ['planned', 'mashing', 'fermenting', 'stripping_run', 'spirit_run', 'cuts_collection', 'aging', 'bottling', 'completed']
  const idx = order.indexOf(phase)
  return idx < order.length - 1 ? order[idx + 1] : undefined
}

function buildHopSchedule(recipe?: Recipe | null): HopAddition[] {
  if (!recipe?.hops) return []
  return (recipe.hops as RecipeIngredient[])
    .filter(h => h.use === 'boil' || !h.use)
    .map(h => ({
      name: h.name,
      amount_g: h.amount_g ?? (h.amount_kg ? h.amount_kg * 1000 : 0),
      time_min: h.time_min ?? 60,
      alpha_pct: h.alpha_pct,
      ibu_contribution: undefined,
      added: false,
      notified: false,
    }))
    .sort((a, b) => b.time_min - a.time_min)
}

/* ══════════════════════════════════════════════════════════════════
   3D STILL MODELS — configurable by type
   ══════════════════════════════════════════════════════════════════ */
type StillType = 'pot_still' | 'reflux' | 'hybrid' | 'alquitara' | 'column'

const STILL_LABELS: Record<StillType, string> = {
  pot_still:  'Pot Still (Cobre)',
  reflux:     'Reflux / Columna',
  hybrid:     'Hybrid Still',
  alquitara:  'Alquitara',
  column:     'Column Still',
}

/* shared copper material args */
const copperProps = { color: '#B87333', metalness: 0.82, roughness: 0.28, envMapIntensity: 1.0 }
const copperDarkProps = { color: '#9B6220', metalness: 0.8, roughness: 0.35, envMapIntensity: 0.8 }
const copperBrightProps = { color: '#D4A060', metalness: 0.85, roughness: 0.22, envMapIntensity: 1.1 }

/* — POT STILL (classic onion-shaped copper still) ——————————— */
function PotStillModel({ phase }: { phase?: string }) {
  // LatheGeometry for the onion/pot body
  const bodyPts = useMemo(() => [
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.48, 0.08),
    new THREE.Vector2(0.72, 0.5),
    new THREE.Vector2(0.92, 1.1),
    new THREE.Vector2(0.94, 1.65),
    new THREE.Vector2(0.90, 2.1),
    new THREE.Vector2(0.72, 2.55),
    new THREE.Vector2(0.52, 2.85),
    new THREE.Vector2(0.38, 3.05),
    new THREE.Vector2(0.30, 3.2),
    new THREE.Vector2(0.25, 3.35),
  ], [])

  const helmetPts = useMemo(() => [
    new THREE.Vector2(0.25, 0),
    new THREE.Vector2(0.28, 0.12),
    new THREE.Vector2(0.24, 0.28),
    new THREE.Vector2(0.18, 0.42),
    new THREE.Vector2(0.12, 0.52),
    new THREE.Vector2(0.09, 0.6),
  ], [])

  const isHeating = phase === 'stripping_run' || phase === 'spirit_run'

  return (
    <group position={[0, 0, 0]}>
      {/* Main pot body */}
      <mesh castShadow>
        <latheGeometry args={[bodyPts, 48]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Bottom plate / base ring */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.08, 32]} />
        <meshStandardMaterial {...copperDarkProps} />
      </mesh>

      {/* Rivet band rings */}
      {[0.5, 1.0, 1.6, 2.2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[0.93 - i * 0.04, 0.018, 6, 48]} />
          <meshStandardMaterial {...copperDarkProps} />
        </mesh>
      ))}

      {/* Helmet (onion top) */}
      <group position={[0, 3.35, 0]}>
        <mesh castShadow>
          <latheGeometry args={[helmetPts, 32]} />
          <meshStandardMaterial {...copperBrightProps} />
        </mesh>
      </group>

      {/* Swan neck — vertical tube rising from helmet */}
      <mesh position={[0, 3.95, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.2, 14]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Lyne arm — angled tube going right + down */}
      <group position={[0, 4.42, 0]} rotation={[0, 0, -Math.PI / 4.5]}>
        <mesh position={[0.7, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 1.6, 12]} />
          <meshStandardMaterial {...copperProps} />
        </mesh>
      </group>

      {/* Worm condenser coil (simplified as stack of tori) */}
      <group position={[1.95, 3.5, 0]}>
        {[0, 0.22, 0.44, 0.66, 0.88].map((y, i) => (
          <mesh key={i} position={[0, -y, 0]}>
            <torusGeometry args={[0.35 - i * 0.02, 0.055, 8, 24]} />
            <meshStandardMaterial {...copperProps} />
          </mesh>
        ))}
        {/* Condenser shell */}
        <mesh position={[0, -0.44, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 1.1, 16]} />
          <meshStandardMaterial color="#6888AA" metalness={0.55} roughness={0.35} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Spirit safe / collection jar */}
      <mesh position={[2.5, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 14]} />
        <meshStandardMaterial color="#AACCDD" metalness={0.3} roughness={0.1} transparent opacity={0.55} />
      </mesh>

      {/* Flame glow under pot when heating */}
      {isHeating && (
        <pointLight position={[0, 0.2, 0]} intensity={2.5} color="#FF6A00" distance={3} decay={2.5} />
      )}

      {/* Heat source ring */}
      <mesh position={[0, 0.06, 0]}>
        <torusGeometry args={[0.42, 0.055, 8, 32]} />
        <meshStandardMaterial
          color={isHeating ? '#FF6A00' : '#555'}
          emissive={isHeating ? '#FF4400' : '#000'}
          emissiveIntensity={isHeating ? 1.8 : 0}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/* — REFLUX / COLUMN STILL ——————————————————————————————— */
function RefluxStillModel({ phase }: { phase?: string }) {
  const isHeating = phase === 'stripping_run' || phase === 'spirit_run'
  const PLATES = 8

  return (
    <group position={[0, 0, 0]}>
      {/* Boiler (smaller pot at base) */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 1.2, 32]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>
      {/* Boiler dome top */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.75, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...copperBrightProps} />
      </mesh>
      {/* Boiler base */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.12, 32]} />
        <meshStandardMaterial {...copperDarkProps} />
      </mesh>

      {/* Column body */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 4.4, 20]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Plate rings — visible perforated plates */}
      {Array.from({ length: PLATES }, (_, i) => (
        <group key={i} position={[0, 1.7 + i * (4.4 / PLATES), 0]}>
          <mesh>
            <cylinderGeometry args={[0.33, 0.33, 0.055, 20]} />
            <meshStandardMaterial {...copperDarkProps} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.33, 0.022, 6, 20]} />
            <meshStandardMaterial color="#7A4822" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Dephlegmator (wide cylinder near top) */}
      <mesh position={[0, 6.0, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.42, 0.9, 20]} />
        <meshStandardMaterial color="#6888AA" metalness={0.6} roughness={0.25} transparent opacity={0.6} />
      </mesh>
      {/* Dephlegmator coolant bands */}
      {[5.7, 5.9, 6.1, 6.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[0.46, 0.025, 6, 20]} />
          <meshStandardMaterial {...copperDarkProps} />
        </mesh>
      ))}

      {/* Top condenser (small cylinder) */}
      <mesh position={[0, 6.65, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 14]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Output lyne arm */}
      <group position={[0.28, 6.65, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh position={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 1.0, 10]} />
          <meshStandardMaterial {...copperProps} />
        </mesh>
      </group>

      {/* Heat ring */}
      <mesh position={[0, 0.12, 0]}>
        <torusGeometry args={[0.6, 0.06, 8, 32]} />
        <meshStandardMaterial
          color={isHeating ? '#FF6A00' : '#555'}
          emissive={isHeating ? '#FF4400' : '#000'}
          emissiveIntensity={isHeating ? 1.8 : 0}
          toneMapped={false}
        />
      </mesh>
      {isHeating && (
        <pointLight position={[0, 0.3, 0]} intensity={2.2} color="#FF6A00" distance={3} decay={2.5} />
      )}
    </group>
  )
}

/* — HYBRID STILL ————————————————————————————————————————— */
function HybridStillModel({ phase }: { phase?: string }) {
  const isHeating = phase === 'stripping_run' || phase === 'spirit_run'

  const bodyPts = useMemo(() => [
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.45, 0.06),
    new THREE.Vector2(0.68, 0.45),
    new THREE.Vector2(0.85, 1.05),
    new THREE.Vector2(0.82, 1.6),
    new THREE.Vector2(0.62, 2.0),
    new THREE.Vector2(0.42, 2.25),
    new THREE.Vector2(0.32, 2.42),
  ], [])

  return (
    <group>
      {/* Pot body */}
      <mesh castShadow>
        <latheGeometry args={[bodyPts, 44]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Pot collar */}
      <mesh position={[0, 2.42, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.15, 20]} />
        <meshStandardMaterial {...copperDarkProps} />
      </mesh>

      {/* Detachable column (union joint visible) */}
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.12, 20]} />
        <meshStandardMaterial color="#8B6820" metalness={0.88} roughness={0.2} />
      </mesh>
      <mesh position={[0, 4.1, 0]} castShadow>
        <cylinderGeometry args={[0.29, 0.29, 2.8, 18]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Column plates (fewer than pure reflux) */}
      {[0, 0.55, 1.1, 1.65, 2.2].map((y, i) => (
        <mesh key={i} position={[0, 2.8 + y, 0]}>
          <cylinderGeometry args={[0.30, 0.30, 0.05, 18]} />
          <meshStandardMaterial {...copperDarkProps} />
        </mesh>
      ))}

      {/* Swan neck top */}
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.7, 12]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Lyne arm */}
      <group position={[0, 5.55, 0]} rotation={[0, 0, -Math.PI / 5]}>
        <mesh position={[0.65, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 1.3, 10]} />
          <meshStandardMaterial {...copperProps} />
        </mesh>
      </group>

      {/* Small condenser */}
      <group position={[1.7, 4.8, 0]}>
        {[0, 0.2, 0.4].map((y, i) => (
          <mesh key={i} position={[0, -y, 0]}>
            <torusGeometry args={[0.3 - i * 0.02, 0.05, 8, 20]} />
            <meshStandardMaterial {...copperProps} />
          </mesh>
        ))}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.5, 16]} />
          <meshStandardMaterial color="#6888AA" metalness={0.5} roughness={0.35} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Rivet bands */}
      {[0.5, 1.1, 1.7].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[0.85 - i * 0.03, 0.016, 6, 44]} />
          <meshStandardMaterial {...copperDarkProps} />
        </mesh>
      ))}

      {/* Heat */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.38, 0.055, 8, 32]} />
        <meshStandardMaterial
          color={isHeating ? '#FF6A00' : '#555'}
          emissive={isHeating ? '#FF4400' : '#000'}
          emissiveIntensity={isHeating ? 1.8 : 0}
          toneMapped={false}
        />
      </mesh>
      {isHeating && (
        <pointLight position={[0, 0.3, 0]} intensity={2.2} color="#FF6A00" distance={3} decay={2.5} />
      )}
    </group>
  )
}

/* — ALQUITARA (Moorish-style) ——————————————————————————— */
function AlquitaraModel({ phase }: { phase?: string }) {
  const isHeating = phase === 'stripping_run' || phase === 'spirit_run'

  const bodyPts = useMemo(() => [
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.6, 0.1),
    new THREE.Vector2(1.05, 0.7),   // very wide belly
    new THREE.Vector2(1.1, 1.4),
    new THREE.Vector2(1.0, 2.1),
    new THREE.Vector2(0.78, 2.6),
    new THREE.Vector2(0.5, 2.9),
    new THREE.Vector2(0.3, 3.1),
    new THREE.Vector2(0.22, 3.3),
  ], [])

  return (
    <group>
      {/* Wide belly pot */}
      <mesh castShadow>
        <latheGeometry args={[bodyPts, 48]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Decorative horizontal bands */}
      {[0.4, 0.9, 1.5, 2.1, 2.6].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[1.05 - Math.abs(i - 2.5) * 0.05, 0.022, 6, 48]} />
          <meshStandardMaterial {...copperDarkProps} />
        </mesh>
      ))}

      {/* Alembic head (cooling dome + water channel) */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <sphereGeometry args={[0.5, 32, 18]} />
        <meshStandardMaterial {...copperBrightProps} />
      </mesh>
      {/* Water channel ring around head */}
      <mesh position={[0, 3.3, 0]}>
        <torusGeometry args={[0.52, 0.1, 8, 32]} />
        <meshStandardMaterial color="#6888AA" metalness={0.5} roughness={0.3} transparent opacity={0.5} />
      </mesh>

      {/* Spout (beak) */}
      <group position={[0, 3.3, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <mesh position={[0.7, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 1.4, 10]} />
          <meshStandardMaterial {...copperProps} />
        </mesh>
      </group>

      {/* Collection vessel */}
      <mesh position={[1.45, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#AACCDD" metalness={0.3} roughness={0.1} transparent opacity={0.6} />
      </mesh>

      {/* Heat */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.5, 0.055, 8, 32]} />
        <meshStandardMaterial
          color={isHeating ? '#FF6A00' : '#555'}
          emissive={isHeating ? '#FF4400' : '#000'}
          emissiveIntensity={isHeating ? 1.8 : 0}
          toneMapped={false}
        />
      </mesh>
      {isHeating && (
        <pointLight position={[0, 0.3, 0]} intensity={2.0} color="#FF6A00" distance={3} decay={2.5} />
      )}
    </group>
  )
}

/* — CONTINUOUS COLUMN STILL ——————————————————————————— */
function ColumnStillModel({ phase }: { phase?: string }) {
  const isHeating = phase === 'stripping_run' || phase === 'spirit_run'
  const PLATES = 14

  return (
    <group>
      {/* Analyzer column */}
      <mesh position={[-0.6, 3.8, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 7.6, 20]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Rectifier column */}
      <mesh position={[0.6, 4.2, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 8.4, 20]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Plates - analyzer */}
      {Array.from({ length: PLATES / 2 }, (_, i) => (
        <mesh key={i} position={[-0.6, 0.5 + i * (7.6 / (PLATES / 2)), 0]}>
          <torusGeometry args={[0.43, 0.022, 6, 20]} />
          <meshStandardMaterial {...copperDarkProps} />
        </mesh>
      ))}

      {/* Plates - rectifier */}
      {Array.from({ length: PLATES / 2 }, (_, i) => (
        <mesh key={i} position={[0.6, 0.5 + i * (8.4 / (PLATES / 2)), 0]}>
          <torusGeometry args={[0.37, 0.022, 6, 20]} />
          <meshStandardMaterial {...copperDarkProps} />
        </mesh>
      ))}

      {/* Cross-pipe between columns */}
      <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 10]} />
        <meshStandardMaterial {...copperProps} />
      </mesh>

      {/* Condenser at top of rectifier */}
      <mesh position={[0.6, 8.55, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 16]} />
        <meshStandardMaterial color="#6888AA" metalness={0.6} roughness={0.25} transparent opacity={0.5} />
      </mesh>

      {/* Steam inlet at bottom of analyzer */}
      <mesh position={[-0.6, 0.15, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.3, 20]} />
        <meshStandardMaterial {...copperDarkProps} />
      </mesh>

      {/* Heat */}
      <mesh position={[-0.6, 0.12, 0]}>
        <torusGeometry args={[0.35, 0.055, 8, 32]} />
        <meshStandardMaterial
          color={isHeating ? '#FF6A00' : '#555'}
          emissive={isHeating ? '#FF4400' : '#000'}
          emissiveIntensity={isHeating ? 1.8 : 0}
          toneMapped={false}
        />
      </mesh>
      {isHeating && (
        <pointLight position={[-0.6, 0.3, 0]} intensity={2.0} color="#FF6A00" distance={3} decay={2.5} />
      )}
    </group>
  )
}

/* — Stone floor + distillery walls ——————————————————————— */
function DistilleryFloor() {
  return (
    <group>
      {/* Stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#2C2822" roughness={0.92} metalness={0.04} />
      </mesh>
      {/* Stone tile grout lines */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`x${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-7.5 + i * 2.5, 0.003, 0]}>
          <planeGeometry args={[0.04, 14]} />
          <meshBasicMaterial color="#1A1816" />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`z${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -5 + i * 2]}>
          <planeGeometry args={[18, 0.04]} />
          <meshBasicMaterial color="#1A1816" />
        </mesh>
      ))}
      {/* Back brick wall */}
      <mesh position={[0, 5, -7]} receiveShadow>
        <boxGeometry args={[18, 10, 0.28]} />
        <meshStandardMaterial color="#3A3028" roughness={0.95} metalness={0.03} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-9, 5, 0]} receiveShadow>
        <boxGeometry args={[0.28, 10, 14]} />
        <meshStandardMaterial color="#3A3028" roughness={0.95} metalness={0.03} />
      </mesh>
      <mesh position={[9, 5, 0]} receiveShadow>
        <boxGeometry args={[0.28, 10, 14]} />
        <meshStandardMaterial color="#3A3028" roughness={0.95} metalness={0.03} />
      </mesh>
    </group>
  )
}

/* — Torch wall light ——————————————————————————————————— */
function WallTorch({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
        <meshStandardMaterial color="#5A3010" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#FF8800" emissive="#FF6600" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.3, 0]} intensity={1.8} color="#FF7722" distance={5} decay={2} />
    </group>
  )
}

/* — Phase info HTML overlay ——————————————————————————————— */
function PhaseOverlay({ phase, stillType }: { phase?: string; stillType: StillType }) {
  const phaseLabels: Record<string, string> = {
    stripping_run: 'Stripping Run activo',
    spirit_run:    'Spirit Run activo',
    mashing:       'Mashing en curso',
    fermenting:    'Fermentación activa',
  }
  const label = phase ? (phaseLabels[phase] ?? '') : ''

  return (
    <Html position={[0, 8.5, -6.5]} center distanceFactor={16} transform>
      <div className="bg-[#0F0F0F]/85 border border-[#B87333]/40 rounded px-4 py-2 text-[11px] whitespace-nowrap pointer-events-none">
        <span className="text-[#B87333] font-semibold">{STILL_LABELS[stillType]}</span>
        {label && (
          <>
            <span className="text-[#555] mx-2">|</span>
            <span className="text-[#4ADE80] font-mono">{label}</span>
          </>
        )}
      </div>
    </Html>
  )
}

/* — Full 3D still scene ————————————————————————————————— */
function Still3DScene({ stillType, phase }: { stillType: StillType; phase?: string }) {
  const scale = stillType === 'column' ? 0.72 : 0.85
  const yOffset = stillType === 'column' ? 0 : 0.2

  return (
    <>
      <fog attach="fog" args={['#1A1410', 22, 55]} />
      <color attach="background" args={['#1A1410']} />

      <hemisphereLight args={['#886644', '#3A2010', 1.2]} />
      <ambientLight intensity={1.0} color="#FFEECC" />
      <pointLight position={[0, 9, 2]} intensity={3.5} color="#FFEECC" distance={22} castShadow />
      <pointLight position={[4, 6, 4]} intensity={2.0} color="#FFD580" distance={16} />
      <pointLight position={[-4, 6, 4]} intensity={2.0} color="#FFD580" distance={16} />
      <pointLight position={[0, 4, 6]} intensity={1.5} color="#FFF0D8" distance={14} />

      <DistilleryFloor />
      <WallTorch position={[-8.6, 3.5, -3]} />
      <WallTorch position={[8.6, 3.5, -3]} />
      <WallTorch position={[-8.6, 3.5, 3]} />

      {/* Still model centered */}
      <group position={[0, yOffset, -1]} scale={[scale, scale, scale]}>
        {stillType === 'pot_still'  && <PotStillModel  phase={phase} />}
        {stillType === 'reflux'     && <RefluxStillModel phase={phase} />}
        {stillType === 'hybrid'     && <HybridStillModel phase={phase} />}
        {stillType === 'alquitara'  && <AlquitaraModel  phase={phase} />}
        {stillType === 'column'     && <ColumnStillModel phase={phase} />}
      </group>

      <PhaseOverlay phase={phase} stillType={stillType} />

      <OrbitControls
        target={[0, 3, 0]}
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  )
}

/* — Card with Canvas + type selector ——————————————————— */
function Still3DPanel({ currentPhase }: { currentPhase?: string }) {
  const [stillType, setStillType] = useState<StillType>('pot_still')

  return (
    <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Box size={14} className="text-accent-copper" />
          <span className="text-sm font-semibold text-text-primary">Mi Alambique — 3D</span>
        </div>
        <select
          value={stillType}
          onChange={(e) => setStillType(e.target.value as StillType)}
          className="text-xs bg-bg-elevated border border-white/10 text-text-secondary rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-copper/40 cursor-pointer"
        >
          {(Object.entries(STILL_LABELS) as [StillType, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* 3D canvas */}
      <div style={{ height: 380, position: 'relative' }}>
        <Canvas
          shadows
          camera={{ position: [4, 5, 9], fov: 50 }}
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.8 }}
        >
          <Still3DScene stillType={stillType} phase={currentPhase} />
        </Canvas>
        <div className="absolute bottom-3 left-3 text-[10px] text-[#555] pointer-events-none select-none">
          Arrastra · Scroll = zoom
        </div>
      </div>
    </div>
  )
}

/* ── Start New Brew Hero ───────────────────────────────────────── */
function StartBrewHero() {
  const { t, i18n } = useTranslation('common')
  const { data: recipes = [] } = useRecipes()
  const startBrew = useStartBrewFromRecipe()
  const createSession = useCreateSession()
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null)

  const handleQuickStart = () => {
    if (selectedRecipe) {
      startBrew.mutate(selectedRecipe, {
        onSuccess: () => toast.success(t('brew_day.batch_started')),
        onError: () => toast.error(t('brew_day.advance_error')),
      })
    } else {
      createSession.mutate(
        { name: `${t('brew_day.batch_prefix')} ${new Date().toLocaleDateString(i18n.language)}`, phase: 'planned' },
        {
          onSuccess: () => toast.success(t('brew_day.batch_created')),
          onError: () => toast.error(t('brew_day.advance_error')),
        }
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-accent-cyan/20 bg-[radial-gradient(circle_at_top_right,rgba(34,230,255,0.12),transparent_30%),linear-gradient(135deg,rgba(209,161,120,0.08)_0%,rgba(26,26,46,0.94)_38%,rgba(18,23,42,0.98)_100%)] p-8 md:p-12 shadow-elevated"
    >
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-accent-copper" />
            <span className="text-xs font-semibold text-accent-copper uppercase tracking-[0.24em]">
              {t('brew_day.start_hero_badge')}
            </span>
          </div>
          <h2 className="text-3xl font-display font-bold text-text-primary">
            {t('brew_day.start_hero_title')}
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t('brew_day.start_hero_desc')}
          </p>
        </div>

        <div className="space-y-4">
          <select
            value={selectedRecipe ?? ''}
            onChange={(e) => setSelectedRecipe(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-white/10 text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent-cyan/50"
          >
            <option value="">{t('brew_day.no_recipe')}</option>
            {recipes.map((r: Recipe) => (
              <option key={r.id} value={r.id}>{r.name} {r.style ? `(${r.style})` : ''}</option>
            ))}
          </select>

          <Button
            onClick={handleQuickStart}
            disabled={startBrew.isPending || createSession.isPending}
            className="w-full bg-brew-gradient text-[#101522] font-bold py-3 text-base shadow-glow hover:brightness-105"
          >
            <PlayCircle className="h-5 w-5 mr-2" />
            {startBrew.isPending || createSession.isPending ? t('brew_day.starting') : t('brew_day.start_brew')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Session Card (compact, for grid) ──────────────────────────── */
function SessionCard({ session, isActive }: { session: BrewSession; isActive?: boolean }) {
  const { t } = useTranslation('common')
  const advancePhase = useAdvancePhase()

  const handleAdvance = (phase: TimelinePhase) => {
    advancePhase.mutate(
      { sessionId: String(session.id), phase },
      {
        onSuccess: () => toast.success(t('brew_day.phase_to', { phase })),
        onError: () => toast.error(t('brew_day.advance_error')),
      }
    )
  }

  return (
    <div className={cn(
      'glass-card rounded-xl border p-5 space-y-4 transition-colors',
      isActive ? 'border-accent-cyan/30 ring-1 ring-accent-cyan/10' : 'border-white/10'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-text-primary text-sm">{session.name}</h3>
          {session.batch_number && (
            <p className="text-[10px] text-text-tertiary mt-0.5">#{session.batch_number}</p>
          )}
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
          isActive
            ? 'bg-accent-copper/15 text-accent-copper border-accent-copper/30'
            : 'bg-bg-elevated text-text-secondary border-white/10'
        )}>
          {session.phase}
        </span>
      </div>

      <BrewTimeline
        currentPhase={session.phase as TimelinePhase}
        onAdvance={handleAdvance}
        compact
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'OG', value: session.actual_og },
          { label: 'FG', value: session.actual_fg },
          {
            label: 'ABV',
            value: session.actual_og && session.actual_fg
              ? `${((session.actual_og - session.actual_fg) * 131.25).toFixed(1)}%`
              : '—',
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bg-elevated rounded-lg p-2">
            <p className="text-[10px] text-text-muted">{label}</p>
            <p className="text-sm font-mono font-semibold text-text-primary">{value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Active Brew Panel ─────────────────────────────────────────── */
function ActiveBrewPanel({ session }: { session: BrewSession }) {
  const { t } = useTranslation('common')
  const advancePhase = useAdvancePhase()
  const { timer } = useBrewStore()
  const [hops, setHops] = useState<HopAddition[]>([])

  // Fetch recipe to build hop schedule from real data
  const recipeId = session.recipe_id ? Number(session.recipe_id) : null
  const { data: recipe } = useRecipe(recipeId)

  // Build hop schedule from recipe, fall back to demo hops
  useEffect(() => {
    const recipeHops = buildHopSchedule(recipe)
    if (recipeHops.length > 0) {
      setHops(recipeHops)
    } else if (hops.length === 0) {
      setHops([
        { name: 'Magnum', amount_g: 25, time_min: 60, alpha_pct: 12.5, added: false, notified: false },
        { name: 'Cascade', amount_g: 20, time_min: 15, alpha_pct: 5.5, added: false, notified: false },
        { name: 'Citra', amount_g: 30, time_min: 5, alpha_pct: 12.0, added: false, notified: false },
        { name: 'Citra', amount_g: 40, time_min: 0, alpha_pct: 12.0, added: false, notified: false },
      ])
    }
  }, [recipe]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkHopAdded = useCallback((index: number) => {
    setHops(prev => prev.map((h, i) => i === index ? { ...h, added: true } : h))
    toast.success(t('brew_day.hop_added'))
  }, [])

  const handlePhaseAdvance = (phase: TimelinePhase) => {
    advancePhase.mutate(
      { sessionId: String(session.id), phase },
      {
        onSuccess: () => toast.success(t('brew_day.advanced_to', { phase })),
        onError: () => toast.error(t('brew_day.advance_error')),
      }
    )
  }

  const next = nextPhase(session.phase as BrewPhase)
  const isDistillPhase = session.phase === 'stripping_run' || session.phase === 'spirit_run'
  const boilElapsedSec = isDistillPhase ? timer.stepSeconds : 0

  return (
    <div className="space-y-4">
      {/* Phase title + advance button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-copper/15 flex items-center justify-center">
            <Zap className="h-5 w-5 text-accent-copper" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">{session.name}</h2>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <Clock size={10} />
              {t('brew_day.total_time')}: {Math.floor(timer.totalSeconds / 60)}:{String(timer.totalSeconds % 60).padStart(2, '0')}
            </p>
          </div>
        </div>
        {next && next !== 'completed' && (
          <Button
            size="sm"
            onClick={() => handlePhaseAdvance(next as TimelinePhase)}
            disabled={advancePhase.isPending}
            className="bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/16"
          >
            <ChevronRight size={14} className="mr-1" />
            → {next}
          </Button>
        )}
      </div>

      {/* Kanban Timeline */}
      <KanbanTimeline
        currentPhase={session.phase as BrewPhase}
        elapsed={timer.stepSeconds}
        onAdvance={handlePhaseAdvance}
      />

      {/* Hop Alert Banner (during boil) */}
      {isDistillPhase && (
        <HopAlertBanner
          hops={hops}
          boilElapsedSec={boilElapsedSec}
          boilTotalMin={60}
        />
      )}

      {/* Two‐column: Timer + Hop Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DualTimer mashDurationMinutes={60} boilDurationMinutes={60} />

        {isDistillPhase ? (
          <div className="glass-card rounded-xl border border-white/10 p-4">
            <HopSchedule
              hops={hops}
              boilElapsedSec={boilElapsedSec}
              boilTotalMin={60}
              onMarkAdded={handleMarkHopAdded}
            />
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-white/10 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <ListChecks size={14} />
              {t('brew_day.phase_notes')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-elevated rounded-lg p-3 text-center">
                <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                  <Thermometer size={10} /> {t('brew_day.temperature')}
                </p>
                <p className="text-lg font-mono font-bold text-text-primary mt-1">
                  {session.phase === 'mashing' ? '67°C' : session.phase === 'stripping_run' ? '78°C' : session.phase === 'spirit_run' ? '65°C' : '—'}
                </p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-3 text-center">
                <p className="text-[10px] text-text-muted flex items-center justify-center gap-1">
                  <Droplet size={10} /> {t('brew_day.target_og')}
                </p>
                <p className="text-lg font-mono font-bold text-text-primary mt-1">
                  {session.planned_og ?? '—'}
                </p>
              </div>
            </div>
            {session.notes && (
              <p className="text-xs text-text-tertiary bg-bg-primary/50 rounded-lg p-3">
                {session.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function BrewingPage() {
  const { t } = useTranslation('common')
  const { setActivePage } = useUIStore()
  useEffect(() => setActivePage('brewing'), [setActivePage])

  const { data: sessions = [], isLoading } = useBrewSessions()
  const { data: activeSession } = useActiveSession()
  const [showNewBatch, setShowNewBatch] = useState(false)

  // Split active vs history
  const historySessions = useMemo(
    () => sessions.filter((s: BrewSession) => !activeSession || s.id !== activeSession.id),
    [sessions, activeSession]
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold amber-text">{t('brew_day.title')}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {activeSession ? t('brew_day.subtitle_active', { name: activeSession.name }) : t('brew_day.subtitle_idle')}
          </p>
        </div>
        {activeSession && (
          <Button
            size="sm"
            onClick={() => setShowNewBatch(true)}
            className="bg-brew-gradient text-[#101522] font-semibold shadow-glow hover:brightness-105"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('brew_day.new_batch')}
          </Button>
        )}
      </div>

      {/* 3D Still — always visible */}
      <Still3DPanel currentPhase={activeSession?.phase} />

      {/* Active Brew or Start Hero */}
      {activeSession ? (
        <ActiveBrewPanel session={activeSession} />
      ) : (
        <StartBrewHero />
      )}

      {/* All sessions grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent-cyan" />
          {activeSession ? t('brew_day.other_batches') : t('brew_day.all_batches')} ({historySessions.length})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl h-48 animate-pulse bg-bg-elevated" />
            ))}
          </div>
        ) : historySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 shadow-glow">
              <FlaskConical className="h-8 w-8 text-accent-copper" />
            </div>
            <p className="text-sm text-text-muted">
              {activeSession ? t('brew_day.no_other_batches') : t('brew_day.no_batches_yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {historySessions.map((s: BrewSession) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SessionCard session={s} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Batch Modal */}
      <NewBatchModal open={showNewBatch} onClose={() => setShowNewBatch(false)} />
    </div>
  )
}
