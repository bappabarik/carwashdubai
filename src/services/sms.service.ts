import twilio from "twilio";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/**
 * Sends an OTP code via SMS using Twilio.
 * Throws AppError (503) if the send fails, so the caller can decide
 * whether to roll back the OTP record it just created.
 */
export async function sendOtpSms(phoneNumber: string, otpCode: string): Promise<void> {
  const body = `Your verification code is ${otpCode}. It expires in ${env.OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;

  try {
    await client.messages.create({
      to: phoneNumber,
      from: env.TWILIO_FROM_NUMBER,
      body,
    });
  } catch (err) {
    throw new AppError(
      "Failed to send OTP SMS. Please try again shortly.",
      503,
      "SMS_SEND_FAILED",
      env.NODE_ENV === "development" ? err : undefined
    );
  }
}
