package com.campuscarry.scheduler;

import com.campuscarry.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Retries failed payout attempts every 15 minutes.
 *
 * Flow:
 *   1. Queries payments table for FAILED payouts with attemptCount < 3
 *   2. For each — calls PaymentService.attemptPayout() with attemptCount + 1
 *   3. If attempt succeeds → payment marked SUCCESS, order.paymentStatus = RELEASED
 *   4. If attempt fails again and count hits 3 → order.paymentStatus = FAILED
 *      Admin must handle manually via /admin/payments/failed
 *
 * Runs @Async so it never blocks the main thread.
 * Cron: "0 0/15 * * * *" → fires every 15 minutes
 */
@Component
@RequiredArgsConstructor
public class PaymentRetryScheduler {

    private final PaymentService paymentService;

    @Async
    @Scheduled(cron = "0 0/15 * * * *")
    public void retryFailedPayouts() {
        paymentService.retryFailedPayouts();
    }
}