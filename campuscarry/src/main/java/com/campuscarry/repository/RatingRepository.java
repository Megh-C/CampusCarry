package com.campuscarry.repository;

import com.campuscarry.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RatingRepository extends JpaRepository<Rating, UUID> {

    // Check if a rating already exists for this order
    // Used to prevent duplicate ratings
    boolean existsByOrderId(UUID orderId);

    // Find rating for a specific order — used to return rating details
    Optional<Rating> findByOrderId(UUID orderId);

    // All ratings received by a deliverer — for their profile page
    List<Rating> findByRateeIdOrderByCreatedAtDesc(UUID rateeId);

    // Used to recalculate average rating for a deliverer after new rating submitted
    // Returns average stars across all ratings received by this user
    @Query("SELECT AVG(r.stars) FROM Rating r WHERE r.ratee.id = :rateeId")
    Double calculateAverageRating(@Param("rateeId") UUID rateeId);

    // Count of ratings received — used alongside average for display
    long countByRateeId(UUID rateeId);
}