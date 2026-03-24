import axios from "axios";
import { AzureAuthConnector } from "./azureAuth.connector";

export class MicrosoftMailConnector {

  async sendMail(connection, payload) {

    const auth = new AzureAuthConnector();

    const token = await auth.getAccessToken(connection);

    const url =
      "https://graph.microsoft.com/v1.0/users/" +
      payload.from +
      "/sendMail";

    const body = {

      message: {

        subject: payload.subject,

        body: {
          contentType: "HTML",
          content: payload.html
        },

        toRecipients: [
          {
            emailAddress: { address: payload.to }
          }
        ]

      }

    };

    const response = await axios.post(url, body, {

      headers: {
        Authorization: `Bearer ${token}`
      }

    });

    return response.data;

  }

}