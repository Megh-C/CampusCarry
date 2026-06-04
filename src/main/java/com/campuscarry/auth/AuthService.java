package com.campuscarry.auth;

import com.campuscarry.dto.request.CompleteSignupRequestDto;
import com.campuscarry.dto.request.InitiateSignupRequestDto;
import com.campuscarry.dto.request.LoginRequestDto;
import com.campuscarry.dto.request.VerifyOtpRequestDto;
import com.campuscarry.dto.response.AuthResponseDto;
import com.campuscarry.dto.response.MessageResponseDto;
import com.campuscarry.entity.EmailOtp;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.Role;
import com.campuscarry.entity.enums.UserStatus;
import com.campuscarry.exception.BadRequestException;
import com.campuscarry.exception.ConflictException;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.exception.UnauthorizedException;
import com.campuscarry.repository.EmailOtpRepository;
import com.campuscarry.repository.UserRepository;
import com.campuscarry.service.JwtService;
import com.campuscarry.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    // ── Step 1: Initiate Signup ──────────────────────────────────────
    // Only generates and sends OTP. No user is created here.

    @Transactional
    public MessageResponseDto initiateSignup(InitiateSignupRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        // Block if a fully active account already exists for this email
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists. Please login.");
        }

        // Generate 6-digit OTP and save hashed
        String rawOtp = generateOtp();
        String hashedOtp = passwordEncoder.encode(rawOtp);

        EmailOtp otpEntity = EmailOtp.builder()
                .email(email)
                .otp(hashedOtp)
                .expiresAt(LocalDateTime.now().plusMinutes(1))
                .isUsed(false)
                .build();

        emailOtpRepository.save(otpEntity);

        // Send OTP to email — async, won't block response
        emailService.sendOtpEmail(email, rawOtp);

        return new MessageResponseDto("OTP sent to " + email + ". Valid for 10 minutes.");
    }

    // ── Step 2: Verify OTP ───────────────────────────────────────────
    // Only validates OTP and marks it used. No user is created here.

    @Transactional
    public MessageResponseDto verifyOtp(VerifyOtpRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

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

        // Mark OTP as used so it cannot be reused
        otpEntity.setUsed(true);
        emailOtpRepository.save(otpEntity);

        return new MessageResponseDto("Email verified successfully. Please complete your profile.");
    }

    // ── Step 3: Complete Signup ──────────────────────────────────────
    // User is created HERE for the first time, directly as ACTIVE.
    // Validates that OTP was actually verified before allowing this step.

    @Transactional
    public MessageResponseDto completeSignup(CompleteSignupRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        // Guard: user should not already exist at this point
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists. Please login.");
        }

        // Guard: OTP must have been verified for this email before profile can be completed
        // We check that a used OTP exists — proof that step 2 was completed
        boolean otpWasVerified = emailOtpRepository
                .existsByEmailAndIsUsedTrue(email);

        if (!otpWasVerified) {
            throw new BadRequestException("Email OTP not verified. Please complete verification first.");
        }

        // Passwords must match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match.");
        }

        // Phone uniqueness check
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new ConflictException("This phone number is already registered.");
        }

        // Create the user for the first time — directly ACTIVE
        User user = User.builder()
                .email(email)
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .gender(request.getGender())
                .year(request.getYear())
                .hostelBlock(request.getHostelBlock().toUpperCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.STUDENT)
                .status(UserStatus.ACTIVE)
                .totalDeliveries(0)
                .activeSmall(0)
                .activeMedium(0)
                .activeLarge(0)
                .isOnDelivery(false)
                .build();

        userRepository.save(user);

        return new MessageResponseDto("Account created successfully. Please login.");
    }

    // ── Login ────────────────────────────────────────────────────────

    public AuthResponseDto login(LoginRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

        // Check account status before verifying password
        switch (user.getStatus()) {
            case SUSPENDED -> throw new UnauthorizedException(
                    "Your account has been suspended. Please contact support.");
            case BANNED -> throw new UnauthorizedException(
                    "Your account has been permanently banned.");
            default -> { /* ACTIVE — continue */ }
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .userId(user.getId().toString())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    // ── Private Helpers ──────────────────────────────────────────────

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}