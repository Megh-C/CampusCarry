package com.campuscarry.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubmitRatingRequestDto {

    // 1 to 5 stars — required
    @NotNull(message = "Star rating is required")
    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    private Integer stars;

    // Optional written feedback
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;
}