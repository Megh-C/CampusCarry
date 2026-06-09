package com.campuscarry.dto.response;

import com.campuscarry.entity.enums.Gender;
import com.campuscarry.entity.enums.Role;
import com.campuscarry.entity.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

// Returned to the logged-in student for their own profile view
// Does not include password, active counts or internal fields
@Getter
@Setter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileResponseDto {

    private UUID id;
    private String fullName;
    private String email;
    private String phone;
    private Gender gender;
    private Integer year;
    private String hostelBlock;
    private String upiId;
    private Role role;
    private UserStatus status;
    private Double rating;
    private Integer totalDeliveries;
    private boolean isOnDelivery;
    private Integer activeSmall;
    private Integer activeMedium;
    private Integer activeLarge;
    private LocalDateTime createdAt;
}