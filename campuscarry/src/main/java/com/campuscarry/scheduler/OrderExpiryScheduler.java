package com.campuscarry.scheduler;

import com.campuscarry.entity.Order;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.repository.OrderRepository;
import com.campuscarry.repository.UserRepository;
import com.campuscarry.service.OrderWebSocketService;
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
    private final OrderWebSocketService webSocketService;

    /**
     * Runs every minute.
     *
     * Job 1 — EXPIRY:
     *   Fetches PENDING orders past expiresAt, marks them EXPIRED,
     *   broadcasts removal to all connected deliverers via WebSocket.
     *
     * Job 2 — UNPAID:
     *   Fetches ACCEPTED orders past paymentDeadline with paymentStatus=PENDING,
     *   marks them UNPAID, frees up deliverer counts.
     *   No WebSocket broadcast needed — order was already removed from feed at acceptance.
     */
    @Async
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void processOrderTimeouts() {
        LocalDateTime now = LocalDateTime.now();

        // ── Job 1: Expire overdue PENDING orders ─────────────────────
        List<Order> overdueOrders = orderRepository
                .findPendingOrdersPastExpiry(now);

        overdueOrders.forEach(order -> {
            order.setStatus(OrderStatus.EXPIRED);
            orderRepository.save(order);

            // Remove from all connected deliverers' feeds instantly
            webSocketService.broadcastOrderRemoved(order.getId());
        });

        if (!overdueOrders.isEmpty()) {
            System.out.println("[OrderExpiryScheduler] Expired " + overdueOrders.size()
                    + " orders at " + now);
        }

        // ── Job 2: Mark unpaid ACCEPTED orders ───────────────────────
        List<Order> unpaidOrders = orderRepository
                .findAcceptedOrdersPastPaymentDeadline(now);

        unpaidOrders.forEach(order -> {
            order.setStatus(OrderStatus.UNPAID);
            orderRepository.save(order);

            // Free up deliverer — decrement active counts
            User deliverer = order.getDeliverer();
            if (deliverer != null) {
                decrementDelivererCounts(deliverer, order.getSize().name());
                userRepository.save(deliverer);
            }
            // No WebSocket broadcast — order already removed from feed at acceptance
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