package com.campuscarry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "email_otps",
        indexes = {
                @Index(name = "idx_otp_email", columnList = "email"),
                @Index(name = "idx_otp_expires_at", columnList = "expires_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailOtp extends BaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    // Stored as BCrypt hash — never plain text
    @Column(name = "otp", nullable = false)
    private String otp;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // Marked true after successful verification — not deleted immediately
    // Scheduler cleans up all expired rows nightly
    @Column(name = "is_used", nullable = false)
    @Builder.Default
    private boolean isUsed = false;

    // ── Helper Methods ───────────────────────────────────────────────

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    public boolean isValid() {
        return !isUsed && !isExpired();
    }
}