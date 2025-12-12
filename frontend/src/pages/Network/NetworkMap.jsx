import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Line, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import axios from 'axios'
import toast from 'react-hot-toast'
import { HiRefresh, HiWifi, HiUsers, HiArrowLeft } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'

function RouterNode({ position, router, onClick }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    meshRef.current.rotation.y += 0.01
  })

  const color = router.status === 'ACTIVE' ? '#10b981' :
                router.status === 'MAINTENANCE' ? '#f59e0b' :
                '#ef4444'

  return (
    <group position={position}>
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onClick(router)}
        scale={hovered ? 1.2 : 1}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={router.status === 'ACTIVE' ? color : '#666'}
          emissiveIntensity={0.5}
          roughness={0.7}
          metalness={0.5}
        />
      </mesh>
      
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {router.name}
      </Text>

      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-black bg-opacity-75 text-white p-2 rounded-lg text-xs max-w-xs">
            <div className="font-bold">{router.name}</div>
            <div>IP: {router.ipAddress}</div>
            <div>Location: {router.location}</div>
            <div>Users: {router.connectedUsers}</div>
            <div>Status: {router.status}</div>
          </div>
        </Html>
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

export default function NetworkMap() {
  const navigate = useNavigate()
  const [routers, setRouters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRouter, setSelectedRouter] = useState(null)
  const [viewMode, setViewMode] = useState('3d') // '3d' or '2d'

  useEffect(() => {
    fetchRouters()
  }, [])

  const fetchRouters = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/routers')
      if (data.success) {
        setRouters(data.data)
      }
    } catch (error) {
      toast.error('Failed to fetch routers')
    } finally {
      setLoading(false)
    }
  }

  // Generate positions for routers
  const generatePositions = (count) => {
    const positions = []
    const radius = 5
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = Math.random() * 2 - 1 // Some height variation
      positions.push([x, z, y])
    }
    
    return positions
  }

  const positions = generatePositions(routers.length)
  const connections = []

  // Create connections (star topology)
  if (routers.length > 1) {
    const center = [0, 0, 0]
    positions.forEach(pos => {
      connections.push({ start: center, end: pos })
    })
  }

  // Create mesh connections between nearby routers
  for (let i = 0; i < routers.length; i++) {
    for (let j = i + 1; j < routers.length; j++) {
      const distance = Math.sqrt(
        Math.pow(positions[i][0] - positions[j][0], 2) +
        Math.pow(positions[i][1] - positions[j][1], 2) +
        Math.pow(positions[i][2] - positions[j][2], 2)
      )
      
      if (distance < 8) {
        connections.push({ start: positions[i], end: positions[j] })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/network')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Network Map</h1>
            <p className="text-gray-600">3D visualization of network topology</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === '3d' ? 'bg-primary-600 text-white' : 'text-gray-700'
              }`}
            >
              3D View
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === '2d' ? 'bg-primary-600 text-white' : 'text-gray-700'
              }`}
            >
              2D View
            </button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchRouters}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HiRefresh className="h-5 w-5 mr-2" />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <HiWifi className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Routers</p>
              <p className="text-2xl font-bold">{routers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <HiWifi className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold">
                {routers.filter(r => r.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
              <HiWifi className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Offline</p>
              <p className="text-2xl font-bold">
                {routers.filter(r => r.status !== 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <HiUsers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">
                {routers.reduce((sum, r) => sum + r.connectedUsers, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-700">Active Router</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-sm text-gray-700">Maintenance</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
            <span className="text-sm text-gray-700">Offline</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 mr-2" style={{ height: '2px', width: '20px' }}></div>
            <span className="text-sm text-gray-700">Network Connection</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading network map...</p>
            </div>
          </div>
        ) : routers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📡</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No routers found</h3>
              <p className="text-gray-600">Add routers to visualize network topology</p>
            </div>
          </div>
        ) : (
          <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <Stars radius={100} depth={50} count={5000} factor={4} />
            
            {/* Center Node */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.5, 32, 32]} />
              <meshStandardMaterial 
                color="#3b82f6" 
                emissive="#3b82f6"
                emissiveIntensity={0.5}
              />
            </mesh>
            <Text position={[0, -0.8, 0]} fontSize={0.2} color="white" anchorX="center">
              Core Network
            </Text>
            
            {/* Router Nodes */}
            {routers.map((router, index) => (
              <RouterNode
                key={router.id}
                position={positions[index]}
                router={router}
                onClick={setSelectedRouter}
              />
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
        )}
      </div>

      {/* Selected Router Details */}
      {selectedRouter && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{selectedRouter.name}</h3>
              <p className="text-gray-600">Router Details</p>
            </div>
            <button
              onClick={() => setSelectedRouter(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <HiX className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <p className="mt-1 font-mono">{selectedRouter.ipAddress}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">MAC Address</label>
                <p className="mt-1 font-mono">{selectedRouter.macAddress}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <p className="mt-1">{selectedRouter.model}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1">{selectedRouter.location}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  selectedRouter.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800'
                    : selectedRouter.status === 'MAINTENANCE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedRouter.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Connected Users</label>
                <p className="mt-1 text-2xl font-bold text-primary-600">{selectedRouter.connectedUsers}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bandwidth Limit</label>
                <p className="mt-1">{selectedRouter.bandwidthLimit} Mbps</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Seen</label>
                <p className="mt-1">
                  {selectedRouter.lastSeen 
                    ? new Date(selectedRouter.lastSeen).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900">Bandwidth Utilization</h4>
                <p className="text-sm text-gray-600">
                  Estimated based on connected users (5 Mbps per user)
                </p>
              </div>
              <span className="text-lg font-bold">
                {((selectedRouter.connectedUsers * 5) / selectedRouter.bandwidthLimit * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${Math.min((selectedRouter.connectedUsers * 5) / selectedRouter.bandwidthLimit * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}