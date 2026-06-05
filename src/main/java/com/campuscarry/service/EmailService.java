package com.campuscarry.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ── OTP Email ────────────────────────────────────────────────────

    @Async
    public void sendOtpEmail(String toEmail, String rawOtp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "CampusCarry");
            helper.setTo(toEmail);
            helper.setSubject("Your CampusCarry Verification Code");
            helper.setText(buildSignupOtpEmailBody(rawOtp), true);

            mailSender.send(message);
        } catch (Exception e) {
            // Log and swallow — don't let email failure break the signup flow
            // Will be replaced with proper logging when we add a logger
            System.err.println("Failed to send OTP email to " + toEmail + ": " + e.getMessage());
        }
    }


    // ── Order OTP Email ──────────────────────────────────────────────
    // Sent to the REQUESTER when a deliverer accepts their order.
    // The requester must share this OTP with the deliverer at handoff
    // so the deliverer can confirm the delivery was completed.

    @Async
    public void sendOrderOtpEmail(String toEmail, String requesterName,
                                  String rawOtp, Integer orderNumber,
                                  String delivererName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "CampusCarry");
            helper.setTo(toEmail);
            helper.setSubject("Order #" + orderNumber + " has been accepted — Your delivery OTP");
            helper.setText(buildOrderOtpBody(requesterName, rawOtp, orderNumber, delivererName), true);

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send order OTP to "
                    + toEmail + ": " + e.getMessage());
        }
    }

    // ── Arrival Notification Email ───────────────────────────────────
    // Sent to the REQUESTER when the deliverer presses "I'm here".
    // Lets the requester know to come down and includes deliverer's phone number.

    @Async
    public void sendArrivalNotificationEmail(String toEmail, String requesterName,
                                             String delivererName, String delivererPhone,
                                             Integer orderNumber) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "CampusCarry");
            helper.setTo(toEmail);
            helper.setSubject("Order #" + orderNumber + " — Your deliverer has arrived!");
            helper.setText(buildArrivalNotificationBody(
                    requesterName, delivererName, delivererPhone, orderNumber), true);

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send arrival notification to "
                    + toEmail + ": " + e.getMessage());
        }
    }
    // ── Email Templates ──────────────────────────────────────────────

    private String buildSignupOtpEmailBody(String otp) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #2d2d2d;">Verify your email</h2>
                    <p style="color: #555; font-size: 15px;">
                        Use the code below to verify your CampusCarry account.
                        This code is valid for <strong>10 minutes</strong>.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">
                            %s
                        </span>
                    </div>
                    <p style="color: #999; font-size: 13px;">
                        If you did not request this, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                    <p style="color: #bbb; font-size: 12px; text-align: center;">CampusCarry — by students, for students</p>
                </div>
                """.formatted(otp);
    }

    private String buildOrderOtpBody(String requesterName, String otp,
                                     Integer orderNumber, String delivererName) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                            padding: 32px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #2d2d2d;">Your order has been accepted!</h2>
                    <p style="color: #555; font-size: 15px;">
                        Hi <strong>%s</strong>, great news!
                        <strong>%s</strong> has accepted your Order <strong>#%d</strong>
                        and is heading to pick it up.
                    </p>
                    <p style="color: #555; font-size: 15px;">
                        When your deliverer arrives, share this OTP with them to confirm delivery:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <span style="font-size: 36px; font-weight: bold;
                                     letter-spacing: 8px; color: #1a1a1a;">%s</span>
                    </div>
                    <p style="color: #e57373; font-size: 13px;">
                        ⚠️ Do not share this OTP with anyone other than your deliverer at handoff.
                        This OTP is valid for <strong>5 hours</strong>.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                    <p style="color: #bbb; font-size: 12px; text-align: center;">
                        CampusCarry — by students, for students
                    </p>
                </div>
                """.formatted(requesterName, delivererName, orderNumber, otp);
    }

    private String buildArrivalNotificationBody(String requesterName, String delivererName,
                                                String delivererPhone, Integer orderNumber) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                            padding: 32px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #2d2d2d;">Your deliverer is here! 🎉</h2>
                    <p style="color: #555; font-size: 15px;">
                        Hi <strong>%s</strong>,
                        <strong>%s</strong> has arrived with your Order <strong>#%d</strong>.
                        Please come down to collect it.
                    </p>
                    <div style="background: #f5f5f5; border-radius: 6px;
                                padding: 16px; margin: 24px 0; text-align: center;">
                        <p style="color: #555; font-size: 13px; margin: 0 0 6px 0;">
                            Deliverer's phone number
                        </p>
                        <span style="font-size: 22px; font-weight: bold; color: #1a1a1a;">
                            %s
                        </span>
                    </div>
                    <p style="color: #555; font-size: 13px;">
                        Remember to share your OTP with the deliverer to complete the handoff.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
                    <p style="color: #bbb; font-size: 12px; text-align: center;">
                        CampusCarry — by students, for students
                    </p>
                </div>
                """.formatted(requesterName, delivererName, orderNumber, delivererPhone);
    }
}