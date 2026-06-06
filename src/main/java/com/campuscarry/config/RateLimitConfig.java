package com.campuscarry.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages per-key token buckets for rate limiting.
 *
 * Two bucket types:
 *   AUTH bucket   — stricter, 5 requests per minute per IP
 *   API bucket    — looser, 60 requests per minute per user ID
 *
 * Buckets are stored in a ConcurrentHashMap — in-memory, per JVM instance.
 * Good enough for a monolith. If we scale to multiple instances later,
 * replace with Bucket4j + Redis backend (one line change).
 *
 * Key format:
 *   Auth endpoints  → "auth:{ip}"
 *   API endpoints   → "api:{userId}"
 *   OTP cooldown    → "otp:{email}"
 */
@Component
public class RateLimitConfig {

    @Value("${app.rate-limit.auth-requests-per-minute}")
    private int authRequestsPerMinute;

    @Value("${app.rate-limit.api-requests-per-minute}")
    private int apiRequestsPerMinute;

    @Value("${app.rate-limit.otp-cooldown-minutes}")
    private int otpCooldownMinutes;

    // Separate maps for each bucket type
    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> apiBuckets  = new ConcurrentHashMap<>();
    private final Map<String, Bucket> otpBuckets  = new ConcurrentHashMap<>();

    /**
     * Returns or creates an AUTH bucket for a given IP.
     * 5 tokens, refills 5 per minute.
     */
    public Bucket resolveAuthBucket(String ip) {
        return authBuckets.computeIfAbsent(ip, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.classic(
                                authRequestsPerMinute,
                                Refill.intervally(authRequestsPerMinute, Duration.ofMinutes(1))))
                        .build());
    }

    /**
     * Returns or creates an API bucket for a given userId.
     * 60 tokens, refills 60 per minute.
     */
    public Bucket resolveApiBucket(String userId) {
        return apiBuckets.computeIfAbsent(userId, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.classic(
                                apiRequestsPerMinute,
                                Refill.intervally(apiRequestsPerMinute, Duration.ofMinutes(1))))
                        .build());
    }

    /**
     * Returns or creates an OTP cooldown bucket for a given email.
     * 1 token, refills 1 per otpCooldownMinutes (default 2 mins).
     * Prevents OTP spam on signup/forgot-password endpoints.
     */
    public Bucket resolveOtpBucket(String email) {
        return otpBuckets.computeIfAbsent(email, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.classic(
                                1,
                                Refill.intervally(1, Duration.ofMinutes(otpCooldownMinutes))))
                        .build());
    }
}