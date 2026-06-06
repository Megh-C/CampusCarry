package com.campuscarry.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

// All fields optional — only provided fields are updated (partial update)
// Email cannot be changed — not included here
@Getter
@Setter
public class UpdateProfileRequestDto {

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Enter a valid 10-digit Indian mobile number")
    private String phone;

    @Min(value = 1, message = "Year must be between 1 and 5")
    @Max(value = 5, message = "Year must be between 1 and 5")
    private Integer year;

    // Format: A_MH or A_LH
    @Pattern(
            regexp = "^[A-Za-z]{1,2}_(MH|LH)$",
            message = "Hostel block must be in format A_MH or A_LH"
    )
    private String hostelBlock;

    // UPI ID for receiving delivery payouts
    @Size(max = 50, message = "UPI ID cannot exceed 50 characters")
    private String upiId;
}