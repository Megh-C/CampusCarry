package com.campuscarry.controller;

import com.campuscarry.dto.request.ChangePasswordRequestDto;
import com.campuscarry.dto.request.UpdateProfileRequestDto;
import com.campuscarry.dto.response.ApiResponseDto;
import com.campuscarry.dto.response.MessageResponseDto;
import com.campuscarry.dto.response.UserProfileResponseDto;
import com.campuscarry.entity.User;
import com.campuscarry.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // GET /api/v1/me
    // Returns the logged-in student's own profile
    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<UserProfileResponseDto>> getProfile(
            @AuthenticationPrincipal User currentUser) {

        UserProfileResponseDto response = userService.getProfile(currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Profile loaded", response));
    }

    // PATCH /api/v1/me
    // Partial update — only provided fields are updated
    // Cannot change email. Changes only affect future orders.
    @PatchMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<UserProfileResponseDto>> updateProfile(
            @Valid @RequestBody UpdateProfileRequestDto request,
            @AuthenticationPrincipal User currentUser) {

        UserProfileResponseDto response = userService.updateProfile(
                currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponseDto.success("Profile updated successfully.", response));
    }

    // PATCH /api/v1/me/password
    // Change password while logged in — requires current password for verification
    @PatchMapping("/password")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<MessageResponseDto>> changePassword(
            @Valid @RequestBody ChangePasswordRequestDto request,
            @AuthenticationPrincipal User currentUser) {

        MessageResponseDto response = userService.changePassword(
                currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponseDto.success("Password changed.", response));
    }
}