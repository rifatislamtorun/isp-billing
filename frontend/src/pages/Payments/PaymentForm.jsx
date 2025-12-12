import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import axios from 'axios'
import toast from 'react-hot-toast'
import { HiX, HiSave, HiUser, HiDocumentText, HiCurrencyDollar } from 'react-icons/hi'

const schema = yup.object({
  invoiceId: yup.string().required('Invoice is required'),
  customerId: yup.string().required('Customer is required'),
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  method: yup.string().required('Payment method is required'),
  reference: yup.string(),
  notes: yup.string()
})

export default function PaymentForm({ onClose, onSuccess }) {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(false)

  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue,
    formState: { errors } 
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      method: 'CASH',
      paidAt: new Date().toISOString().slice(0, 16)
    }
  })

  const customerId = watch('customerId')

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (customerId) {
      fetchCustomerInvoices(customerId)
    }
  }, [customerId])

  const fetchCustomers = async () => {
    try {
      const { data } = await axios.get('/customers?limit=100&status=ACTIVE')
      if (data.success) {
        setCustomers(data.data.customers)
      }
    } catch (error) {
      toast.error('Failed to load customers')
    }
  }

  const fetchCustomerInvoices = async (customerId) => {
    try {
      const { data } = await axios.get(`/invoices?customerId=${customerId}&status=PENDING`)
      if (data.success) {
        setInvoices(data.data.invoices)
        
        const customer = customers.find(c => c.id === customerId)
        setSelectedCustomer(customer)
      }
    } catch (error) {
      setInvoices([])
    }
  }

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const { data: response } = await axios.post('/payments', data)
      
      if (response.success) {
        toast.success('Payment recorded successfully!')
        onSuccess()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Record Payment</h3>
                <p className="text-gray-600 mt-1">Record customer payment</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 p-2"
              >
                <HiX className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <div className="relative">
                  <HiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <select
                    {...register('customerId')}
                    onChange={(e) => setValue('customerId', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.customerId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customerId}) - Balance: ${customer.balance?.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.customerId && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
                )}
              </div>

              {/* Customer Info */}
              {selectedCustomer && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Current Balance:</div>
                    <div className={`font-medium ${selectedCustomer.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(selectedCustomer.balance).toFixed(2)}
                      {selectedCustomer.balance < 0 && ' (Credit)'}
                    </div>
                    
                    <div className="text-gray-600">Package:</div>
                    <div className="font-medium">{selectedCustomer.package?.name}</div>
                    
                    <div className="text-gray-600">Phone:</div>
                    <div className="font-medium">{selectedCustomer.phone}</div>
                  </div>
                </div>
              )}

              {/* Invoice */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice *
                </label>
                <div className="relative">
                  <HiDocumentText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <select
                    {...register('invoiceId')}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.invoiceId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select an invoice</option>
                    {invoices.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - ${invoice.dueAmount?.toFixed(2)} due
                      </option>
                    ))}
                    <option value="OTHER">Other (No specific invoice)</option>
                  </select>
                </div>
                {errors.invoiceId && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceId.message}</p>
                )}
              </div>

              {/* Amount & Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <div className="relative">
                    <HiCurrencyDollar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount')}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    {...register('method')}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.method ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MOBILE_BANKING">Mobile Banking</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="STRIPE">Stripe</option>
                    <option value="SSLCOMMERZ">SSLCommerz</option>
                  </select>
                </div>
              </div>

              {/* Reference & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    {...register('reference')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Transaction ID, check number, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    {...register('paidAt')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Additional notes about this payment..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <HiSave className="h-5 w-5 mr-2" />
                      Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}