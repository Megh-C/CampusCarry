package com.campuscarry.dto.response;

import com.campuscarry.entity.enums.PaymentTransactionStatus;
import com.campuscarry.entity.enums.PaymentType;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

// Full payment record — returned to admin for auditing
// Also returned to student to show payment status on their order
@Getter
@Setter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PaymentResponseDto {

    private UUID id;
    private UUID orderId;
    private Integer orderNumber;

    // COLLECTION or PAYOUT
    private PaymentType type;

    // PENDING, SUCCESS, FAILED
    private PaymentTransactionStatus status;

    private BigDecimal amount;
    private Integer attemptCount;

    // Null when mocked — real Razorpay ID when integrated
    private String gatewayRef;

    // Populated only on FAILED payments
    private String failureReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}