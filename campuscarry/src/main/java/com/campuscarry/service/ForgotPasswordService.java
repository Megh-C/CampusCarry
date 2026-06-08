package com.campuscarry.service;

import com.campuscarry.config.RateLimitConfig;
import com.campuscarry.dto.request.ForgotPasswordRequestDto;
import com.campuscarry.dto.request.ResetPasswordRequestDto;
import com.campuscarry.dto.response.MessageResponseDto;
import com.campuscarry.entity.EmailOtp;
import com.campuscarry.entity.User;
import com.campuscarry.exception.BadRequestException;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.repository.EmailOtpRepository;
import com.campuscarry.repository.UserRepository;
import io.github.bucket4j.Bucket;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ForgotPasswordService {

    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final RateLimitConfig rateLimitConfig;

    // ── Step 1: Send OTP ─────────────────────────────────────────────

    /**
     * Called by: POST /auth/forgot-password
     * Sends a password reset OTP to the student's registered email.
     *
     * Security note: always returns the same success message whether or not
     * the email exists — prevents email enumeration attacks.
     * (attacker cannot tell if an email is registered by trying this endpoint)
     */
    @Transactional
    public MessageResponseDto sendResetOtp(ForgotPasswordRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        // OTP cooldown — prevent spam, max 1 OTP request per email per 2 minutes
        Bucket otpBucket = rateLimitConfig.resolveOtpBucket(email);
        if (!otpBucket.tryConsume(1)) {
            throw new BadRequestException(
                    "Please wait 2 minutes before requesting another OTP.");
        }

        // Silently do nothing if email not found — same message either way
        userRepository.findByEmail(email).ifPresent(user -> {
            String rawOtp = generateOtp();
            String hashedOtp = passwordEncoder.encode(rawOtp);

            EmailOtp otpEntity = EmailOtp.builder()
                    .email(email)
                    .otp(hashedOtp)
                    .expiresAt(LocalDateTime.now().plusMinutes(10))
                    .isUsed(false)
                    .build();

            emailOtpRepository.save(otpEntity);
            emailService.sendPasswordResetOtpEmail(email, user.getFullName(), rawOtp);
        });

        // Same message regardless — prevents email enumeration
        return new MessageResponseDto(
                "If this email is registered, a password reset OTP has been sent.");
    }

    // ── Step 2: Reset Password ───────────────────────────────────────

    /**
     * Called by: POST /auth/reset-password
     * Validates OTP then resets the password.
     * Uses the same EmailOtp table as signup — reuses existing OTP infrastructure.
     * After reset → redirect to login (frontend handles redirect).
     */
    @Transactional
    public MessageResponseDto resetPassword(ResetPasswordRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        EmailOtp otpEntity = emailOtpRepository
                .findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BadRequestException(
                        "No OTP found for this email. Please request a new one."));

        if (!otpEntity.isValid()) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        if (!passwordEncoder.matches(request.getOtp(), otpEntity.getOtp())) {
            throw new BadRequestException("Invalid OTP. Please try again.");
        }

        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new BadRequestException("Passwords do not match.");
        }

        // Prevent reusing the same password
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException(
                    "New password cannot be the same as your current password.");
        }

        // Mark OTP used so it cannot be reused
        otpEntity.setUsed(true);
        emailOtpRepository.save(otpEntity);

        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return new MessageResponseDto(
                "Password reset successfully. Please login with your new password.");
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        return String.valueOf(100000 + random.nextInt(900000));
    }
}