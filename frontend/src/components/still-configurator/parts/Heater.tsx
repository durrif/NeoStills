import type { JSX } from 'react'

export function Heater({
  type,
}: {
  type: 'gas' | 'electric' | 'steam'
}): JSX.Element {
  const color = type === 'gas' ? '#7B5B3A' : type === 'steam' ? '#5B8DB8' : '#6B8E4E'

  return (
    <group position={[0, -0.18, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.42, 0.48, 0.12, 32]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.7} />
      </mesh>
    </group>
  )
}
