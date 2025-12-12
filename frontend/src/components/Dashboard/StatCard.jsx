import { motion } from 'framer-motion'
import { HiArrowUp, HiArrowDown } from 'react-icons/hi'

export default function StatCard({ title, value, change, icon, color, loading }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      
      {!loading && change !== undefined && (
        <div className="flex items-center mt-4">
          {change >= 0 ? (
            <HiArrowUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <HiArrowDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change)} {change >= 0 ? 'increase' : 'decrease'} from last month
          </span>
        </div>
      )}
    </motion.div>
  )
}