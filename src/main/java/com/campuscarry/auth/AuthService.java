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
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import static com.campuscarry.entity.enums.UserStatus.*;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EmailOtpRepository emailOtpRepository;
    private final EmailService emailService;
    private final com.campuscarry.service.JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    // ── Step 1: Initiate Signup ──────────────────────────────────────

    @Transactional
    public MessageResponseDto initiateSignup(InitiateSignupRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        // If already ACTIVE, they have an account — direct to login
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getStatus() == UserStatus.ACTIVE) {
                throw new ConflictException("An account with this email already exists. Please login.");
            }
        });

        // Generate 6-digit OTP
        String rawOtp = generateOtp();
        String hashedOtp = passwordEncoder.encode(rawOtp);

        // Save OTP entry — invalidate previous unused OTPs implicitly
        // (we always fetch the latest one, old ones become unreachable)
        EmailOtp otpEntity = EmailOtp.builder()
                .email(email)
                .otp(hashedOtp)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .isUsed(false)
                .build();

        emailOtpRepository.save(otpEntity);

        // Create a PENDING user shell if not already exists
        if (!userRepository.existsByEmail(email)) {
            User pendingUser = User.builder()
                    .email(email)
                    .status(UserStatus.PENDING)
                    .role(Role.STUDENT)
                    .build();
            userRepository.save(pendingUser);
        }

        // Send OTP email
        emailService.sendOtpEmail(email, rawOtp);

        return new MessageResponseDto("OTP sent to " + email + ". Valid for 10 minutes.");
    }

    // ── Step 2: Verify OTP ───────────────────────────────────────────

    @Transactional
    public MessageResponseDto verifyOtp(VerifyOtpRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        EmailOtp otpEntity = emailOtpRepository
                .findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BadRequestException("No OTP found for this email. Please request a new one."));

        if (!otpEntity.isValid()) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        if (!passwordEncoder.matches(request.getOtp(), otpEntity.getOtp())) {
            throw new BadRequestException("Invalid OTP. Please try again.");
        }

        // Mark OTP as used
        otpEntity.setUsed(true);
        emailOtpRepository.save(otpEntity);

        // Flip user status to OTP_VERIFIED
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        user.setStatus(OTP_VERIFIED);
        userRepository.save(user);

        return new MessageResponseDto("OTP verified successfully. Please complete your profile.");
    }

    // ── Step 3: Complete Signup ──────────────────────────────────────

    @Transactional
    public MessageResponseDto completeSignup(CompleteSignupRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        // Only allow profile completion after OTP verification
        if (user.getStatus() != OTP_VERIFIED) {
            throw new BadRequestException("Email not verified. Please verify your OTP first.");
        }

        // Passwords must match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match.");
        }

        // Phone uniqueness check
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new ConflictException("This phone number is already registered.");
        }

        // Complete the user profile
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setGender(request.getGender());
        user.setYear(request.getYear());
        user.setHostelBlock(request.getHostelBlock().toUpperCase());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.ACTIVE);

        userRepository.save(user);

        return new MessageResponseDto("Account created successfully. Please login.");
    }

    // ── Login ────────────────────────────────────────────────────────

    public AuthResponseDto login(LoginRequestDto request) {
        String email = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

        // Check account status before even verifying password
        switch (user.getStatus()) {
            case PENDING -> throw new UnauthorizedException("Please verify your email OTP first.");
            case OTP_VERIFIED -> throw new UnauthorizedException("Please complete your profile setup first.");
            case SUSPENDED -> throw new UnauthorizedException("Your account has been suspended. Contact support.");
            case BANNED -> throw new UnauthorizedException("Your account has been permanently banned.");
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

    // ── Private Helpers ────────────────────3──────────────────────────

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}