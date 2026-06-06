package com.campuscarry.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RatingResponseDto {

    private UUID id;
    private UUID orderId;
    private Integer orderNumber;

    // Who gave the rating
    private UUID raterId;
    private String raterName;

    // Who received the rating
    private UUID rateeId;
    private String rateeName;

    // Rating content
    private Integer stars;
    private String description;

    // Deliverer's updated average rating after this submission
    // Shown to requester so they know their rating had an effect
    private Double delivererNewAverageRating;

    private LocalDateTime createdAt;
}