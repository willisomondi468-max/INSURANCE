const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles sending emails for notifications
 */

// Create transporter (configure with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} template - Template name
 * @param {Object} data - Template data
 */
const sendEmail = async (to, subject, template, data) => {
  try {
    // Email templates (simplified)
    const templates = {
      welcome: {
        subject: 'Welcome to Insurance Management System',
        html: `<h1>Welcome, ${data.name}!</h1>
                <p>Thank you for registering with Insurance Management System.</p>
                <p>Your account has been created successfully.</p>
                <p>You can now browse our insurance plans and apply for coverage.</p>`
      },
      policyApproved: {
        subject: 'Policy Approved',
        html: `<h1>Policy Approved</h1>
                <p>Your policy (${data.policyNumber}) has been approved.</p>
                <p>You can now proceed with payment to activate your coverage.</p>`
      },
      claimReceived: {
        subject: 'Claim Received',
        html: `<h1>Claim Received</h1>
                <p>We have received your claim (${data.claimNumber}).</p>
                <p>Our team will review it and get back to you within 5 business days.</p>`
      },
      claimApproved: {
        subject: 'Claim Approved',
        html: `<h1>Claim Approved</h1>
                <p>Your claim (${data.claimNumber}) has been approved.</p>
                <p>The amount of $${data.amount} will be processed shortly.</p>`
      },
      ticketResponse: {
        subject: 'New Response to Your Ticket',
        html: `<h1>New Response</h1>
                <p>You have received a response to your support ticket.</p>
                <p>Log in to your account to view the response.</p>`
      },
      paymentReceived: {
        subject: 'Payment Received',
        html: `<h1>Payment Confirmed</h1>
                <p>We have received your payment of $${data.amount}.</p>
                <p>Transaction ID: ${data.transactionId}</p>`
      }
    };

    const templateData = templates[template];
    
    if (!templateData) {
      console.log(`Unknown template: ${template}`);
      // Send simple email without template
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject,
        html: data.html || '<p>No content</p>'
      });
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: templateData.subject,
      html: templateData.html
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email sending error:', error.message);
    // Don't throw - email failure shouldn't break the app
  }
};

module.exports = { sendEmail };
