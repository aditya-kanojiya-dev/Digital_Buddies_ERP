export interface WelcomeEmailProps {
  name: string;
  email: string;
  password: string;
  appUrl: string;
}

export const getWelcomeEmailHtml = ({ name, email, password, appUrl }: WelcomeEmailProps): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Digital Buddies – Your AntiGravity Account</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0f0b21;
            color: #e2e8f0;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 540px;
            margin: 0 auto;
            background-color: rgba(20, 16, 42, 0.9);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          }
          .header {
            text-align: center;
            border-bottom: 1px solid rgba(139, 92, 246, 0.1);
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .header h2 {
            color: #c084fc;
            margin: 0;
            font-size: 20px;
            font-weight: 700;
          }
          .body {
            font-size: 14px;
            line-height: 1.6;
            color: #cbd5e1;
          }
          .highlight-box {
            background-color: rgba(139, 92, 246, 0.08);
            border: 1px solid rgba(139, 92, 246, 0.15);
            border-radius: 8px;
            padding: 16px 20px;
            margin: 20px 0;
          }
          .highlight-box p {
            margin: 8px 0;
          }
          .button-link {
            display: inline-block;
            background: linear-gradient(135deg, #7c3aed 0%, #d946ef 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            margin-top: 32px;
            font-size: 11px;
            color: #64748b;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to Digital Buddies</h2>
          </div>
          <div class="body">
            <p>Hi ${name},</p>
            <p>Your AntiGravity account has been successfully created. You can now log in to the ERP platform using the credentials below.</p>
            
            <div class="highlight-box">
              <p><strong>Login URL:</strong> <a href="${appUrl}" style="color: #c084fc; text-decoration: underline;">${appUrl}</a></p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #2e1065; color: #f472b6; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${password}</span></p>
            </div>

            <p style="color: #fbbf24;">⚠️ NOTE: You will be required to change your temporary password immediately upon your first login before you can access the dashboard.</p>

            <a href="${appUrl}" class="button-link" target="_blank">Access AntiGravity Portal</a>

            <p>Regards,<br>Digital Buddies Team</p>
          </div>
          <div class="footer">
            <p>This is an automated system email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
