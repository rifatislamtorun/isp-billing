import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Line, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'

function NetworkNode({ position, label, type, isActive }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    meshRef.current.rotation.y += 0.01
  })

  const color = type === 'core' ? '#ef4444' : 
               type === 'router' ? '#3b82f6' : 
               type === 'switch' ? '#10b981' : '#f59e0b'

  return (
    <group position={position}>
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.2 : 1}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={isActive ? color : '#666'}
          emissiveIntensity={0.5}
          roughness={0.7}
          metalness={0.5}
        />
      </mesh>
      
      {label && (
        <Text
          position={[0, -0.5, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  )
}

function NetworkConnection({ start, end }) {
  const points = [start, end].map(p => new THREE.Vector3(...p))
  
  return (
    <Line
      points={points}
      color="#64748b"
      lineWidth={1}
      dashed={false}
    />
  )
}

export default function NetworkTopology() {
  const nodes = [
    { id: 1, position: [0, 2, 0], label: 'Core', type: 'core', isActive: true },
    { id: 2, position: [-3, 0, 0], label: 'Router-1', type: 'router', isActive: true },
    { id: 3, position: [3, 0, 0], label: 'Router-2', type: 'router', isActive: true },
    { id: 4, position: [-5, -2, 0], label: 'Switch-A', type: 'switch', isActive: true },
    { id: 5, position: [0, -2, 0], label: 'Switch-B', type: 'switch', isActive: true },
    { id: 6, position: [5, -2, 0], label: 'Switch-C', type: 'switch', isActive: true },
    { id: 7, position: [-6, -4, 0], label: 'C-1001', type: 'customer', isActive: true },
    { id: 8, position: [-4, -4, 0], label: 'C-1002', type: 'customer', isActive: false },
    { id: 9, position: [-1, -4, 0], label: 'C-1003', type: 'customer', isActive: true },
    { id: 10, position: [1, -4, 0], label: 'C-1004', type: 'customer', isActive: true },
    { id: 11, position: [4, -4, 0], label: 'C-1005', type: 'customer', isActive: true },
    { id: 12, position: [6, -4, 0], label: 'C-1006', type: 'customer', isActive: true },
  ]

  const connections = [
    { start: [0, 2, 0], end: [-3, 0, 0] },
    { start: [0, 2, 0], end: [3, 0, 0] },
    { start: [-3, 0, 0], end: [-5, -2, 0] },
    { start: [3, 0, 0], end: [0, -2, 0] },
    { start: [3, 0, 0], end: [5, -2, 0] },
    { start: [-5, -2, 0], end: [-6, -4, 0] },
    { start: [-5, -2, 0], end: [-4, -4, 0] },
    { start: [0, -2, 0], end: [-1, -4, 0] },
    { start: [0, -2, 0], end: [1, -4, 0] },
    { start: [5, -2, 0], end: [4, -4, 0] },
    { start: [5, -2, 0], end: [6, -4, 0] },
  ]

  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} />
        
        {/* Nodes */}
        {nodes.map(node => (
          <NetworkNode key={node.id} {...node} />
        ))}
        
        {/* Connections */}
        {connections.map((conn, idx) => (
          <NetworkConnection key={idx} {...conn} />
        ))}
        
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.8}
          maxDistance={30}
          minDistance={5}
        />
      </Canvas>
    </div>
  )
}