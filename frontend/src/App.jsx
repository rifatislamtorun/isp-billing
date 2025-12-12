import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Customers from './pages/Customers/Customers'
import CustomerDetail from './pages/Customers/CustomerDetail'
import Invoices from './pages/Invoices/Invoices'
import InvoiceDetail from './pages/Invoices/InvoiceDetail'
import Payments from './pages/Payments/Payments'
import Packages from './pages/Packages/Packages'
import Routers from './pages/Network/Routers'
import NetworkMap from './pages/Network/NetworkMap'
import SupportTickets from './pages/Support/SupportTickets'
import Reports from './pages/Reports/Reports'
import Settings from './pages/Settings/Settings'
import CustomerPortal from './pages/Customer/Portal'
import { useAuth } from './contexts/AuthContext'
import './App.css'

function App() {
  const { user, customer } = useAuth()

  // Initialize Socket.IO
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      
      if (user?.role) {
        socket.emit('join_admin')
      }
      
      if (customer?.id) {
        socket.emit('join_customer', customer.id)
      }
    })

    socket.on('new_payment', (data) => {
      console.log('New payment:', data)
      // Show notification
    })

    socket.on('payment_confirmed', (data) => {
      console.log('Payment confirmed:', data)
      // Update UI
    })

    socket.on('network_usage', (data) => {
      console.log('Network usage update:', data)
      // Update network monitor
    })

    return () => {
      socket.disconnect()
    }
  }, [user, customer])

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Customer Portal */}
      <Route path="/customer/login" element={<CustomerPortal type="login" />} />
      <Route path="/customer/dashboard" element={
        customer ? <CustomerPortal /> : <Navigate to="/customer/login" />
      } />
      
      {/* Protected Admin Routes */}
      <Route path="/" element={
        user ? <Layout /> : <Navigate to="/login" />
      }>
        <Route index element={<Dashboard />} />
        <Route path="customers">
          <Route index element={<Customers />} />
          <Route path=":id" element={<CustomerDetail />} />
        </Route>
        <Route path="invoices">
          <Route index element={<Invoices />} />
          <Route path=":id" element={<InvoiceDetail />} />
        </Route>
        <Route path="payments" element={<Payments />} />
        <Route path="packages" element={<Packages />} />
        <Route path="network">
          <Route index element={<Routers />} />
          <Route path="map" element={<NetworkMap />} />
        </Route>
        <Route path="support" element={<SupportTickets />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App