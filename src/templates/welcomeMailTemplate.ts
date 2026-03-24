export const generateWelcomeEmail = (firstName: string, activationLink: string, supportEmail: string, helpCenterLink: string, companyName: string, websiteUrl: string, facebookLink: string, twitterLink: string, linkedinLink: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${companyName}! Activate Your Account</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0044cc;">Hello ${firstName},</h2>
            <p style="font-size: 16px; line-height: 1.6;">Welcome to ${companyName}! We're thrilled to have you on board.</p>
            <p style="font-size: 16px; line-height: 1.6;">To get started, please activate your account by clicking the link below:</p>
            <p style="text-align: center;">
                <a href="${activationLink}" style="display: inline-block; padding: 10px 20px; background-color: #0044cc; color: #fff; text-decoration: none; border-radius: 5px;">Activate Your Account</a>
            </p>
            <p style="font-size: 16px; line-height: 1.6;">This link will take you to a secure page where you can complete your registration and start using all the features we offer.</p>
            <p style="font-size: 16px; line-height: 1.6;">If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:${supportEmail}" style="color: #0044cc;">${supportEmail}</a> or visit our <a href="${helpCenterLink}" style="color: #0044cc;">Help Center</a>.</p>
            <p style="font-size: 16px; line-height: 1.6;">We’re here to help and ensure you get the most out of your ${companyName} experience!</p>
            <p style="font-size: 16px; line-height: 1.6;">Best regards,<br>The ${companyName} Team<br><a href="${websiteUrl}" style="color: #0044cc;">${websiteUrl}</a></p>
            
            <p style="font-size: 14px; color: #777;">Follow us: 
                <a href="${facebookLink}" style="color: #0044cc;">Facebook</a> | 
                <a href="${twitterLink}" style="color: #0044cc;">Twitter</a> | 
                <a href="${linkedinLink}" style="color: #0044cc;">LinkedIn</a>
            </p>
        </div>
    </body>
    </html>
  `;
};