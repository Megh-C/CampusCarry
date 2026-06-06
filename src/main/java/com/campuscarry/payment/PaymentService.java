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
     * Called from OrderService.acceptOrder() — NOT at order creation.
     * Payment is initiated only when a deliverer accepts the order.
     * Requester has 5 minutes to complete payment (paymentDeadline on Order).
     * Mocked — always marks HELD immediately.
     * Real Razorpay: creates order, frontend opens UPI payment modal.
     */
    @Transactional
    public void initiateCollection(Order order, User requester) {
        String gatewayRef = gatewayService.collectPayment(
                order.getDeliveryFee(), requester.getEmail());

        Payment payment = Payment.builder()
                .order(order)
                .payer(requester)
                .payee(requester)
                .type(PaymentType.COLLECTION)
                .status(PaymentTransactionStatus.SUCCESS)
                .amount(order.getDeliveryFee())
                .attemptCount(1)
                .gatewayRef(gatewayRef)
                .build();

        paymentRepository.save(payment);

        // Mock: immediately marks HELD
        // Real: only marked HELD after Razorpay webhook confirms payment
        order.setPaymentStatus(PaymentStatus.HELD);
        orderRepository.save(order);
    }

    // ── Payout ───────────────────────────────────────────────────────

    /**
     * Called from OrderService.confirmDelivery() after OTP validated.
     * Automatically pays out delivery fee to deliverer's UPI.
     */
    @Transactional
    public void initiatePayout(Order order, User deliverer) {
        attemptPayout(order, deliverer, 1);
    }

    @Transactional
    public void attemptPayout(Order order, User deliverer, int attemptNumber) {
        try {
            String upiId = deliverer.getUpiId() != null
                    ? deliverer.getUpiId() : "mock@upi";

            String gatewayRef = gatewayService.sendPayout(upiId, order.getDeliveryFee());

            Payment payment = Payment.builder()
                    .order(order)
                    .payer(deliverer)
                    .payee(deliverer)
                    .type(PaymentType.PAYOUT)
                    .status(PaymentTransactionStatus.SUCCESS)
                    .amount(order.getDeliveryFee())
                    .attemptCount(attemptNumber)
                    .gatewayRef(gatewayRef)
                    .build();

            paymentRepository.save(payment);

            order.setPaymentStatus(PaymentStatus.RELEASED);
            orderRepository.save(order);

        } catch (Exception e) {
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
                order.setPaymentStatus(PaymentStatus.FAILED);
                orderRepository.save(order);
            }
        }
    }

    // ── Retry Failed Payouts ─────────────────────────────────────────

    /**
     * Called by PaymentRetryScheduler every 15 minutes.
     * Retries FAILED payouts with attemptCount < 3.
     */
    @Transactional
    public void retryFailedPayouts() {
        List<Payment> failedPayouts = paymentRepository
                .findByStatusAndAttemptCountLessThan(
                        PaymentTransactionStatus.FAILED, MAX_RETRY_ATTEMPTS);

        if (failedPayouts.isEmpty()) return;

        failedPayouts.forEach(failed -> {
            Order order = failed.getOrder();
            User deliverer = order.getDeliverer();
            int nextAttempt = failed.getAttemptCount() + 1;

            if (order.getStatus() == OrderStatus.DELIVERED) {
                attemptPayout(order, deliverer, nextAttempt);
            }
        });
    }

    // ── Query ────────────────────────────────────────────────────────

    public List<Payment> getPaymentsForOrder(UUID orderId) {
        return paymentRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
    }
}