import sgMail from "@sendgrid/mail";
import sgClient from "@sendgrid/client";
import { logError, logInfo } from "../utils/logger";
import mongoose from "mongoose";
import { formatDate } from "../utils/utils";
import { resetPasswordExpireTime } from "../constants";

export interface SupportEmail {
  message: string;
  name: string;
  vendorName?: string;
  subject: string;
  email: string;
}

export interface InspirationMail {
  coupleName: string;
  review: string;
  videoLink: string;
  rating: number;
  reviewBy: string;
  contactEmail: string;
  images: string[];
}

export enum EmailTemplates {
  WEDDING_INVITATION = "d-33e69ae31df64a1e9da62f754a784b70", // DEPRECATED
  WEDDING_INVITATION_V2 = "d-7408dd3c16b04f5daeaffac2d4d45e17",
  WEDDING_REGARDS = "d-cd546f42bb7d4bdf80704d31bd3a2932",

  VENDOR_APPLICATION_SIGN = "d-6bbd33ae2fc34fd69a1d986673dcf639",
  VENDOR_WELCOME = "d-36306abd80e94f2fabe3bc21c1e523fb",
  VENDOR_ORDER_NOTIFICATION = "d-ca6572e3339340fdab29a0981550498a", // DEPRECATED
  VENDOR_ORDER_NOTIFICATION_V2 = "d-aebaefd4717c4eacba710cbc127b8d84",

  RESET_PASSWORD = "d-066647bd28504aba99039447c3eeef79",

  COUPLE_ORDER_DELETION = "d-25092d143ce4411a93fa0a4af76b20f7",
}

export enum ContactListIDs {
  REGISTERED_VENDORS = "c13f9fcf-6d0c-40a4-9bc1-bd4eeb2cc9aa",
}

export type VendorOrderEmail = {
  vendorId: string | mongoose.Types.ObjectId;
  productName: string;
  orderId: string;
  orderName: string;
};

class SGEmailService {
  private ACCESS_KEY: string = process.env.SENDGRID_ACCESS_KEY!;
  private FROM_EMAIL: string = process.env.FROM_EMAIL!;
  private FROM_NAME: string = process.env.FROM_NAME!;
  private GUEST_SIGNUP_LINK: string = process.env.GUEST_SIGNUP_LINK!;

  constructor() {
    sgMail.setApiKey(this.ACCESS_KEY);
    sgClient.setApiKey(this.ACCESS_KEY);
  }

  private async sendEmail(
    to: string,
    templateId: EmailTemplates,
    variables: any = {},
  ): Promise<void> {
    const msg = {
      to,
      from: {
        email: this.FROM_EMAIL,
        name: this.FROM_NAME,
      },
      templateId,
      dynamicTemplateData: variables,
    };

    await sgMail.send(msg);
  }

