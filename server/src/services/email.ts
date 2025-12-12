import nodemailer from "nodemailer";

// Create transporter using environment variables
const createTransporter = () => {
  // For development, you can use services like Mailtrap, Gmail, or any SMTP service
  // For production, use services like SendGrid, AWS SES, etc.
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Generate a secure random password
export const generateSecurePassword = (length: number = 12): string => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + special;

  let password = "";

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

interface WelcomeEmailData {
  to: string;
  username: string;
  fullName: string;
  password: string;
  role: string;
}

export const sendWelcomeEmail = async (
  data: WelcomeEmailData
): Promise<boolean> => {
  const { to, username, fullName, password, role } = data;

  // Debug: Log email configuration status
  console.log("Email configuration check:");
  console.log(
    `  SMTP_HOST: ${
      process.env.SMTP_HOST || "(not set, using default: smtp.gmail.com)"
    }`
  );
  console.log(
    `  SMTP_PORT: ${process.env.SMTP_PORT || "(not set, using default: 587)"}`
  );
  console.log(
    `  SMTP_USER: ${process.env.SMTP_USER ? "✓ configured" : "✗ NOT SET"}`
  );
  console.log(
    `  SMTP_PASS: ${process.env.SMTP_PASS ? "✓ configured" : "✗ NOT SET"}`
  );

  // Check if email is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("\n⚠️ Email service not configured. Skipping email send.");
    console.log("New user credentials for manual delivery:");
    console.log(`  Email: ${to}`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    return false;
  }

  try {
    console.log(`\nAttempting to send welcome email to: ${to}`);
    const transporter = createTransporter();

    // Verify transporter connection
    await transporter.verify();
    console.log("SMTP connection verified successfully");

    const mailOptions = {
      from: `"Vendoa" <${process.env.SMTP_USER}>`,
      to,
      subject: "Welcome to Vendoa - Your Account Credentials",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
            .credential-item { margin: 10px 0; }
            .credential-label { font-weight: bold; color: #6366f1; }
            .credential-value { font-family: monospace; background: #f3f4f6; padding: 5px 10px; border-radius: 4px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🛒 Vendoa</h1>
              <p style="margin: 10px 0 0 0;">Welcome to the Team!</p>
            </div>
            <div class="content">
              <p>Hello <strong>${fullName || username}</strong>,</p>
              <p>Your account has been created in Vendoa. You can now log in using the credentials below:</p>
              
              <div class="credentials">
                <div class="credential-item">
                  <span class="credential-label">Username:</span>
                  <span class="credential-value">${username}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span>
                  <span class="credential-value">${password}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Role:</span>
                  <span class="credential-value">${
                    role.charAt(0).toUpperCase() + role.slice(1)
                  }</span>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <p style="margin: 10px 0 0 0;">Please change your password immediately after your first login for security purposes. Go to Settings → Security → Change Password.</p>
              </div>
              
              <p style="margin-top: 20px;">If you have any questions, please contact your administrator.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Vendoa.</p>
              <p>© ${new Date().getFullYear()} Vendoa. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Vendoa!

Hello ${fullName || username},

Your account has been created. Here are your login credentials:

Username: ${username}
Password: ${password}
Role: ${role.charAt(0).toUpperCase() + role.slice(1)}

IMPORTANT: Please change your password immediately after your first login for security purposes.

If you have any questions, please contact your administrator.

© ${new Date().getFullYear()} Vendoa
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
};
