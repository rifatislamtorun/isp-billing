const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"ISP Billing System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text
    });
    
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

const sendWelcomeEmail = async (customer) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to Our ISP Service!</h2>
      <p>Dear ${customer.name},</p>
      <p>Your account has been successfully created.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Account Details:</h3>
        <p><strong>Customer ID:</strong> ${customer.customerId}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Phone:</strong> ${customer.phone}</p>
        <p><strong>Package:</strong> ${customer.package?.name || 'N/A'}</p>
      </div>
      
      <p>You can login to your customer portal using your phone number as password.</p>
      <p>Thank you for choosing our service!</p>
    </div>
  `;
  
  return sendEmail({
    to: customer.email,
    subject: 'Welcome to Our ISP Service',
    html
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail
};