// integrations/connectors/nodemailer.connector.ts

import nodemailer from "nodemailer";

export class NodemailerConnector {

  async sendMail(connection, payload) {

    const transporter = nodemailer.createTransport({

      host: connection.credentials.host,
      port: connection.credentials.port,

      secure: false,

      auth: {
        user: connection.credentials.username,
        pass: connection.credentials.password
      }

    });

    const info = await transporter.sendMail({

      from: payload.from,
      to: payload.to,

      subject: payload.subject,
      text: payload.text,
      html: payload.html

    });

    return info;
  }

}