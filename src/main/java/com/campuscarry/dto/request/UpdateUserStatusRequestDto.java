package com.campuscarry.dto.request;

import com.campuscarry.entity.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserStatusRequestDto {

    @NotNull(message = "Status is required")
    private UserStatus status;

    // Optional reason for suspension/ban — stored for accountability
    private String reason;
}