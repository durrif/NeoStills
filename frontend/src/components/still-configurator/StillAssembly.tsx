import type { JSX } from 'react'
import type { StillConfiguratorSnapshot } from './hooks/useStillConfig'
import { Boiler } from './parts/Boiler'
import { Condenser } from './parts/Condenser'
import { GinBasket } from './parts/GinBasket'
import { Heater } from './parts/Heater'
import { Helmet } from './parts/Helmet'
import { Parrot } from './parts/Parrot'
import { SwanNeck } from './parts/SwanNeck'

export function StillAssembly({ config }: { config: StillConfiguratorSnapshot }): JSX.Element {
  const boilerHeight = Math.cbrt(Math.max(config.capacity_liters, 25) / 1000) * 0.95
  const radius = boilerHeight * 0.58

  return (
    <group position={[0, 0, 0]}>
      <Heater type={config.heater_type} />
      <Boiler
        position={[0, 0.2 + boilerHeight / 2, 0]}
        height={boilerHeight}
        radius={radius}
        material={config.material}
      />
      <Helmet
        position={[0, 0.22 + boilerHeight + 0.08, 0]}
        material={config.material}
      />
      <SwanNeck
        position={[0.06, 0.48 + boilerHeight, 0]}
        rotation={[0, 0, 0.08]}
        material={config.material}
        length={0.9}
      />
      <Condenser
        position={[1.02, 0.72 + boilerHeight * 0.28, 0]}
        material={config.material}
        style={config.components.condenser_type}
      />
      {config.components.gin_basket ? <GinBasket position={[0.7, 0.84 + boilerHeight * 0.22, 0]} /> : null}
      {config.components.parrot ? <Parrot position={[1.32, 0.22, 0]} /> : null}
      {config.components.dephlegmator ? (
        <mesh position={[0, 0.76 + boilerHeight, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.22, 18]} />
          <meshStandardMaterial color="#C8CBD0" metalness={0.92} roughness={0.24} />
        </mesh>
      ) : null}
    </group>
  )
}
