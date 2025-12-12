const generateCustomerId = async () => {
  const prefix = 'CUST';
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${month}${random}`;
};

const generateInvoiceNumber = async () => {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${year}${month}${day}${random}`;
};

const generateTransactionId = async () => {
  const prefix = 'TXN';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${timestamp}${random}`;
};

const generateTicketNumber = async () => {
  const prefix = 'TICKET';
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${year}${month}${day}${random}`;
};

// আগের ফাংশনগুলির সাথে যোগ করুন
module.exports = {
  generateCustomerId,
  generateInvoiceNumber,
  generateTransactionId,
  generateTicketNumber,
  formatCurrency,
  formatDate,
  calculateDueDate
};

const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const calculateDueDate = (days = 30) => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
};

module.exports = {
  generateCustomerId,
  generateInvoiceNumber,
  generateTransactionId,
  formatCurrency,
  formatDate,
  calculateDueDate
};