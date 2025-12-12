import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  HiHome, 
  HiUsers, 
  HiDocumentText, 
  HiCreditCard,
  HiChip,
  HiWifi,
  HiSupport,
  HiChartBar,
  HiCog,
  HiLogout
} from 'react-icons/hi'
import { useAuth } from '../../contexts/AuthContext'

const menuItems = [
  { path: '/', name: 'Dashboard', icon: HiHome },
  { path: '/customers', name: 'Customers', icon: HiUsers },
  { path: '/invoices', name: 'Invoices', icon: HiDocumentText },
  { path: '/payments', name: 'Payments', icon: HiCreditCard },
  { path: '/packages', name: 'Packages', icon: HiChip },
  { path: '/network', name: 'Network', icon: HiWifi },
  { path: '/support', name: 'Support', icon: HiSupport },
  { path: '/reports', name: 'Reports', icon: HiChartBar },
  { path: '/settings', name: 'Settings', icon: HiCog },
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-primary-700">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center space-x-3"
        >
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-primary-600 font-bold">ISP</span>
          </div>
          <span className="text-white font-bold text-lg">Billing Pro</span>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <NavLink
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-primary-700 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-primary-200 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-primary-200 hover:text-white transition-colors"
            title="Logout"
          >
            <HiLogout className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}