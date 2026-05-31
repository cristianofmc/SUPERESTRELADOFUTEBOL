import nodemailer, { type SendMailOptions } from "nodemailer";
import { ServiceError } from "./errors";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: Number(process.env.EMAIL_SMTP_PORT) || 587,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASSWORD,
  },
  secure: process.env.NODE_ENV === "production",
});

async function send(emailOptions: SendMailOptions) {
  try {
    await transporter.sendMail(emailOptions);
  } catch (error) {
    const errorCause =
      error instanceof Error ? error : new Error(String(error));

    throw new ServiceError({
      message: "Unable to send email",
      action: "Please verify if the email service is available",
      cause: errorCause,
      context: emailOptions,
    });
  }
}

const email = {
  send,
};

export default email;
