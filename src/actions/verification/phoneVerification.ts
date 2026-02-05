// actions/phoneVerification.ts
"use server";

import { db } from "@/db";
import { UsersTable } from "@/db/schema";
import { sendSms } from "@/lib/notification/send-sms";
import { generateOTP, getOTPExpiryTime } from "@/lib/otp-generator";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findUserById } from "../user";
import {
  deletePhoneVerificationOTP,
  findPhoneVerificationOTPByEmail
} from "./phone-verification-otp";

// Send OTP to the user's phone number
export async function sendPhoneVerificationOTP(userId: string) {

  console.log("sendPhoneVerificationOTP")
  try {
    // Generate a new OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiryTime();

    const user = await findUserById(userId);

    console.log("otp, expire, user", otp, expiresAt, user)

    if (user) {
      const phone = user.phone!;

      // Check if there's an existing OTP for this phone
      const existingOTP = await findPhoneVerificationOTPByEmail(phone);
      if (existingOTP) {
        await deletePhoneVerificationOTP(existingOTP.id);
      }

      // Create a new OTP entry
      // const creationOTP = await createPhoneVerificationOTP({
      //   phone,
      //   otp,
      //   expiresAt,
      // });

      // Send OTP message
      // This would typically call your SMS service
      const message = `Your verification code is: ${otp}. Valid for 10 minutes.`;

      const result = await sendSms({ phone , message});

      console.log("result", result)

      if (!result.success) {
        throw new Error(result.error || "Failed to send OTP");
      }

      return { success: true };
    }
  } catch (error) {
    console.error("Error sending phone verification OTP:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send verification code",
    };
  }
}

// Verify the OTP entered by the user
export async function verifyPhoneOTP(
  userId: string,
  phone: string,
  otp: string
) {
  try {
    // Find the OTP record
    const otpRecord = await findPhoneVerificationOTPByEmail(phone);

    // Check if OTP exists
    if (!otpRecord) {
      return { success: false, error: "Verification code not found" };
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await deletePhoneVerificationOTP(otpRecord.id);
      return { success: false, error: "Verification code has expired" };
    }

    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      return { success: false, error: "Invalid verification code" };
    }

    // OTP is valid, update user's phoneVerified status
    await db
      .update(UsersTable)
      .set({
        phoneVerified: new Date(),
        phone: phone, // Ensure the phone number is saved
      })
      .where(eq(UsersTable.id, userId));

    // Delete the OTP record
    await deletePhoneVerificationOTP(otpRecord.id);

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error verifying phone OTP:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify code",
    };
  }
}
