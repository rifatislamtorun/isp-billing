import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  HiUsers, 
  HiCurrencyDollar, 
  HiDocumentText, 
  HiWifi,
  HiArrowUp,
  HiArrowDown,
  HiTrendingUp
} from 'react-icons/hi'
import { Line, Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import NetworkTopology from '../../components/Network/NetworkTopology'
import StatCard from '../../components/Dashboard/StatCard'
import RecentActivity from '../../components/Dashboard/RecentActivity'
import QuickActions from '../../components/Dashboard/QuickActions'
import axios from 'axios'
import toast from 'react-hot-toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Dashboard() {
  const [stats, setStats] = useState({
    customers: { total: 0, change: 0 },
    revenue: { total: 0, change: 0 },
    invoices: { total: 0, change: 0 },
    activeConnections: { total: 0, change: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data } = await axios.get('/dashboard/stats')
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Chart data
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [12000, 19000, 15000, 25000, 22000, 30000],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const customerGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Customers',
        data: [45, 60, 75, 80, 90, 110],
        backgroundColor: '#10b981'
      }
    ]
  }

  const packageDistributionData = {
    labels: ['Basic 10Mbps', 'Standard 25Mbps', 'Premium 50Mbps', 'Business 100Mbps'],
    datasets: [
      {
        data: [30, 40, 20, 10],
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444'
        ]
      }
    ]
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your ISP.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          onClick={() => toast.success('Generating monthly invoices...')}
        >
          Generate Monthly Invoices
        </motion.button>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Total Customers"
          value={stats.customers.total}
          change={stats.customers.change}
          icon={<HiUsers className="h-6 w-6" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.revenue.total.toLocaleString()}`}
          change={stats.revenue.change}
          icon={<HiCurrencyDollar className="h-6 w-6" />}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Pending Invoices"
          value={stats.invoices.total}
          change={stats.invoices.change}
          icon={<HiDocumentText className="h-6 w-6" />}
          color="orange"
          loading={loading}
        />
        <StatCard
          title="Active Connections"
          value={stats.activeConnections.total}
          change={stats.activeConnections.change}
          icon={<HiWifi className="h-6 w-6" />}
          color="purple"
          loading={loading}
        />
      </motion.div>

      {/* Charts & Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Revenue Trend</h3>
            <div className="flex items-center text-green-600">
              <HiTrendingUp className="h-5 w-5 mr-1" />
              <span>12.5% increase</span>
            </div>
          </div>
          <Line 
            data={revenueData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                }
              }
            }}
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-6">Package Distribution</h3>
          <div className="h-64">
            <Pie 
              data={packageDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-6">Customer Growth</h3>
          <Bar 
            data={customerGrowthData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                }
              }
            }}
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-6">Network Overview</h3>
          <div className="h-64">
            <NetworkTopology />
          </div>
        </motion.div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <QuickActions />
      </div>
    </motion.div>
  )
}