import { motion } from 'framer-motion'
import { HiPlus, HiDocumentAdd, HiCreditCard, HiUserGroup, HiDownload, HiMail } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'

const actions = [
  { id: 1, icon: HiPlus, label: 'Add Customer', description: 'Register new customer', color: 'bg-blue-500', path: '/customers' },
  { id: 2, icon: HiDocumentAdd, label: 'Create Invoice', description: 'Generate manual invoice', color: 'bg-green-500', path: '/invoices' },
  { id: 3, icon: HiCreditCard, label: 'Record Payment', description: 'Add payment record', color: 'bg-purple-500', path: '/payments' },
  { id: 4, icon: HiUserGroup, label: 'Bulk Import', description: 'Import customers from CSV', color: 'bg-orange-500', path: '/customers' },
  { id: 5, icon: HiDownload, label: 'Export Report', description: 'Download monthly report', color: 'bg-red-500', path: '/reports' },
  { id: 6, icon: HiMail, label: 'Send Reminders', description: 'Send payment reminders', color: 'bg-indigo-500', path: '/invoices' },
]

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
          >
            <div className={`p-3 rounded-full ${action.color} text-white mb-3`}>
              <action.icon className="h-6 w-6" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-primary-600">
              {action.label}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {action.description}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}