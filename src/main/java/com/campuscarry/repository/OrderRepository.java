package com.campuscarry.repository;

import com.campuscarry.entity.Order;
import com.campuscarry.entity.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

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

    // Called by OrderExpiryScheduler every 10 mins.
    // Bulk updates all PENDING orders past their expiresAt to EXPIRED.
    @Modifying
    @Query("UPDATE Order o SET o.status = 'EXPIRED' WHERE o.status = 'PENDING' AND o.expiresAt < :now")
    int expireOverdueOrders(@Param("now") LocalDateTime now);

    // ── Admin Queries ────────────────────────────────────────────────

    // Admin dashboard - all orders with any status, paginated
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // Admin stats - count orders by status for a given day
    @Query("SELECT COUNT(o) FROM Order o WHERE o.createdAt >= :startOfDay AND o.status = :status")
    long countOrdersByStatusSince(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("status") OrderStatus status);
}