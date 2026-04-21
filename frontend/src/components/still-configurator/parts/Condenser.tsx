import type { JSX } from 'react'

export function Condenser({
  position,
  material,
  style,
}: {
  position: [number, number, number]
  material: 'copper' | 'stainless' | 'mixed'
  style: 'shell_tube' | 'coil'
}): JSX.Element {
  const color = material === 'stainless' ? '#C8CBD0' : '#B87333'

  if (style === 'coil') {
    return (
      <group position={position}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusKnotGeometry args={[0.12, 0.02, 80, 12, 2, 7]} />
          <meshStandardMaterial color={color} metalness={0.94} roughness={0.28} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.55, 24]} />
        <meshStandardMaterial color={color} metalness={0.94} roughness={0.28} />
      </mesh>
    </group>
  )
}
