package com.campuscarry.scheduler;

import com.campuscarry.entity.User;
import com.campuscarry.repository.OrderRepository;
import com.campuscarry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class OrderExpiryScheduler {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    /**
     * Runs every minute.
     *
     * Two jobs in one pass:
     *
     * 1. EXPIRY — marks PENDING orders past expiresAt as EXPIRED.
     *    No refund needed since no payment was taken at order creation.
     *
     * 2. UNPAID — marks ACCEPTED orders past paymentDeadline
     *    where paymentStatus is still PENDING (not HELD) as UNPAID.
     *    Deliverer counts are decremented so they are free to accept other orders.
     *
     * Cron: "0 * * * * *" → fires at second 0 of every minute
     */
    @Async
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void processOrderTimeouts() {
        LocalDateTime now = LocalDateTime.now();

        // ── Job 1: Expire overdue PENDING orders ─────────────────────
        int expiredCount = orderRepository.expireOverdueOrders(now);
        if (expiredCount > 0) {
            System.out.println("[OrderExpiryScheduler] Expired " + expiredCount
                    + " orders at " + now);
        }

        // ── Job 2: Mark unpaid ACCEPTED orders ───────────────────────
        // Fetch ACCEPTED orders past payment deadline with payment still PENDING
        List<com.campuscarry.entity.Order> unpaidOrders =
                orderRepository.findAcceptedOrdersPastPaymentDeadline(now);

        unpaidOrders.forEach(order -> {
            order.setStatus(com.campuscarry.entity.enums.OrderStatus.UNPAID);
            orderRepository.save(order);

            // Free up the deliverer — decrement their active counts
            User deliverer = order.getDeliverer();
            if (deliverer != null) {
                decrementDelivererCounts(deliverer, order.getSize().name());
                userRepository.save(deliverer);
            }
        });

        if (!unpaidOrders.isEmpty()) {
            System.out.println("[OrderExpiryScheduler] Marked " + unpaidOrders.size()
                    + " orders as UNPAID at " + now);
        }
    }

    private void decrementDelivererCounts(User deliverer, String size) {
        switch (size.toUpperCase()) {
            case "SMALL"  -> deliverer.setActiveSmall(
                    Math.max(0, deliverer.getActiveSmall() - 1));
            case "MEDIUM" -> deliverer.setActiveMedium(
                    Math.max(0, deliverer.getActiveMedium() - 1));
            case "LARGE"  -> deliverer.setActiveLarge(
                    Math.max(0, deliverer.getActiveLarge() - 1));
        }
        if (deliverer.getActiveSmall() == 0 &&
                deliverer.getActiveMedium() == 0 &&
                deliverer.getActiveLarge() == 0) {
            deliverer.setOnDelivery(false);
        }
    }
}