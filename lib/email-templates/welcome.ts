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
        <title>Welcome to Digital Buddies</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f7;
            color: #51545e;
            margin: 0;
            padding: 0;
          }
          .email-wrapper {
            width: 100%;
            background-color: #f4f4f7;
            padding: 20px 0;
          }
          .email-content {
            max-width: 570px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e8e8f1;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
          }
          .email-header {
            background: linear-gradient(135deg, #7c3aed 0%, #d946ef 100%);
            padding: 30px 20px;
            text-align: center;
          }
          .email-header h1 {
            color: #ffffff;
            font-size: 22px;
            margin: 0;
            letter-spacing: 0.5px;
          }
          .email-body {
            padding: 35px;
          }
          .email-body h2 {
            font-size: 18px;
            color: #1f2937;
            margin-top: 0;
          }
          .email-body p {
            font-size: 14px;
            line-height: 1.6;
            color: #4b5563;
          }
          .credentials-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
          }
          .credentials-box p {
            margin: 8px 0;
            font-size: 13px;
          }
          .credentials-box strong {
            color: #1f2937;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button {
            background: linear-gradient(135deg, #7c3aed 0%, #d946ef 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 25px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            display: inline-block;
            box-shadow: 0 4px 6px rgba(124,58,237,0.25);
          }
          .email-footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #f3f4f6;
          }
          .email-footer p {
            font-size: 11px;
            color: #9ca3af;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-content">
            <div class="email-header">
              <h1>Welcome to Digital Buddies</h1>
            </div>
            <div class="email-body">
              <h2>Hi ${name},</h2>
              <p>Welcome to the Digital Buddies team! Your access credentials for the AntiGravity ERP portal have been successfully generated.</p>
              
              <div class="credentials-box">
                <p><strong>Workspace Portal Link:</strong> <a href="${appUrl}" target="_blank" style="color: #7c3aed; text-decoration: underline;">${appUrl}</a></p>
                <p><strong>Registered Email:</strong> ${email}</p>
                <p><strong>Temporary Passcode:</strong> <span style="font-family: monospace; background: #eaeaea; padding: 2px 5px; border-radius: 3px; font-weight: bold; color: #b91c1c;">${password}</span></p>
              </div>

              <p style="color: #d97706; font-weight: 600; font-size: 13px;">⚠️ IMPORTANT SECURITY NOTICE:</p>
              <p>For safety reasons, you are required to change this temporary passcode immediately upon your first login. You will not be able to access the dashboard until you set a custom, secure password.</p>

              <div class="button-container">
                <a href="${appUrl}" class="button" target="_blank">Access AntiGravity Portal</a>
              </div>

              <p>Best regards,<br>Digital Buddies Operations Team</p>
            </div>
            <div class="email-footer">
              <p>This is an automated system notification. Please do not reply directly to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
