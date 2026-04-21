import type { JSX } from 'react'

const COPPER_MATERIAL = {
  color: '#B87333',
  metalness: 0.92,
  roughness: 0.34,
  envMapIntensity: 1.1,
}

const STAINLESS_MATERIAL = {
  color: '#C8CBD0',
  metalness: 0.95,
  roughness: 0.22,
  envMapIntensity: 1.2,
}

function materialProps(material: 'copper' | 'stainless' | 'mixed') {
  return material === 'stainless' ? STAINLESS_MATERIAL : COPPER_MATERIAL
}

export function Boiler({
  position,
  height,
  radius,
  material,
}: {
  position: [number, number, number]
  height: number
  radius: number
  material: 'copper' | 'stainless' | 'mixed'
}): JSX.Element {
  const props = materialProps(material)

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 48, 1]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[0, height / 2, 0]} castShadow>
        <sphereGeometry args={[radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2.15]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[0, -height / 2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 3]} />
        <meshStandardMaterial {...props} />
      </mesh>
    </group>
  )
}
