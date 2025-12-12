import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize axios
  axios.defaults.baseURL = 'http://localhost:5000/api'
  axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      const userType = localStorage.getItem('userType')
      
      if (!token) {
        setLoading(false)
        return
      }

      if (userType === 'admin') {
        const { data } = await axios.get('/auth/profile')
        setUser(data.data)
      } else if (userType === 'customer') {
        const { data } = await axios.get('/customer/profile')
        setCustomer(data.data)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.clear()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password, isCustomer = false) => {
    try {
      const endpoint = isCustomer ? '/auth/customer/login' : '/auth/login'
      const { data } = await axios.post(endpoint, { 
        [isCustomer ? 'username' : 'email']: email, 
        password 
      })

      if (data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userType', isCustomer ? 'customer' : 'admin')
        
        if (isCustomer) {
          setCustomer(data.data.customer)
        } else {
          setUser(data.data.user)
        }
        
        toast.success('Login successful!')
        return { success: true }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    setCustomer(null)
    toast.success('Logged out successfully')
  }

  const updateProfile = async (profileData) => {
    try {
      const endpoint = user ? '/auth/profile' : '/customer/profile'
      const { data } = await axios.put(endpoint, profileData)
      
      if (data.success) {
        if (user) {
          setUser(data.data)
        } else {
          setCustomer(data.data)
        }
        toast.success('Profile updated!')
      }
    } catch (error) {
      toast.error('Update failed')
    }
  }

  const value = {
    user,
    customer,
    loading,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!(user || customer),
    isAdmin: !!user,
    isCustomer: !!customer
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}