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
            helper.setText(buildOtpEmailBody(rawOtp), true);

            mailSender.send(message);
        } catch (Exception e) {
            // Log and swallow — don't let email failure break the signup flow
            // Will be replaced with proper logging when we add a logger
            System.err.println("Failed to send OTP email to " + toEmail + ": " + e.getMessage());
        }
    }

    // ── Email Templates ──────────────────────────────────────────────

    private String buildOtpEmailBody(String otp) {
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
}