package com.campuscarry.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;


//only email is required when we first initiate an account so only one email field is there here
@Data
public class InitiateSignupRequestDto {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Pattern(
            regexp = "^[a-zA-Z0-9._%+-]+@gmail\\.com$",
            message = "Only Gmail addresses are allowed"
    )
    private String email;
}
