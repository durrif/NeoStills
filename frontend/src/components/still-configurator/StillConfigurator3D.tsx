import { Suspense, useEffect, type JSX } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { OnboardingStillConfig } from '@/stores/onboarding-store'
import { StillAssembly } from './StillAssembly'
import { useStillConfig, type StillConfiguratorSnapshot } from './hooks/useStillConfig'
import { ComponentsPanel } from './panels/ComponentsPanel'
import { DimensionsPanel } from './panels/DimensionsPanel'
import { PreviewControls } from './panels/PreviewControls'
import { TypeSelector } from './panels/TypeSelector'

interface StillConfigurator3DProps {
  initialValue?: Partial<OnboardingStillConfig>
  onSave: (still: Omit<OnboardingStillConfig, 'id'>) => void
}

function mapInitialValue(initialValue?: Partial<OnboardingStillConfig>): Partial<StillConfiguratorSnapshot> | undefined {
  if (!initialValue) return undefined

  return {
    type: initialValue.type,
    capacity_liters: initialValue.capacityLiters,
    material: initialValue.material,
    heater_type: initialValue.heaterType,
    components: {
      dephlegmator: initialValue.hasDephlegmator ?? false,
      gin_basket: initialValue.hasGinBasket ?? false,
      parrot: initialValue.hasParrot ?? true,
      condenser_type: initialValue.condenserType ?? 'shell_tube',
      column_plates: 4,
    },
  }
}

export default function StillConfigurator3D({ initialValue, onSave }: StillConfigurator3DProps): JSX.Element {
  const snapshot = useStillConfig((state) => state.toSaveable())
  const reset = useStillConfig((state) => state.reset)

  useEffect(() => {
    reset(mapInitialValue(initialValue))
  }, [initialValue, reset])

  return (
    <div className="grid h-[72vh] min-h-[620px] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0a09]">
        <Canvas camera={{ position: [2.5, 1.9, 2.8], fov: 40 }} shadows>
          <Suspense fallback={null}>
            <Environment preset="warehouse" />
            <ambientLight intensity={0.45} />
            <directionalLight position={[4, 5, 4]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
            <StillAssembly config={snapshot} />
            <ContactShadows position={[0, -0.01, 0]} opacity={0.55} scale={5} blur={2.8} far={4} />
            <OrbitControls enablePan={false} minDistance={1.6} maxDistance={6} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 2.05} />
          </Suspense>
        </Canvas>
        <PreviewControls />
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-1">
        <TypeSelector />
        <DimensionsPanel />
        <ComponentsPanel />
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-text-secondary">
          Esta primera versión persiste una configuración utilizable de pot still. Reflux, column y exportación GLB quedan para la siguiente fase.
        </div>
        <button
          type="button"
          onClick={() =>
            onSave({
              name: initialValue?.name?.trim() || 'Alambique configurado en 3D',
              type: snapshot.type,
              capacityLiters: snapshot.capacity_liters,
              material: snapshot.material,
              heaterType: snapshot.heater_type,
              hasDephlegmator: snapshot.components.dephlegmator,
              hasGinBasket: snapshot.components.gin_basket,
              hasParrot: snapshot.components.parrot,
              condenserType: snapshot.components.condenser_type,
              notes: initialValue?.notes ?? 'Configurado desde el configurador 3D MVP.',
            })
          }
          className="mt-auto rounded-xl bg-primary px-4 py-3 font-medium text-black transition-colors hover:bg-primary-light"
        >
          Guardar este alambique
        </button>
      </div>
    </div>
  )
}
