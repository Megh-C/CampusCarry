package com.campuscarry.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeliverOrderRequestDto {

    // OTP that was emailed to the requester when order was accepted.
    // Requester reads this out to the deliverer at handoff.
    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be a 6-digit number")
    private String otp;
}