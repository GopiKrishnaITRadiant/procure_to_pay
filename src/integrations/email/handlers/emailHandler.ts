import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import axios from "axios";
import { decrypt } from "../../../utils/cryptoUtil";

export class EmailHandler {
  async execute(action: string, payload: any, credentials: any) {
    if (action !== "sendMail") {
      throw new Error(`Unsupported action: ${action}`);
    }

    const provider = credentials.provider;

    if (!provider) {
      throw new Error("Email provider missing in credentials");
    }

    switch (provider) {
      case "smtp":
        return this.smtpSendMail(credentials, payload);

      case "sendgrid":
        return this.sendGridSendMail(credentials, payload);

      case "ses":
        return this.sesSendMail(credentials, payload);

      case "microsoft_graph":
        return this.microsoftGraphSendMail(credentials, payload);

      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  //SMTP (Nodemailer)
  private async smtpSendMail(credentials: any, payload: any) {
    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
      secure: credentials.port === 465,
      auth: {
        user: credentials.username,
        pass: credentials.password,
      },
    });

    return await transporter.sendMail({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

  //SendGrid
  private async sendGridSendMail(credentials: any, payload: any) {
    sgMail.setApiKey(credentials.apiKey);

    const msg = {
      to: payload.to,
      from: payload.from,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    };

    return await sgMail.send(msg);
  }

  //AWS SES (SDK v3)
  private async sesSendMail(credentials: any, payload: any) {
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");

    const client = new SESClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    const command = new SendEmailCommand({
      Source: payload.from,
      Destination: {
        ToAddresses: Array.isArray(payload.to) ? payload.to : [payload.to],
      },
      Message: {
        Subject: { Data: payload.subject },
        Body: {
          Text: payload.text ? { Data: payload.text } : undefined,
          Html: payload.html ? { Data: payload.html } : undefined,
        },
      },
    });

    return await client.send(command);
  }

  //Microsoft Graph API (OAuth)
  private async microsoftGraphSendMail(credentials: any, payload: any) {
    try {
      //Get Access Token
      const tokenRes = await axios.post(
        `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: decrypt(credentials.clientSecret),
          grant_type: "client_credentials",
          scope: "https://graph.microsoft.com/.default",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      const accessToken = tokenRes.data.access_token;

      if (!accessToken) {
        throw new Error("Access token not received from Azure");
      }

      //Prepare Graph payload
      const graphPayload = {
        message: {
          subject: payload.subject,
          body: {
            contentType: payload.html ? "HTML" : "Text",
            content: payload.html || payload.body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: payload.to,
              },
            },
          ],
        },
      };

      const sendRes = await axios.post(
        `https://graph.microsoft.com/v1.0/users/${credentials.fromEmail}/sendMail`,
        graphPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      return sendRes.data;
    } catch (err: any) {
      throw new Error( err.response?.data || err.message||"Failed to send email via Microsoft Graph");
    }
  }
}
