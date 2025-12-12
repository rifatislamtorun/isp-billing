import { motion } from 'framer-motion'
import { HiCheckCircle, HiClock, HiExclamationCircle, HiUserAdd, HiCurrencyDollar } from 'react-icons/hi'

const activities = [
  { id: 1, user: 'John Doe', action: 'added new customer', time: '2 minutes ago', icon: HiUserAdd, color: 'text-green-500' },
  { id: 2, user: 'Jane Smith', action: 'processed payment', amount: '$150', time: '15 minutes ago', icon: HiCurrencyDollar, color: 'text-blue-500' },
  { id: 3, user: 'System', action: 'generated monthly invoices', time: '1 hour ago', icon: HiCheckCircle, color: 'text-purple-500' },
  { id: 4, user: 'Network Team', action: 'router maintenance', router: 'Router-01', time: '2 hours ago', icon: HiExclamationCircle, color: 'text-orange-500' },
  { id: 5, user: 'Mike Johnson', action: 'resolved support ticket', ticket: '#TICKET2023001', time: '3 hours ago', icon: HiCheckCircle, color: 'text-green-500' },
]

export default function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0"
          >
            <div className={`p-2 rounded-full ${activity.color.replace('text', 'bg')} bg-opacity-10`}>
              <activity.icon className={`h-5 w-5 ${activity.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.user}</span> {activity.action}
                {activity.amount && <span className="font-medium ml-1">{activity.amount}</span>}
                {activity.router && <span className="font-medium ml-1">({activity.router})</span>}
                {activity.ticket && <span className="font-medium ml-1">{activity.ticket}</span>}
              </p>
              <div className="flex items-center mt-1 text-xs text-gray-500">
                <HiClock className="h-3 w-3 mr-1" />
                {activity.time}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <button className="w-full mt-4 text-center text-primary-600 hover:text-primary-700 text-sm font-medium">
        View All Activity →
      </button>
    </motion.div>
  )
}