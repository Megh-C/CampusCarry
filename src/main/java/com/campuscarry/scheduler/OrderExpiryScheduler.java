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

    /**
     * Runs every hour.
     * Nullifies the OTP on orders where otpExpiresAt has passed.
     * This means a 5-hour-old OTP can no longer be used for delivery confirmation.
     * Does NOT change order status — just wipes the OTP field.
     *
     * Why hourly and not every 10 mins?
     * OTPs last 5 hours so checking every hour is more than precise enough.
     * No point running it as frequently as the order expiry job.
     *
     * Cron: "0 0 * * * *" → fires at the top of every hour
     */
    @Async
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void expireOrderOtps() {
        int clearedCount = orderRepository.clearExpiredOtps(LocalDateTime.now());
        if (clearedCount > 0) {
            System.out.println("[OrderExpiryScheduler] Cleared OTP on " + clearedCount
                    + " orders at " + LocalDateTime.now());
        }
    }
}