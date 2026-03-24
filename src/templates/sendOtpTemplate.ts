export const generateOtpEmail = (firstName: string, otpCode: string, supportEmail: string, supportPageLink: string, companyName: string, websiteUrl: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your One-Time Password (OTP) for Access</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0044cc;">Hello ${firstName},</h2>
            <p style="font-size: 16px; line-height: 1.6;">Thank you for requesting to access your account on ${companyName}.</p>
            <p style="font-size: 16px; line-height: 1.6;">Please use the following One-Time Password (OTP) to complete your login process:</p>
            <h3 style="font-size: 24px; color: #e74c3c; text-align: center;">${otpCode}</h3>
            <p style="font-size: 16px; line-height: 1.6;">This OTP is valid for the next 15 minutes. If you did not request this, please ignore this email. For security reasons, do not share your OTP with anyone.</p>
            <p style="font-size: 16px; line-height: 1.6;">If you need any further assistance, feel free to contact our support team at <a href="mailto:${supportEmail}" style="color: #0044cc;">${supportEmail}</a> or visit our <a href="${supportPageLink}" style="color: #0044cc;">Support Page</a>.</p>
            <p style="font-size: 16px; line-height: 1.6;">Best regards,<br>The ${companyName} Team<br><a href="${websiteUrl}" style="color: #0044cc;">${websiteUrl}</a></p>
        </div>
    </body>
    </html>
  `;
};