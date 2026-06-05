package com.campuscarry.dto.request;

import com.campuscarry.entity.enums.Gender;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;


@Data
public class CompleteSignupRequestDto {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Enter a valid 10-digit Indian mobile number")
    private String phone;

    @NotNull(message = "Gender is required")
    private Gender gender;

    @NotNull(message = "Year is required")
    @Min(value = 1, message = "Year must be between 1 and 5")
    @Max(value = 5, message = "Year must be between 1 and 5")
    private Integer year;

    @NotBlank(message = "Hostel block is required")
    @Pattern(
            regexp = "^[A-Za-z]{1,2}_(MH|LH)$",
            message = "Hostel block must be in format X_MH or X_LH"
    )
    private String hostelBlock;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
            message = "Password must contain at least one uppercase, one lowercase, one digit and one special character"
    )
    private String password;

    @NotBlank(message = "Please confirm your password")
    private String confirmPassword;

}
