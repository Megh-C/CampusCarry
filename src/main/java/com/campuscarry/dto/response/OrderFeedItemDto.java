package com.campuscarry.dto.response;

import com.campuscarry.entity.enums.OrderSize;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

// Lightweight version of an order shown in the public feed.
// Intentionally minimal - no phone numbers, no OTP, no payment details.
// Full details are loaded only when a deliverer taps on a specific order.
@Getter
@Setter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrderFeedItemDto {

    private UUID id;
    private Integer orderNumber;
    private OrderSize size;
    private String description;
    private String pickupLocationName;
    private String dropHostelBlock;
    private BigDecimal deliveryFee;

    // Requester's name shown so deliverer knows who they're delivering for
    private String requesterName;

    // Countdown reference - frontend shows "expires in X mins" using this
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}