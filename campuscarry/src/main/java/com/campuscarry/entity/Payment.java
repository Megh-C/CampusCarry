package com.campuscarry.entity;

import com.campuscarry.entity.enums.PaymentTransactionStatus;
import com.campuscarry.entity.enums.PaymentType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Tracks every payment event independently from the Order.
 *
 * Two records are created per completed order:
 *   1. COLLECTION — fee collected from requester when order is placed
 *   2. PAYOUT     — fee released to deliverer when order is delivered
 *
 * Each failed attempt increments attemptCount.
 * Max 3 attempts — after that status = FAILED and admin handles manually.
 *
 * When real Razorpay is integrated:
 *   - gatewayRef stores the Razorpay order ID (for COLLECTION)
 *   - gatewayRef stores the Razorpay payout ID (for PAYOUT)
 */
@Entity
@Table(
        name = "payments",
        indexes = {
                // Fast lookup of all payments for a specific order
                @Index(name = "idx_payment_order_id", columnList = "order_id"),
                // Admin queries by status to find failed payments needing attention
                @Index(name = "idx_payment_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // ── Order Reference ──────────────────────────────────────────────

    // The order this payment belongs to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // ── Payment Parties ──────────────────────────────────────────────

    // Student who is paying (requester for COLLECTION, system for PAYOUT)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payer_id", nullable = false)
    private User payer;

    // Student who is receiving (CampusCarry for COLLECTION, deliverer for PAYOUT)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payee_id", nullable = false)
    private User payee;

    // ── Payment Details ──────────────────────────────────────────────

    // COLLECTION or PAYOUT
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private PaymentType type;

    // PENDING, SUCCESS, FAILED
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentTransactionStatus status;

    // Amount to be collected or paid out — copied from order.deliveryFee
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    // ── Retry Tracking ───────────────────────────────────────────────

    // Incremented on each attempt. Max 3 — after that marked FAILED.
    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private Integer attemptCount = 0;

    // ── Gateway Reference ────────────────────────────────────────────

    // Null when mocked. Will store Razorpay order/payout ID when real gateway is integrated.
    @Column(name = "gateway_ref", length = 100)
    private String gatewayRef;

    // Populated when status = FAILED — reason for failure for admin review
    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    // ── Helper ───────────────────────────────────────────────────────

    // Whether this payment is eligible for another retry attempt
    public boolean canRetry() {
        return this.status == PaymentTransactionStatus.FAILED && this.attemptCount < 3;
    }
}