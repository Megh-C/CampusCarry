package com.campuscarry.common.ratelimit;

import com.campuscarry.config.RateLimitConfig;
import tools.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Map;

/**
 * Rate limiting filter — runs on every request before hitting controllers.
 *
 * Logic:
 *   1. Auth endpoints (/auth/**) → rate limited by IP address
 *   2. All other endpoints       → rate limited by authenticated userId
 *
 * If bucket is exhausted → 429 Too Many Requests returned immediately.
 * Request never reaches the controller.
 *
 * OTP-specific cooldown is enforced in AuthService, not here,
 * because it requires the email from the request body which
 * the filter layer shouldn't parse.
 */
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitConfig rateLimitConfig;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        Bucket bucket;

        if (path.contains("/auth/")) {
            // Auth endpoints — rate limit by IP
            String ip = getClientIp(request);
            bucket = rateLimitConfig.resolveAuthBucket(ip);
        } else {
            // API endpoints — rate limit by authenticated userId
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() ||
                    auth.getPrincipal().equals("anonymousUser")) {
                // Unauthenticated non-auth request — let security handle it
                filterChain.doFilter(request, response);
                return;
            }
            String userId = auth.getName();
            bucket = rateLimitConfig.resolveApiBucket(userId);
        }

        if (bucket.tryConsume(1)) {
            // Token consumed — request passes through
            filterChain.doFilter(request, response);
        } else {
            // Bucket exhausted — reject with 429
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                    "success", false,
                    "message", "Too many requests. Please slow down and try again.",
                    "timestamp", java.time.LocalDateTime.now().toString()
            )));
        }
    }

    /**
     * Extracts real client IP — handles proxies and load balancers.
     * X-Forwarded-For header is set by Nginx/load balancer in production.
     */
    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}