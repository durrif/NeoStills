import type { JSX } from 'react'

export function GinBasket({ position }: { position: [number, number, number] }): JSX.Element {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.22, 20, 1, true]} />
        <meshStandardMaterial color="#C7A951" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <torusGeometry args={[0.09, 0.012, 12, 24]} />
        <meshStandardMaterial color="#C7A951" metalness={0.72} roughness={0.34} />
      </mesh>
    </group>
  )
}
