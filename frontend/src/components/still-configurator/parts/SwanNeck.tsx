import type { JSX } from 'react'

export function SwanNeck({
  position,
  rotation,
  material,
  length = 0.9,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  material: 'copper' | 'stainless' | 'mixed'
  length?: number
}): JSX.Element {
  const color = material === 'stainless' ? '#C8CBD0' : '#B87333'

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <torusGeometry args={[0.22, 0.035, 18, 36, Math.PI / 1.65]} />
        <meshStandardMaterial color={color} metalness={0.94} roughness={0.28} />
      </mesh>
      <mesh position={[length * 0.38, -0.08, 0]} rotation={[0, 0, Math.PI / 2.2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, length, 22]} />
        <meshStandardMaterial color={color} metalness={0.94} roughness={0.28} />
      </mesh>
    </group>
  )
}
