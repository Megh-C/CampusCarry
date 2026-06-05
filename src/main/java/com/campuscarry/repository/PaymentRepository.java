package com.campuscarry.repository;

import com.campuscarry.entity.Payment;
import com.campuscarry.entity.enums.PaymentTransactionStatus;
import com.campuscarry.entity.enums.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    // All payment records for a specific order (usually 2 — one COLLECTION, one PAYOUT)
    List<Payment> findByOrderIdOrderByCreatedAtAsc(UUID orderId);

    // Find the specific payment type for an order
    // e.g. find the COLLECTION record for order X to check if fee was received
    Optional<Payment> findByOrderIdAndType(UUID orderId, PaymentType type);

    // Used by retry scheduler — find all FAILED payments eligible for retry
    // canRetry() = status is FAILED and attemptCount < 3
    List<Payment> findByStatusAndAttemptCountLessThan(
            PaymentTransactionStatus status, int maxAttempts);

    // Admin stats — count failed payments needing manual attention
    // These are payments where status=FAILED and attemptCount=3 (exhausted retries)
    long countByStatusAndAttemptCount(PaymentTransactionStatus status, int attemptCount);
}