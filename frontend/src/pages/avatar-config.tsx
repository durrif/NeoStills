// frontend/src/pages/avatar-config.tsx — NeoStills v4 FASE 1
// Avatar configuration page (Settings > Genio Destilador)
// Full wizard: source → style → personality → voice
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  User,
  Sparkles,
  Check,
  Mic,
  Volume2,
  Beer,
  FlaskRound,
  Guitar,
  Bot,
  ChevronLeft,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAvatarStore, type AvatarStyle, type PersonalityType, type PresetCharacter } from '@/stores/avatar-store'
import { generateAvatarImage } from '@/lib/avatar-service'
import { cn } from '@/lib/utils'

type WizardStep = 'source' | 'preset' | 'style' | 'personality' | 'voice' | 'done'

/** David's custom avatar — pre-generated via SadTalker on Replicate */
const DAVID_AVATAR = {
  imageUrl: '/assets/avatar/david-avatar.jpeg',
  videoUrl: '/assets/avatar/david-video.mp4',
  /** Driving audio from Mediteradio a la Carta — baked into the SadTalker video */
  audioUrl: '/assets/avatar/david-audio.mp3',
}

const PRESETS: Array<{ id: PresetCharacter; label: string; emoji: string; desc: string; imageUrl?: string }> = [
  { id: 'david', label: 'Comandante Lara', emoji: '🧞', desc: 'Tu genio destilador personalizado con voz propia', imageUrl: DAVID_AVATAR.imageUrl },
  { id: 'maestro', label: 'Maestro Destilador', emoji: '🧔', desc: 'Sereno, técnico y con criterio de bodega' },
  { id: 'cientifica', label: 'La Científica del Alambique', emoji: '👩‍🔬', desc: 'Bata de laboratorio, enfoque técnico y sensorial' },
  { id: 'punk', label: 'El Destilador Punk', emoji: '🎸', desc: 'DIY, directo y con energía de taller' },
  { id: 'hop3000', label: 'COPPER-3000', emoji: '🤖', desc: 'Robot amigable, chasis cobre y cian' },
]

const STYLES: Array<{ id: AvatarStyle; label: string; desc: string }> = [
  { id: 'cartoon', label: 'Cartoon / Pixar', desc: 'Estilo animado, líneas limpias' },
  { id: 'realistic', label: '3D Realista', desc: 'Hiperrealista, iluminación cinematográfica' },
  { id: 'anime', label: 'Anime', desc: 'Estilo japonés, sombreado cel' },
  { id: 'classic', label: 'Distillery Classic', desc: 'Ilustración artesanal, tonos cobre y bodega' },
]

const PERSONALITIES: Array<{ id: PersonalityType; label: string; emoji: string; desc: string }> = [
  { id: 'professional', label: 'Profesional', emoji: '🎓', desc: 'Claro, preciso, enciclopédico' },
  { id: 'casual', label: 'Cercano', emoji: '😄', desc: 'Directo, humano y con humor de taller' },
  { id: 'sarcastic', label: 'Irónico', emoji: '😏', desc: 'Ingenioso, humor seco, brutalmente honesto' },
  { id: 'shy', label: 'Tímido', emoji: '🙈', desc: 'Suave, muy educado, cuidadoso' },
  { id: 'demanding', label: 'Maestro exigente', emoji: '💪', desc: 'Exigente, estándares altos' },
]

const VOICES = [
  { id: 'david_own', label: 'Comandante Lara (voz propia)', flag: '🧞' },
  { id: 'warm_male_es', label: 'Voz cálida masculina (ES)', flag: '🇪🇸' },
  { id: 'energetic_female_es', label: 'Voz enérgica femenina (ES)', flag: '🇪🇸' },
  { id: 'deep_male_en', label: 'Deep warm male (EN)', flag: '🇬🇧' },
  { id: 'friendly_female_en', label: 'Friendly female (EN)', flag: '🇬🇧' },
]

