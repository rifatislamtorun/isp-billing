const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async ({ to, message }) => {
  try {
    // For development, log instead of sending real SMS
    if (process.env.NODE_ENV === 'development') {
      console.log('SMS (Development):', { to, message });
      return { success: true, sid: 'DEV_SMS_ID' };
    }
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+88${to}` // Assuming Bangladesh numbers
    });
    
    console.log('SMS sent:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, error: error.message };
  }
};

const sendPaymentReminderSMS = async (customer, invoice) => {
  const message = `Dear ${customer.name}, your invoice #${invoice.invoiceNumber} of ${invoice.amount} BDT is due on ${new Date(invoice.dueDate).toLocaleDateString()}. Please pay to avoid service interruption.`;
  
  return sendSMS({
    to: customer.phone,
    message
  });
};

module.exports = {
  sendSMS,
  sendPaymentReminderSMS
};