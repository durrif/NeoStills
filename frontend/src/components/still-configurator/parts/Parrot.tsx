import type { JSX } from 'react'

export function Parrot({ position }: { position: [number, number, number] }): JSX.Element {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.35, 16]} />
        <meshStandardMaterial color="#C8CBD0" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0.06, -0.12, 0]} rotation={[0, 0, Math.PI / 2.2]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.14, 12]} />
        <meshStandardMaterial color="#C8CBD0" metalness={0.9} roughness={0.22} />
      </mesh>
    </group>
  )
}