export default function AvatarConfigPage() {
  const { t } = useTranslation('common')
  const { config, setConfig } = useAvatarStore()
  const [step, setStep] = useState<WizardStep>('source')
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(config.imageUrl)
  const [selectedPreset, setSelectedPreset] = useState<PresetCharacter | null>(config.presetCharacter)
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>(config.style)
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>(config.personality)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(config.presetVoice)

  const stepOrder: WizardStep[] = ['source', 'preset', 'style', 'personality', 'voice', 'done']
  const currentIndex = stepOrder.indexOf(step)
  const progress = ((currentIndex + 1) / stepOrder.length) * 100

  const goBack = () => {
    if (currentIndex > 0) {
      // Skip 'preset' when going back if source was 'photo'
      const prevStep = stepOrder[currentIndex - 1] ?? 'source'
      if (prevStep === 'preset' && config.source === 'photo') {
        setStep('source')
      } else {
        setStep(prevStep)
      }
    }
  }

  const handleSourceSelect = (source: 'photo' | 'preset') => {
    setConfig({ source })
    if (source === 'preset') {
      setStep('preset')
    } else {
      // TODO: photo upload flow — for now skip to style
      setStep('style')
    }
  }

  const handlePresetSelect = async (preset: PresetCharacter) => {
    setSelectedPreset(preset)
    setConfig({ presetCharacter: preset })

    // David's custom avatar has pre-generated image + video + voice — skip style step
    if (preset === 'david') {
      setGeneratedImage(DAVID_AVATAR.imageUrl)
      setConfig({
        imageUrl: DAVID_AVATAR.imageUrl,
        videoUrl: DAVID_AVATAR.videoUrl,
        style: 'realistic',
      })
      setSelectedStyle('realistic')
      setSelectedVoice('david_own')
      setStep('personality')
      return
    }

    setStep('style')
  }

  const handleStyleSelect = async (style: AvatarStyle) => {
    setSelectedStyle(style)
    setConfig({ style })

    // Generate avatar image
    setGenerating(true)
    try {
      const imageUrl = await generateAvatarImage({
        style,
        preset: selectedPreset ?? undefined,
      })
      setGeneratedImage(imageUrl)
      setConfig({ imageUrl })
    } catch (err) {
      console.error('Failed to generate avatar:', err)
      // Use demo asset as fallback
      setGeneratedImage('/assets/avatar/avatar-source.jpeg')
      setConfig({ imageUrl: '/assets/avatar/avatar-source.jpeg' })
    } finally {
      setGenerating(false)
    }

    setStep('personality')
  }

  const handlePersonalitySelect = (personality: PersonalityType) => {
    setSelectedPersonality(personality)
    setConfig({ personality })
    setStep('voice')
  }

  const handleVoiceSelect = (voiceId: string | null) => {
    setSelectedVoice(voiceId)
    setConfig({
      presetVoice: voiceId,
      voiceEnabled: voiceId !== null,
    })
  }

  const handleFinish = () => {
    setConfig({
      enabled: true,
      videoUrl: selectedPreset === 'david'
        ? DAVID_AVATAR.videoUrl
        : '/assets/avatar/avatar-demo.mp4',
      voiceEnabled: selectedVoice !== null,
      presetVoice: selectedVoice,
    })
    setStep('done')
  }

  return (
    <div className="min-h-full p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/settings" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronLeft size={18} className="text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary">
            Genio Destilador
          </h1>
          <p className="text-sm text-text-secondary">
            Configura tu asistente destilador con IA
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/5 mb-8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--gradient-magic)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Source */}
          {step === 'source' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Paso 1: Elige tu avatar
              </h2>
              <p className="text-sm text-text-secondary">
                ¿Quieres personalizar tu avatar con una foto o elegir un personaje predefinido?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <button
                  onClick={() => handleSourceSelect('photo')}
                  className="group p-6 rounded-xl glass-card border border-white/[0.06] hover:border-accent-purple/40 transition-all text-left"
                >
                  <Upload size={32} className="text-accent-purple mb-3" />
                  <h3 className="font-semibold text-text-primary mb-1">Subir mi foto</h3>
                  <p className="text-xs text-text-secondary">
                    Genera un avatar 3D personalizado basado en tu cara
                  </p>
                </button>

                <button
                  onClick={() => handleSourceSelect('preset')}
                  className="group p-6 rounded-xl glass-card border border-white/[0.06] hover:border-accent-amber/40 transition-all text-left"
                >
                  <User size={32} className="text-accent-amber mb-3" />
                  <h3 className="font-semibold text-text-primary mb-1">Personaje predefinido</h3>
                  <p className="text-xs text-text-secondary">
                    Elige entre personajes de destilación, taller y operación
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preset characters */}
          {step === 'preset' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={goBack} className="text-text-secondary hover:text-text-primary">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-text-primary">
                  Paso 2: Elige tu personaje
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={cn(
                      'p-4 rounded-xl glass-card border transition-all text-left',
                      selectedPreset === preset.id
                        ? 'border-accent-purple/60 bg-accent-purple/5'
                        : 'border-white/[0.06] hover:border-white/[0.12]',
                      preset.id === 'david' && 'sm:col-span-2 border-accent-purple/30 bg-gradient-to-br from-accent-purple/5 to-accent-amber/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {preset.imageUrl ? (
                        <img
                          src={preset.imageUrl}
                          alt={preset.label}
                          className="w-14 h-14 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <span className="text-3xl">{preset.emoji}</span>
                      )}
                      <div>
                        <h3 className="font-semibold text-text-primary text-sm">{preset.label}</h3>
                        <p className="text-xs text-text-secondary mt-0.5">{preset.desc}</p>
                        {preset.id === 'david' && (
                          <span className="text-[10px] text-accent-purple font-medium mt-1 inline-block">✨ Avatar + voz propia</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Style */}
          {step === 'style' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={goBack} className="text-text-secondary hover:text-text-primary">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-text-primary">
                  Paso 3: Elige el estilo visual
                </h2>
              </div>

              {generating ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles size={40} className="text-accent-purple" />
                  </motion.div>
                  <p className="text-sm text-text-secondary">Generando tu avatar con IA...</p>
                  <p className="text-xs text-text-tertiary">Esto puede tardar unos segundos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleStyleSelect(style.id)}
                      className={cn(
                        'p-4 rounded-xl glass-card border transition-all text-left',
                        selectedStyle === style.id
                          ? 'border-accent-amber/60 bg-accent-amber/5'
                          : 'border-white/[0.06] hover:border-white/[0.12]'
                      )}
                    >
                      <h3 className="font-semibold text-text-primary text-sm">{style.label}</h3>
                      <p className="text-xs text-text-secondary mt-1">{style.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Personality */}
          {step === 'personality' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={goBack} className="text-text-secondary hover:text-text-primary">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-text-primary">
                  Paso 4: Elige la personalidad
                </h2>
              </div>

              {/* Show generated avatar preview */}
              {generatedImage && (
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={generatedImage}
                      alt="Tu avatar generado"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-4">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePersonalitySelect(p.id)}
                    className={cn(
                      'w-full p-4 rounded-xl glass-card border transition-all text-left flex items-center gap-3',
                      selectedPersonality === p.id
                        ? 'border-accent-purple/60 bg-accent-purple/5'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    )}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-text-primary text-sm">{p.label}</h3>
                      <p className="text-xs text-text-secondary">{p.desc}</p>
                    </div>
                    {selectedPersonality === p.id && (
                      <Check size={18} className="ml-auto text-accent-purple" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Voice */}
          {step === 'voice' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={goBack} className="text-text-secondary hover:text-text-primary">
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-text-primary">
                  Paso 5: Voz (opcional)
                </h2>
              </div>

              <p className="text-sm text-text-secondary">
                Puedes clonar tu voz o elegir una voz predefinida. Esto es opcional.
              </p>

              {/* Voice clone option */}
              <button
                className="w-full p-4 rounded-xl glass-card border border-white/[0.06] hover:border-accent-purple/40 transition-all text-left flex items-center gap-3"
                disabled
              >
                <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                  <Mic size={20} className="text-accent-purple" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">Clonar mi voz</h3>
                  <p className="text-xs text-text-secondary">Graba 10 segundos para clonar tu voz (próximamente)</p>
                </div>
              </button>

              {/* Preset voices */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-secondary mt-4">Voces predefinidas</h3>
                {VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => handleVoiceSelect(voice.id)}
                    className={cn(
                      'w-full p-3 rounded-xl glass-card border transition-all text-left flex items-center gap-3',
                      selectedVoice === voice.id
                        ? 'border-accent-amber/60 bg-accent-amber/5'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    )}
                  >
                    <Volume2 size={16} className="text-text-secondary" />
                    <span className="text-sm text-text-primary">{voice.flag} {voice.label}</span>
                    {selectedVoice === voice.id && (
                      <Check size={16} className="ml-auto text-accent-amber" />
                    )}
                  </button>
                ))}

                <button
                  onClick={() => handleVoiceSelect(null)}
                  className={cn(
                    'w-full p-3 rounded-xl glass-card border transition-all text-left flex items-center gap-3',
                    selectedVoice === null
                      ? 'border-accent-amber/60 bg-accent-amber/5'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  )}
                >
                  <span className="text-sm text-text-secondary">Sin voz (solo texto)</span>
                  {selectedVoice === null && (
                    <Check size={16} className="ml-auto text-accent-amber" />
                  )}
                </button>
              </div>

              {/* Next button */}
              <button
                onClick={handleFinish}
                className="w-full mt-6 py-3 rounded-xl font-semibold text-bg-primary flex items-center justify-center gap-2"
                style={{ background: 'var(--gradient-magic)' }}
              >
                <Sparkles size={18} />
                Activar el Genio Destilador
              </button>
            </div>
          )}

          {/* Step 6: Done! */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
              >
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                  style={{ background: 'var(--gradient-magic)' }}
                >
                  <Check size={40} className="text-bg-primary" />
                </div>
              </motion.div>

              <h2 className="text-xl font-display font-bold text-text-primary mb-2">
                ¡Tu Genio Destilador está listo!
              </h2>
              <p className="text-sm text-text-secondary mb-8 max-w-sm">
                Haz clic en el barril flotante en cualquier página para invocar a tu asistente con IA.
              </p>

              {/* Preview */}
              {generatedImage && (
                <div className="w-40 h-40 rounded-2xl overflow-hidden border border-white/10 mb-8">
                  <img
                    src={generatedImage}
                    alt="Tu avatar"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Link
                  to="/"
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-text-primary transition-colors"
                >
                  Ir al Dashboard
                </Link>
                <button
                  onClick={() => setStep('source')}
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-text-secondary transition-colors"
                >
                  Reconfigurar
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
