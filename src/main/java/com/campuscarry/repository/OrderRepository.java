package com.campuscarry.repository;

import com.campuscarry.entity.Order;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.OrderSize;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.entity.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID>, JpaSpecificationExecutor<Order> {

    // ── Feed Queries ─────────────────────────────────────────────────

    // Returns all PENDING orders for the feed, newest first.
    // Paginated so we don't load thousands of rows at once.
    Page<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status, Pageable pageable);

    // Feed filtered by pickup location - used when deliverer is already at a spot
    Page<Order> findByStatusAndPickupLocationIdOrderByCreatedAtDesc(
            OrderStatus status, UUID pickupLocationId, Pageable pageable);

    // ── My Orders ────────────────────────────────────────────────────

    // All orders placed by a student (as requester), newest first
    Page<Order> findByRequesterIdOrderByCreatedAtDesc(UUID requesterId, Pageable pageable);

    // All orders delivered by a student (as deliverer), newest first
    Page<Order> findByDelivererIdOrderByCreatedAtDesc(UUID delivererId, Pageable pageable);

    // ── Order Number Generation ──────────────────────────────────────

    // Finds the highest order number used today.
    // Used to calculate the next order number (max + 1).
    // If no orders today, returns empty → service defaults to 1.
    @Query("SELECT MAX(o.orderNumber) FROM Order o WHERE o.createdAt >= :startOfDay")
    Optional<Integer> findMaxOrderNumberSince(@Param("startOfDay") LocalDateTime startOfDay);

    // ── Scheduler Queries ────────────────────────────────────────────


    // Bulk updates all PENDING orders past their expiresAt to EXPIRED.
    @Modifying
    @Query("UPDATE Order o SET o.status = 'EXPIRED' WHERE o.status = 'PENDING' AND o.expiresAt < :now")
    int expireOverdueOrders(@Param("now") LocalDateTime now);

    // Finds ACCEPTED orders past payment deadline where payment is still PENDING
    // These are orders where requester didn't pay within 5 mins of acceptance
    @Query("SELECT o FROM Order o " +
            "WHERE o.status = 'ACCEPTED' " +
            "AND o.paymentDeadline < :now " +
            "AND o.paymentStatus = 'PENDING'")
    List<Order> findAcceptedOrdersPastPaymentDeadline(@Param("now") LocalDateTime now);

    // ── Admin Queries ────────────────────────────────────────────────

    // Admin dashboard - all orders with any status, paginated
    // Full search + filter for admin orders dashboard
    // Searches by order number or description
    // Filters by status, size, payment status, date range
    @Query("""
            SELECT o FROM Order o
            WHERE (:search IS NULL OR
                   CAST(o.orderNumber AS string) LIKE CONCAT('%', :search, '%') OR
                   LOWER(o.description) LIKE LOWER(CONCAT('%', :search, '%')))
            AND   (:status        IS NULL OR o.status        = :status)
            AND   (:size          IS NULL OR o.size          = :size)
            AND   (:paymentStatus IS NULL OR o.paymentStatus = :paymentStatus)
            AND   (:from          IS NULL OR o.createdAt    >= :from)
            AND   (:to            IS NULL OR o.createdAt    <= :to)
            """)
    Page<Order> findAllWithFilters(
            @Param("search") String search,
            @Param("status") OrderStatus status,
            @Param("size") OrderSize size,
            @Param("paymentStatus") PaymentStatus paymentStatus,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );

    // Count orders by status in date range — for stats
    @Query("""
            SELECT COUNT(o) FROM Order o
            WHERE o.status = :status
            AND   o.createdAt >= :from
            AND   o.createdAt <= :to
            """)
    long countByStatusAndDateRange(
            @Param("status") OrderStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    // Total revenue (sum of delivery fees) for DELIVERED orders in date range
    @Query("""
            SELECT COALESCE(SUM(o.deliveryFee), 0) FROM Order o
            WHERE o.status = 'DELIVERED'
            AND   o.createdAt >= :from
            AND   o.createdAt <= :to
            """)
    BigDecimal sumDeliveryFeeByDateRange(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    // Failed payments count — orders where payment failed after all retries
    long countByPaymentStatus(PaymentStatus paymentStatus);


}