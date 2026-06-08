package com.campuscarry.repository;

import com.campuscarry.entity.EmailOtp;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, UUID> {

    // Fetch the latest unused OTP for an email
    Optional<EmailOtp> findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(String email);

    boolean existsByEmailAndIsUsedTrue(String email);


    // Nightly scheduler calls this to purge expired entries
    @Modifying
    @Transactional
    @Query("DELETE FROM EmailOtp o WHERE o.expiresAt < :now")
    void deleteAllExpiredBefore(LocalDateTime now);

}
