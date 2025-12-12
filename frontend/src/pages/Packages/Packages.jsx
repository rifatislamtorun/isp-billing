import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HiPlus, HiSearch, HiPencil, HiTrash, HiCheckCircle, HiXCircle } from 'react-icons/hi'
import axios from 'axios'
import toast from 'react-hot-toast'
import PackageForm from './PackageForm'

export default function Packages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/packages')
      if (data.success) {
        setPackages(data.data)
      }
    } catch (error) {
      toast.error('Failed to fetch packages')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return
    
    try {
      const { data } = await axios.delete(`/packages/${id}`)
      if (data.success) {
        toast.success('Package deleted successfully')
        fetchPackages()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete package')
    }
  }

  const toggleStatus = async (id, currentStatus) => {
    try {
      const { data } = await axios.put(`/packages/${id}/toggle`)
      if (data.success) {
        toast.success(data.message)
        fetchPackages()
      }
    } catch (error) {
      toast.error('Failed to update package status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Packages</h1>
          <p className="text-gray-600">Manage internet packages and pricing</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <HiPlus className="h-5 w-5 mr-2" />
          Add Package
        </motion.button>
      </div>

      {/* Packages Grid */}
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
      ) : packages.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
          <p className="text-gray-600">Create your first internet package to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
                pkg.isActive ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-2xl font-bold text-primary-600">${pkg.price}</span>
                      <span className="text-gray-600 ml-2">/month</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">Speed:</span>
                    <span>{pkg.speed}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">Bandwidth:</span>
                    <span>{pkg.bandwidth}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="font-medium mr-2">Setup Fee:</span>
                    <span>${pkg.setupFee}</span>
                  </div>
                  {pkg._count && (
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium mr-2">Customers:</span>
                      <span>{pkg._count.customers}</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                {pkg.features && pkg.features.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
                    <ul className="space-y-1">
                      {pkg.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <HiCheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg)
                        setShowForm(true)
                      }}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Edit"
                    >
                      <HiPencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Delete"
                    >
                      <HiTrash className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleStatus(pkg.id, pkg.isActive)}
                    className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      pkg.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {pkg.isActive ? (
                      <>
                        <HiXCircle className="h-4 w-4 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <HiCheckCircle className="h-4 w-4 mr-1" />
                        Activate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Package Form Modal */}
      {showForm && (
        <PackageForm
          package={selectedPackage}
          onClose={() => {
            setShowForm(false)
            setSelectedPackage(null)
          }}
          onSuccess={() => {
            fetchPackages()
            setShowForm(false)
            setSelectedPackage(null)
          }}
        />
      )}
    </div>
  )
}