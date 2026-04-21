import { RotateCcw, ZoomIn } from 'lucide-react'
import { useStillConfig } from '../hooks/useStillConfig'

export function PreviewControls() {
  const reset = useStillConfig((state) => state.reset)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
      <div className="pointer-events-auto rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs text-text-secondary backdrop-blur-sm">
        Arrastra para rotar. La vista es interactiva solo para el pot still MVP.
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full border border-white/10 bg-black/45 p-2 text-text-primary backdrop-blur-sm transition-colors hover:border-primary/60"
          aria-label="Reiniciar configuración"
        >
          <RotateCcw size={16} />
        </button>
        <div className="rounded-full border border-white/10 bg-black/45 p-2 text-text-primary backdrop-blur-sm">
          <ZoomIn size={16} />
        </div>
      </div>
    </div>
  )
}
