package com.campuscarry.repository;

import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<User> findByEmailAndStatus(String email, UserStatus status);

    // ── Admin Queries ────────────────────────────────────────────────

    // Search + filter users for admin dashboard
    // Searches fullName, email, phone — filters by status if provided
    @Query("""
            SELECT u FROM User u
            WHERE (:search IS NULL OR
                   LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR
                   LOWER(u.email)    LIKE LOWER(CONCAT('%', :search, '%')) OR
                   u.phone           LIKE CONCAT('%', :search, '%'))
            AND   (:status IS NULL OR u.status = :status)
            AND   (:gender IS NULL OR u.gender = :gender)
            AND   (:year   IS NULL OR u.year   = :year)
            """)
    Page<User> findAllWithFilters(
            @Param("search") String search,
            @Param("status") UserStatus status,
            @Param("gender") String gender,
            @Param("year") Integer year,
            Pageable pageable
    );

    // Count users by status — for admin stats
    long countByStatus(UserStatus status);

    // Stale user cleanup — deletes incomplete signups older than cutoff
    @Modifying
    @Query("DELETE FROM User u WHERE u.status IN :statuses AND u.createdAt < :cutoff")
    int deleteStaleUsersByStatusAndCreatedBefore(
            @Param("statuses") List<UserStatus> statuses,
            @Param("cutoff") LocalDateTime cutoff
    );
}