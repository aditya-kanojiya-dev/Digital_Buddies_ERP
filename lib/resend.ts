import { Resend } from 'resend';

// Initializing the Resend client with environment variables
const resendApiKey = process.env.RESEND_API_KEY || '';

export const resend = new Resend(resendApiKey);
export const emailFrom = process.env.EMAIL_FROM || 'noreply@yourdomain.com';
export const appUrl = process.env.APP_URL || 'http://localhost:5173';
