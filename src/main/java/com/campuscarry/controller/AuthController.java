package com.campuscarry.controller;

import com.campuscarry.auth.AuthService;
import com.campuscarry.dto.request.*;
import com.campuscarry.dto.response.AuthResponseDto;
import com.campuscarry.dto.response.MessageResponseDto;
import com.campuscarry.dto.response.ApiResponseDto;
import com.campuscarry.service.ForgotPasswordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final ForgotPasswordService forgotPasswordService;

    // POST /api/v1/auth/signup/initiate
    @PostMapping("/signup/initiate")
    public ResponseEntity<ApiResponseDto<MessageResponseDto>> initiateSignup(
            @Valid @RequestBody InitiateSignupRequestDto request) {

        MessageResponseDto response = authService.initiateSignup(request);
        return ResponseEntity.ok(ApiResponseDto.success("OTP sent successfully", response));
    }

    // POST /api/v1/auth/signup/verify-otp
    @PostMapping("/signup/verify-otp")
    public ResponseEntity<ApiResponseDto<MessageResponseDto>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequestDto request) {

        MessageResponseDto response = authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponseDto.success("OTP verified", response));
    }

    // POST /api/v1/auth/signup/complete
    @PostMapping("/signup/complete")
    public ResponseEntity<ApiResponseDto<MessageResponseDto>> completeSignup(
            @Valid @RequestBody CompleteSignupRequestDto request) {

        MessageResponseDto response = authService.completeSignup(request);
        return ResponseEntity.ok(ApiResponseDto.success("Signup complete", response));
    }

    // POST /api/v1/auth/login
    @PostMapping("/login")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> login(
            @Valid @RequestBody LoginRequestDto request) {

        AuthResponseDto response = authService.login(request);
        return ResponseEntity.ok(ApiResponseDto.success("Login successful", response));
    }

    // POST /api/v1/auth/forgot-password
// Step 1 — sends OTP to registered email. Public endpoint, no JWT needed.
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponseDto<MessageResponseDto>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDto request) {

        MessageResponseDto response = forgotPasswordService.sendResetOtp(request);
        return ResponseEntity.ok(ApiResponseDto.success("Request processed.", response));
    }

    // POST /api/v1/auth/reset-password
// Step 2 — validates OTP and resets password. Public endpoint, no JWT needed.
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponseDto<MessageResponseDto>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDto request) {

        MessageResponseDto response = forgotPasswordService.resetPassword(request);
        return ResponseEntity.ok(ApiResponseDto.success("Password reset successful.", response));
    }
}