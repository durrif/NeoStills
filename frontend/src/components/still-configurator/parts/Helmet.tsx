import type { JSX } from 'react'

export function Helmet({
  position,
  material,
}: {
  position: [number, number, number]
  material: 'copper' | 'stainless' | 'mixed'
}): JSX.Element {
  const color = material === 'stainless' ? '#C8CBD0' : '#B87333'

  return (
    <mesh position={position} castShadow receiveShadow>
      <sphereGeometry args={[0.28, 40, 24, 0, Math.PI * 2, 0, Math.PI]} />
      <meshStandardMaterial color={color} metalness={0.92} roughness={0.32} />
    </mesh>
  )
}
