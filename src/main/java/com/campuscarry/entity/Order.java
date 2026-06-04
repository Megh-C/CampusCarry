package com.campuscarry.entity;

import com.campuscarry.entity.enums.OrderSize;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.entity.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "orders",
        indexes = {
                // Fast lookup of all orders by a specific requester (my orders page)
                @Index(name = "idx_order_requester_id", columnList = "requester_id"),
                // Fast lookup of all orders assigned to a deliverer
                @Index(name = "idx_order_deliverer_id", columnList = "deliverer_id"),
                // Scheduler queries by status + expiresAt every 10 mins
                @Index(name = "idx_order_status_expires", columnList = "status, expires_at"),
                // Feed queries filter by status = PENDING
                @Index(name = "idx_order_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // ── Order Identity ───────────────────────────────────────────────

    // Human-readable order number. Resets to 1 every day.
    // Used by students to refer to an order (e.g. "Order #42")
    @Column(name = "order_number", nullable = false)
    private Integer orderNumber;

    // ── Parties Involved ─────────────────────────────────────────────

    // The student who placed the order
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    // The student who accepted to deliver - null until someone accepts
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deliverer_id")
    private User deliverer;

    // ── Order Details ────────────────────────────────────────────────

    // The campus pickup spot (restaurant/shop) where the item is to be collected
    // FK to Location table - will be wired when Location entity is built
    @Column(name = "pickup_location_id", nullable = false)
    private UUID pickupLocationId;

    // Optional human-readable description e.g. "Chicken biryani, Order #5 at Zaitoon"
    @Column(name = "description", length = 500)
    private String description;

    // Size affects both delivery fee and how many orders a deliverer can carry
    @Enumerated(EnumType.STRING)
    @Column(name = "size", nullable = false, length = 10)
    private OrderSize size;

    // Destination block letter e.g. "A", "B" - cluster derived from this at runtime
    @Column(name = "drop_hostel_block", nullable = false, length = 5)
    private String dropHostelBlock;

    // ── Pricing ──────────────────────────────────────────────────────

    // Snapshot of fee at order creation time.
    // Even if admin changes pricing later, this order always shows original fee.
    @Column(name = "delivery_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal deliveryFee;

    // ── Order Status & Timeline ──────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrderStatus status;

    // Set at order creation - if still PENDING after this time, scheduler marks EXPIRED
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // Set when a deliverer accepts the order
    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    // Set when OTP is confirmed and delivery is complete
    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    // ── OTP Confirmation ─────────────────────────────────────────────

    // Generated when deliverer accepts, emailed to requester.
    // Deliverer enters this OTP at handoff to confirm delivery.
    // Stored as BCrypt hash - never plain text.
    @Column(name = "otp")
    private String otp;

    // OTP is valid for 5 hours from generation.
    // Checked at delivery confirmation time.
    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    // ── Payment ──────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus;

    // Razorpay order ID for the initial fee collection from requester
    // Mocked for now - will be real Razorpay ID when payment is integrated
    @Column(name = "razorpay_order_id", length = 100)
    private String razorpayOrderId;

    // Razorpay payout ID for the release of fee to deliverer's UPI
    // Set after successful delivery confirmation
    @Column(name = "razorpay_payout_id", length = 100)
    private String razorpayPayoutId;

    // ── Helper Methods ───────────────────────────────────────────────

    // Quick check used by scheduler and service layer
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    // Check if the OTP submitted by deliverer is still within valid window
    public boolean isOtpValid() {
        return otp != null &&
                otpExpiresAt != null &&
                LocalDateTime.now().isBefore(otpExpiresAt);
    }
}