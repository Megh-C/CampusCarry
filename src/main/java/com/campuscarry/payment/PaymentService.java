package com.campuscarry.payment;

import com.campuscarry.entity.Order;
import com.campuscarry.entity.Payment;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.entity.enums.PaymentStatus;
import com.campuscarry.entity.enums.PaymentTransactionStatus;
import com.campuscarry.entity.enums.PaymentType;
import com.campuscarry.repository.OrderRepository;
import com.campuscarry.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final MockGatewayService gatewayService;

    private static final int MAX_RETRY_ATTEMPTS = 3;

    // ── Collection ───────────────────────────────────────────────────

    /**
     * Called from OrderService.createOrder() immediately after order is saved.
     *
     * Creates a COLLECTION payment record and marks it SUCCESS (mocked).
     * Updates order.paymentStatus → HELD to indicate fee is secured.
     *
     * Real flow when Razorpay is integrated:
     *   - gatewayRef will be a real Razorpay order ID
     *   - Frontend uses this ID to open the Razorpay UPI payment modal
     *   - Payment is only confirmed via webhook (not here directly)
     *   - Order appears on feed only AFTER webhook confirms payment
     */
    @Transactional
    public void initiateCollection(Order order, User requester) {
        // Call gateway to collect fee from requester
        String gatewayRef = gatewayService.collectPayment(
                order.getDeliveryFee(),
                requester.getEmail()
        );

        // Record the collection payment
        Payment payment = Payment.builder()
                .order(order)
                .payer(requester)
                .payee(requester)   // Payee is CampusCarry — using requester as placeholder for mock
                .type(PaymentType.COLLECTION)
                .status(PaymentTransactionStatus.SUCCESS)
                .amount(order.getDeliveryFee())
                .attemptCount(1)
                .gatewayRef(gatewayRef)
                .build();

        paymentRepository.save(payment);

        // Mark order payment as HELD — fee is secured, safe to show on feed
        order.setPaymentStatus(PaymentStatus.HELD);
        orderRepository.save(order);
    }

    // ── Payout ───────────────────────────────────────────────────────

    /**
     * Called from OrderService.confirmDelivery() after OTP is validated
     * and order status is flipped to DELIVERED.
     *
     * Attempts to pay out the delivery fee to the deliverer's UPI ID.
     * On success → order.paymentStatus = RELEASED
     * On failure → creates FAILED payment record, retry scheduler picks it up
     */
    @Transactional
    public void initiatePayout(Order order, User deliverer) {
        attemptPayout(order, deliverer, 1);
    }

    /**
     * Core payout attempt logic — used by both initiatePayout() and the retry scheduler.
     * Increments attemptCount on each call.
     * After MAX_RETRY_ATTEMPTS failures → marks order payment as FAILED.
     */
    @Transactional
    public void attemptPayout(Order order, User deliverer, int attemptNumber) {
        try {
            // Warn in logs if deliverer has no UPI ID — payout will be mocked regardless
            if (deliverer.getUpiId() == null || deliverer.getUpiId().isBlank()) {
                System.out.println("[PaymentService] WARNING: Deliverer " +
                        deliverer.getId() + " has no UPI ID. Payout mocked.");
            }

            String upiId = deliverer.getUpiId() != null
                    ? deliverer.getUpiId()
                    : "mock@upi";

            // Call gateway to send payout to deliverer
            String gatewayRef = gatewayService.sendPayout(upiId, order.getDeliveryFee());

            // Record successful payout
            Payment payment = Payment.builder()
                    .order(order)
                    .payer(deliverer)   // CampusCarry paying out — using deliverer as placeholder
                    .payee(deliverer)
                    .type(PaymentType.PAYOUT)
                    .status(PaymentTransactionStatus.SUCCESS)
                    .amount(order.getDeliveryFee())
                    .attemptCount(attemptNumber)
                    .gatewayRef(gatewayRef)
                    .build();

            paymentRepository.save(payment);

            // Mark order payment as RELEASED — money sent to deliverer
            order.setPaymentStatus(PaymentStatus.RELEASED);
            orderRepository.save(order);

            System.out.println("[PaymentService] Payout successful for order "
                    + order.getOrderNumber() + " on attempt " + attemptNumber);

        } catch (Exception e) {
            // Payout attempt failed — record it
            Payment failedPayment = Payment.builder()
                    .order(order)
                    .payer(deliverer)
                    .payee(deliverer)
                    .type(PaymentType.PAYOUT)
                    .status(PaymentTransactionStatus.FAILED)
                    .amount(order.getDeliveryFee())
                    .attemptCount(attemptNumber)
                    .failureReason(e.getMessage())
                    .build();

            paymentRepository.save(failedPayment);

            if (attemptNumber >= MAX_RETRY_ATTEMPTS) {
                // Exhausted all retries — mark order payment FAILED for admin
                order.setPaymentStatus(PaymentStatus.FAILED);
                orderRepository.save(order);
                System.out.println("[PaymentService] Payout FAILED after " +
                        MAX_RETRY_ATTEMPTS + " attempts for order " +
                        order.getOrderNumber() + ". Manual handling required.");
            } else {
                System.out.println("[PaymentService] Payout attempt " + attemptNumber +
                        " failed for order " + order.getOrderNumber() +
                        ". Will retry. Reason: " + e.getMessage());
            }
        }
    }

    // ── Retry ─────────────────────────────────────────────────────────

    /**
     * Called by PaymentRetryScheduler every 15 minutes.
     * Finds all FAILED payout records with attemptCount < 3 and retries them.
     * Each retry increments the attemptCount on a new Payment record.
     */
    @Transactional
    public void retryFailedPayouts() {
        List<Payment> failedPayouts = paymentRepository
                .findByStatusAndAttemptCountLessThan(
                        PaymentTransactionStatus.FAILED, MAX_RETRY_ATTEMPTS);

        if (failedPayouts.isEmpty()) return;

        System.out.println("[PaymentService] Retrying " + failedPayouts.size()
                + " failed payouts...");

        failedPayouts.forEach(failed -> {
            Order order = failed.getOrder();
            User deliverer = order.getDeliverer();
            int nextAttempt = failed.getAttemptCount() + 1;

            // Only retry DELIVERED orders — don't retry if order somehow not delivered
            if (order.getStatus() == OrderStatus.DELIVERED) {
                attemptPayout(order, deliverer, nextAttempt);
            }
        });
    }

    // ── Query ─────────────────────────────────────────────────────────

    /**
     * Returns all payment records for a given order.
     * Used by admin to audit the full payment trail for an order.
     * Called by: GET /admin/orders/{id}/payments
     */
    public List<Payment> getPaymentsForOrder(UUID orderId) {
        return paymentRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
    }
}