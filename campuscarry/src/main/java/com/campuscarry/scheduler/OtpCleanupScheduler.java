package com.campuscarry.scheduler;

import com.campuscarry.repository.EmailOtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class OtpCleanupScheduler {

    private final EmailOtpRepository emailOtpRepository;

    /**
     * Runs every night at midnight.
     * Deletes all OTP entries whose expiresAt is in the past.
     * This keeps the email_otps table lean — expired rows have no use.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void deleteExpiredOtps() {
        emailOtpRepository.deleteAllExpiredBefore(LocalDateTime.now());
        System.out.println("[OtpCleanupScheduler] Expired OTPs purged at " + LocalDateTime.now());
    }
}