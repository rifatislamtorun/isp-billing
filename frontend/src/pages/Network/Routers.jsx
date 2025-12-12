import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HiPlus, HiSearch, HiWifi, HiSignal, HiOutlineLocationMarker, HiPencil, HiTrash, HiRefresh } from 'react-icons/hi'
import axios from 'axios'
import toast from 'react-hot-toast'
import RouterForm from './RouterForm'

export default function Routers() {
  const [routers, setRouters] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedRouter, setSelectedRouter] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    offline: 0,
    totalUsers: 0
  })

  useEffect(() => {
    fetchRouters()
  }, [])

  const fetchRouters = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/routers')
      if (data.success) {
        setRouters(data.data)
        calculateStats(data.data)
      }
    } catch (error) {
      toast.error('Failed to fetch routers')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (routers) => {
    const total = routers.length
    const active = routers.filter(r => r.status === 'ACTIVE').length
    const totalUsers = routers.reduce((sum, r) => sum + r.connectedUsers, 0)
    
    setStats({
      total,
      active,
      offline: total - active,
      totalUsers
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this router?')) return
    
    try {
      const { data } = await axios.delete(`/routers/${id}`)
      if (data.success) {
        toast.success('Router deleted successfully')
        fetchRouters()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete router')
    }
  }

  const updateRouterStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE'
    
    try {
      const { data } = await axios.post(`/routers/${id}/status`, {
        status: newStatus,
        reason: 'Manual status update'
      })
      
      if (data.success) {
        toast.success(`Router ${newStatus === 'ACTIVE' ? 'activated' : 'put in maintenance'}`)
        fetchRouters()
      }
    } catch (error) {
      toast.error('Failed to update router status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Network Routers</h1>
          <p className="text-gray-600">Manage network infrastructure and routers</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <HiPlus className="h-5 w-5 mr-2" />
            Add Router
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/network/map'}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HiOutlineLocationMarker className="h-5 w-5 mr-2" />
            View Map
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Routers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <HiWifi className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Routers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <HiSignal className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Connected Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <HiWifi className="h-6 w-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offline</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.offline}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <HiSignal className="h-6 w-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search routers by name, IP, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="DOWN">Down</option>
            </select>
            
            <button 
              onClick={fetchRouters}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <HiRefresh className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Routers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : routers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📡</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No routers found</h3>
          <p className="text-gray-600">Add your first network router to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routers
            .filter(router => 
              router.name.toLowerCase().includes(search.toLowerCase()) ||
              router.ipAddress.toLowerCase().includes(search.toLowerCase()) ||
              router.location.toLowerCase().includes(search.toLowerCase())
            )
            .map((router, index) => (
            <motion.div
              key={router.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
                router.status === 'ACTIVE' ? 'border-green-200' :
                router.status === 'MAINTENANCE' ? 'border-yellow-200' :
                'border-red-200'
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{router.name}</h3>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        router.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800'
                          : router.status === 'MAINTENANCE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {router.status}
                      </span>
                      <span className="text-gray-600 ml-2">• {router.ipAddress}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Connected</div>
                    <div className="text-2xl font-bold text-primary-600">{router.connectedUsers}</div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">Model:</span>
                    <span>{router.model}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">MAC Address:</span>
                    <span className="font-mono">{router.macAddress}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <HiOutlineLocationMarker className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{router.location}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">Bandwidth:</span>
                    <span>{router.bandwidthLimit} Mbps</span>
                  </div>
                  {router.lastSeen && (
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium mr-2">Last Seen:</span>
                      <span>{new Date(router.lastSeen).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Utilization */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Bandwidth Utilization</span>
                    <span>{((router.connectedUsers * 5) / router.bandwidthLimit * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${Math.min((router.connectedUsers * 5) / router.bandwidthLimit * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRouter(router)
                        setShowForm(true)
                      }}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Edit"
                    >
                      <HiPencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(router.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Delete"
                    >
                      <HiTrash className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => updateRouterStatus(router.id, router.status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      router.status === 'ACTIVE'
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {router.status === 'ACTIVE' ? 'Maintenance' : 'Activate'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Router Form Modal */}
      {showForm && (
        <RouterForm
          router={selectedRouter}
          onClose={() => {
            setShowForm(false)
            setSelectedRouter(null)
          }}
          onSuccess={() => {
            fetchRouters()
            setShowForm(false)
            setSelectedRouter(null)
          }}
        />
      )}
    </div>
  )
}