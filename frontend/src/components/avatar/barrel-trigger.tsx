// frontend/src/components/avatar/barrel-trigger.tsx — NeoStills v4
// Floating cask button that opens the unified Genio Destilador panel
import { motion } from 'framer-motion'
import { useAvatarStore } from '@/stores/avatar-store'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

/** Barrel SVG icon — stylized aging cask */
function BarrelIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barrel body */}
      <ellipse cx="32" cy="52" rx="22" ry="8" fill="#8B5E3C" />
      <rect x="10" y="16" width="44" height="36" rx="4" fill="#C4873B" />
      <ellipse cx="32" cy="16" rx="22" ry="8" fill="#D4973E" />
      {/* Barrel bands */}
      <rect x="10" y="22" width="44" height="3" fill="#8B5E3C" opacity="0.7" />
      <rect x="10" y="38" width="44" height="3" fill="#8B5E3C" opacity="0.7" />
      {/* Highlight */}
      <ellipse cx="28" cy="30" rx="8" ry="14" fill="white" opacity="0.08" />
      {/* Tap/spigot */}
      <rect x="46" y="28" width="8" height="4" rx="1" fill="#D4723C" />
      <circle cx="56" cy="30" r="3" fill="#F5A623" />
      {/* Magic sparkles */}
      <circle cx="32" cy="10" r="1.5" fill="#22E6FF" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="8" r="1" fill="#D1A178" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="40" cy="9" r="1" fill="#22E6FF" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export function BarrelTrigger() {
  const { config } = useAvatarStore()
  const { aiPanelOpen, toggleAiPanel } = useUIStore()

  const isConfigured = config.enabled
  const isActive = aiPanelOpen

  const handleClick = () => {
    if (!isConfigured) {
      window.location.href = '/avatar-config'
      return
    }
    toggleAiPanel()
  }

  return (
    <motion.button
      onClick={handleClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: [0, -4, 0],
        rotate: [0, 1, 0],
      }}
      transition={{
        y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 0.3 },
      }}
      whileHover={{ scale: 1.1, rotate: -3 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        "barrel-trigger fixed z-[1000] w-16 h-16 md:w-[64px] md:h-[64px] rounded-full flex items-center justify-center cursor-pointer",
        "bottom-20 right-4 md:bottom-6 md:right-6"
      )}
      style={{
        filter: isActive
          ? 'drop-shadow(0 0 22px rgba(34, 230, 255, 0.45))'
          : 'drop-shadow(0 0 14px rgba(184, 115, 51, 0.35))',
      }}
      aria-label={!isConfigured ? 'Configurar Genio Destilador' : isActive ? 'Cerrar Genio Destilador' : 'Abrir Genio Destilador'}
      title={!isConfigured ? '🧞 Configura tu Genio Destilador' : isActive ? 'Cerrar Genio Destilador' : 'Abrir Genio Destilador'}
    >
      <BarrelIcon size={isActive ? 36 : 32} />

      {/* Setup badge when not configured */}
      {!isConfigured && (
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-cyan flex items-center justify-center text-[10px] font-bold text-bg-primary shadow-lg"
        >
          ?
        </motion.span>
      )}

      {/* Ambient glow ring */}
      {!isActive && (
        <motion.span
          animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(184, 115, 51, 0.25) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Magic glow when active */}
      {isActive && (
        <motion.span
          animate={{ scale: [1, 1.3], opacity: [0.6, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 230, 255, 0.28) 0%, transparent 70%)',
          }}
        />
      )}
    </motion.button>
  )
}
