import axios from "axios";
import { logError, logInfo } from "../utils/logger";

const headers = {
  "Content-Type": "application/json",
  "api-key": `${process.env.SEND_IN_BLUE_API_KEY}`,
};

export const EMAIL_TEMPLATE: any = {
  DUMMY: 149,
};

export interface MailData {
  to: Array<{ email: string }>;
  templateId?: number;
  sender?: { email: string };
  subject?: string;
  textContent?: string;
  params?: any;
}

const sendEmail = async (data: MailData) => {
  const options = {
    url: "https://api.sendinblue.com/v3/smtp/email",
    headers: headers,
    json: data,
  };

  logInfo("EMAIL TO: ", data.to);

  try {
    const response = await axios.post(options.url, options.json, {
      headers: options.headers,
    });
    logInfo("Email sent successfully:", response.data);
  } catch (error: any) {
    logError("Error sending email:", error.response?.data);
  }
};

const sampleEmail = async (
  memberEmail: string,
  newEmail: string,
  description: string,
) => {
  const data: any = {
    sender: { email: memberEmail },
    to: [{ email: String(process.env.LUCY_EMAIL) }],
    subject: "Email Change Request",
    textContent: `
      Current Email: ${memberEmail}
      New Email: ${newEmail}
      Reason to change the email: ${description}
    `,
    templateId: EMAIL_TEMPLATE.DUMMY,
    params: {
      galaxyName: "",
      teamName: "",
      invitedBy: "Skylinx",
      magicLink: "",
    },
  };

  await sendEmail(data);
};

export { sampleEmail, sendEmail };
