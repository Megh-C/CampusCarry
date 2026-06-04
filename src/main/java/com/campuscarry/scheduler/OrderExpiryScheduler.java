package com.campuscarry.scheduler;

import com.campuscarry.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class OrderExpiryScheduler {

    private final OrderRepository orderRepository;

    /**
     * Runs every 10 minutes.
     * Finds all PENDING orders whose expiresAt has passed and marks them EXPIRED.
     * This is a single bulk UPDATE query - not heavy on the DB at all.
     * Runs @Async so it never blocks the main application thread.
     *
     * Cron breakdown: "0 0/10 * * * *"
     *   0       = at second 0
     *   0/10    = every 10 minutes
     *   *       = every hour, every day, every month, every weekday
     */
    @Async
    @Scheduled(cron = "0 0/10 * * * *")
    @Transactional
    public void expireOverdueOrders() {
        int expiredCount = orderRepository.expireOverdueOrders(LocalDateTime.now());

        if (expiredCount > 0) {
            System.out.println("[OrderExpiryScheduler] Marked " + expiredCount +
                    " orders as EXPIRED at " + LocalDateTime.now());
        }
    }
}