package com.campuscarry.service;

import com.campuscarry.dto.request.ChangePasswordRequestDto;
import com.campuscarry.dto.request.UpdateProfileRequestDto;
import com.campuscarry.dto.response.MessageResponseDto;
import com.campuscarry.dto.response.UserProfileResponseDto;
import com.campuscarry.entity.User;
import com.campuscarry.exception.BadRequestException;
import com.campuscarry.exception.ConflictException;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Get Profile ──────────────────────────────────────────────────

    /**
     * Called by: GET /me
     * Returns the logged-in student's own profile.
     */
    public UserProfileResponseDto getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        return mapToDto(user);
    }

    // ── Update Profile ───────────────────────────────────────────────

    /**
     * Called by: PATCH /me
     * Partial update — only updates fields that are provided in the request.
     * Email cannot be changed.
     * Profile changes only affect future orders — existing orders are not touched.
     */
    @Transactional
    public UserProfileResponseDto updateProfile(UUID userId, UpdateProfileRequestDto request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        // Only update fields that were actually sent in the request
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            // Phone must be unique across all users
            if (!request.getPhone().equals(user.getPhone()) &&
                    userRepository.existsByPhone(request.getPhone())) {
                throw new ConflictException("This phone number is already registered.");
            }
            user.setPhone(request.getPhone());
        }

        if (request.getYear() != null) {
            user.setYear(request.getYear());
        }

        if (request.getHostelBlock() != null && !request.getHostelBlock().isBlank()) {
            user.setHostelBlock(request.getHostelBlock().toUpperCase().trim());
        }

        if (request.getUpiId() != null) {
            // Allow empty string to clear UPI ID
            user.setUpiId(request.getUpiId().isBlank() ? null : request.getUpiId().trim());
        }

        userRepository.save(user);
        return mapToDto(user);
    }

    // ── Change Password (logged in) ──────────────────────────────────

    /**
     * Called by: PATCH /me/password
     * Requires current password to confirm identity.
     * Student must be logged in — uses JWT to identify who is changing.
     */
    @Transactional
    public MessageResponseDto changePassword(UUID userId, ChangePasswordRequestDto request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        // Verify current password before allowing change
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect.");
        }

        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new BadRequestException("New passwords do not match.");
        }

        // Prevent setting the same password again
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password cannot be the same as current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return new MessageResponseDto("Password changed successfully.");
    }

    // ── Mapper ───────────────────────────────────────────────────────

    private UserProfileResponseDto mapToDto(User user) {
        return UserProfileResponseDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .gender(user.getGender())
                .year(user.getYear())
                .hostelBlock(user.getHostelBlock())
                .upiId(user.getUpiId())
                .role(user.getRole())
                .status(user.getStatus())
                .rating(user.getRating())
                .totalDeliveries(user.getTotalDeliveries())
                .isOnDelivery(user.isOnDelivery())
                .createdAt(user.getCreatedAt())
                .build();
    }
}