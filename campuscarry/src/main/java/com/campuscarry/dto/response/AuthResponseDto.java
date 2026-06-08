package com.campuscarry.dto.response;

import com.campuscarry.entity.enums.Role;
import lombok.*;

@Data
@Builder
public class AuthResponseDto {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;

    // Basic user info embedded so frontend doesn't need a separate /me call after login
    private String userId;
    private String fullName;
    private String email;
    private Role role;

}