  async sendInvitationEmail(
    email: string,
    guestName: string,
    coupleName1: string,
    coupleName2: string,
    weddingUrl: string,
  ) {
    let templateId = EmailTemplates.WEDDING_INVITATION_V2;
    let variables = {
      guestName,
      coupleName1,
      coupleName2,
      invitationLink: `${process.env.CLIENT_LIVE_URL}/guest/accept-invitation/${weddingUrl}?email=${encodeURIComponent(email)}`, // Pass dynamic variables to the template
    };

    try {
      await this.sendEmail(email, templateId, variables);
      logInfo(`Successfully sent Wedding Invitation to ${email}.`);
    } catch (error: any) {
      logError(
        `Error sending wedding invitation email to ${email}!`,
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  async sendVendorWelcomeEmail(email: string, vendorName: string) {
    let templateId = EmailTemplates.VENDOR_WELCOME;
    let agreementLink = `${process.env.SERVER_LIVE_URL}/public/vendor-agreements/vendor/${email}.docx`;

    let variables = {
      vendorName,
      agreementLink,
    };

    try {
      // Adding the vendor to SendGrid contacts
      const listId = ContactListIDs.REGISTERED_VENDORS; // Replace with the actual list ID

      await Promise.allSettled([
        this.sendEmail(email, templateId, variables),
        this.addClientToContactList(listId, email, vendorName),
      ]);
      logInfo(`Successfully sent welcome email to vendor ${email}.`);
    } catch (error: any) {
      logError(
        `Error sending welcome email to vendor ${email}!`,
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  async sendVendorApplicationSignEmail(
    email: string,
    vendorName: string,
    secret: string,
  ) {
    let templateId = EmailTemplates.VENDOR_APPLICATION_SIGN;
    let variables = {
      vendorName,
      signLink: `${process.env.EJUNO_SHOPIFY_LIVE_URL}/pages/vendor-onboarding?key=${secret}`, // Pass dynamic variables to the template
    };

    try {
      await this.sendEmail(email, templateId, variables);
      logInfo(`Successfully sent vendor form sign to ${email}.`);
    } catch (error: any) {
      logError(
        `Error sending vendor form sign email to ${email}!`,
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  async sendVendorOrderEmail(
    email: string,
    vendorName: string,
    productName: string,
    orderId: string,
    orderName: string,
    dates?: Date[],
  ) {
    let templateId = EmailTemplates.VENDOR_ORDER_NOTIFICATION_V2;

    let formatedDates = dates?.length
      ? dates.map((date) => formatDate(date))
      : undefined;

    let variables = {
      vendorName,
      productName,
      orderId,
      orderName,
      dates: formatedDates,
    };

    try {
      await this.sendEmail(email, templateId, variables);
      logInfo(`Successfully sent order email to vendor ${email}.`);
    } catch (error: any) {
      logError(
        `Error sending order email to vendor ${email}!`,
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  async sendAskWeddingRegardsEmail(
    coupleName1: string,
    coupleName2: string,
    guestEmail: string,
    guestName: string,
    weddingUrl: string,
  ) {
    let templateId = EmailTemplates.WEDDING_REGARDS;
    let variables = {
      guestName,
      coupleName1,
      coupleName2,
      regardsLink: `${process.env.CLIENT_LIVE_URL}/guest/wedding-regards/${weddingUrl}?email=${encodeURIComponent(guestEmail)}`, // Pass dynamic variables to the template
    };

    try {
      await this.sendEmail(guestEmail, templateId, variables);
      logInfo(`Successfully sent Wedding Invitation to ${guestEmail}.`);
    } catch (error: any) {
      logError(
        `Error sending wedding invitation email to ${guestEmail}!`,
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  async sendResetPasswordEmail(
    email: string,
    userName: string,
    resetPasswordUrl: string,
  ) {
    let templateId = EmailTemplates.RESET_PASSWORD;
    let variables = {
      userName,
      resetPasswordUrl,
      expireTime: `${resetPasswordExpireTime} mins`,
    };

    try {
      await this.sendEmail(email, templateId, variables);
      logInfo(`Successfully sent Wedding Invitation to ${email}.`);
    } catch (error: any) {
      logError(
        `Error sending wedding invitation email to ${email}!`,
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  async sendCoupleProductDeletionEmail(
    email: string,
    coupleName: string,
    productName: string,
    startDateTime: string,
    endDateTime: string,
  ) {
    let templateId = EmailTemplates.COUPLE_ORDER_DELETION;

    let variables = {
      coupleName,
      productName,
      startDateTime,
      endDateTime,
    };

    try {
      await this.sendEmail(email, templateId, variables);
      logInfo(`Successfully sent order deletion email to couple ${email}.`);
    } catch (error: any) {
      logError(
        `Error sending order deletion email to couple ${email}!`,
        error.response?.body || error.message,
      );
      throw error;
    }
  }

  async addClientToContactList(
    listId: string,
    email: string,
    vendorName: string,
  ) {
    const contactData = {
      list_ids: [listId],
      contacts: [
        {
          email,
          first_name: vendorName.split(" ")[0],
          last_name: vendorName.split(" ")[1] || "",
        },
      ],
    };

    try {
      await sgClient.request({
        method: "PUT",
        url: "/v3/marketing/contacts",
        body: contactData,
      });
      logInfo(`Successfully added ${email} to Registered Vendors list.`);
    } catch (error: any) {
      logError(
        `Error adding ${email} to Registered Vendors list:`,
        error.message,
      );
    }
  }
}

const sgEmailService = new SGEmailService();
export default sgEmailService;
