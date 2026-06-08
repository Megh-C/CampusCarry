package com.campuscarry.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddLocationRequestDto {

    @NotBlank(message = "Location name is required")
    @Size(max = 100, message = "Name cannot exceed 100 characters")
    private String name;

    // Internal code — must be unique, uppercase, no spaces e.g. "MAIN_GATE"
    @NotBlank(message = "Location code is required")
    @Size(max = 50, message = "Code cannot exceed 50 characters")
    private String code;
}