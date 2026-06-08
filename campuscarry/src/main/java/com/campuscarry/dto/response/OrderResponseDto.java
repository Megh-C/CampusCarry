package com.campuscarry.dto.response;

import com.campuscarry.entity.enums.OrderSize;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.entity.enums.PaymentStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
// Fields that are null will not appear in JSON response
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrderResponseDto {

    private UUID id;
    private Integer orderNumber;
    private OrderSize size;
    private OrderStatus status;
    private String description;
    private String dropHostelBlock;
    private BigDecimal deliveryFee;

    // Pickup location details
    private UUID pickupLocationId;
    private String pickupLocationName;  // joined from Location table

    // Requester info - always visible
    private UUID requesterId;
    private String requesterName;

    // Deliverer info - only visible after order is ACCEPTED
    // Null on feed view (PENDING orders)
    private UUID delivererId;
    private String delivererName;

    // Contact numbers - ONLY revealed after order is ACCEPTED
    // Both parties can see each other's number for coordination
    private String requesterPhone;
    private String delivererPhone;

    // Payment
    private PaymentStatus paymentStatus;

    // Timeline
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime deliveredAt;

    // Rating flags — frontend uses these to decide what to show after delivery
    private boolean isRated;
    private boolean isRatingSkipped;
}