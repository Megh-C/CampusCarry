package com.campuscarry.repository;

import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<User> findByEmailAndStatus(String email, UserStatus status);

    // Deletes incomplete signup shells older than the given cutoff
    // Only touches PENDING and OTP_VERIFIED users — never touches ACTIVE, SUSPENDED, BANNED
    @Modifying
    @Query("DELETE FROM User u WHERE u.status IN :statuses AND u.createdAt < :cutoff")
    int deleteStaleUsersByStatusAndCreatedBefore(
            @Param("statuses") List<UserStatus> statuses,
            @Param("cutoff") LocalDateTime cutoff
    );
}