package com.campuscarry.service;

import com.campuscarry.dto.request.SubmitRatingRequestDto;
import com.campuscarry.dto.response.RatingResponseDto;
import com.campuscarry.entity.Order;
import com.campuscarry.entity.Rating;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.exception.BadRequestException;
import com.campuscarry.exception.ForbiddenException;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.repository.OrderRepository;
import com.campuscarry.repository.RatingRepository;
import com.campuscarry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final RatingRepository ratingRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    // ── Submit Rating ────────────────────────────────────────────────

    /**
     * Called by: POST /orders/{id}/rate
     *
     * Only the requester of a DELIVERED order can submit a rating.
     * One rating per order — enforced by DB unique constraint and service check.
     * After saving, recalculates and updates the deliverer's average rating on User.
     */
    @Transactional
    public RatingResponseDto submitRating(UUID orderId,
                                          SubmitRatingRequestDto request,
                                          UUID raterId) {

        //EDGE CASE WORKING
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        //EDGE CASE WORKING
        // Only the requester can rate this delivery
        if (!order.getRequester().getId().equals(raterId)) {
            throw new ForbiddenException("Only the requester can rate this delivery.");
        }

        //EDGE CASE WORKING
        // Can only rate a delivered order
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("You can only rate a completed delivery.");
        }


        // Cannot rate twice
        if (order.isRated()) {
            throw new BadRequestException("You have already rated this delivery.");
        }

        // Cannot rate if explicitly skipped — but we allow it anyway per product decision
        // isRatingSkipped just means they skipped the prompt — history rating is still allowed
        User deliverer = order.getDeliverer();
        User requester = order.getRequester();

        // Save the rating
        Rating rating = Rating.builder()
                .order(order)
                .rater(requester)
                .ratee(deliverer)
                .stars(request.getStars())
                .description(request.getDescription())
                .build();

        ratingRepository.save(rating);

        // Mark order as rated
        order.setRated(true);
        order.setRatingSkipped(false);
        orderRepository.save(order);

        // Recalculate deliverer's average rating across all their deliveries
        // Uses DB AVG() query — accurate and always fresh
        Double newAverage = ratingRepository.calculateAverageRating(deliverer.getId());
        deliverer.setRating(newAverage != null
                ? Math.round(newAverage * 10.0) / 10.0  // round to 1 decimal
                : null);
        userRepository.save(deliverer);

        return mapToDto(rating, newAverage);
    }

    // ── Skip Rating ──────────────────────────────────────────────────

    /**
     * Called by: POST /orders/{id}/skip-rate
     *
     * Marks the order as rating skipped.
     * Student can still rate later from order history — skip just dismisses the prompt.
     * If already rated, skip does nothing and returns a message.
     */
    @Transactional
    public void skipRating(UUID orderId, UUID requesterId) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        // Only requester can skip
        //edge casse checked
        if (!order.getRequester().getId().equals(requesterId)) {
            throw new ForbiddenException("Only the requester can skip rating for this order.");
        }

        //edge casse checked
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Cannot skip rating on a non-delivered order.");
        }

        // Already rated — skip is meaningless, just return quietly
        if (order.isRated()) {
            return;
        }

        order.setRatingSkipped(true);
        orderRepository.save(order);
    }

    // ── Get Rating for Order ─────────────────────────────────────────

    /**
     * Called by: GET /orders/{id}/rating
     * Returns the rating for a specific order if it exists.
     * Used by frontend to display submitted rating on order history page.
     */
    public RatingResponseDto getRatingForOrder(UUID orderId) {
        Rating rating = ratingRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No rating found for this order."));
        return mapToDto(rating, null);
    }

    // ── Private Helpers ──────────────────────────────────────────────

    private RatingResponseDto mapToDto(Rating rating, Double newAverage) {
        return RatingResponseDto.builder()
                .id(rating.getId())
                .orderId(rating.getOrder().getId())
                .orderNumber(rating.getOrder().getOrderNumber())
                .raterId(rating.getRater().getId())
                .raterName(rating.getRater().getFullName())
                .rateeId(rating.getRatee().getId())
                .rateeName(rating.getRatee().getFullName())
                .stars(rating.getStars())
                .description(rating.getDescription())
                .delivererNewAverageRating(newAverage)
                .createdAt(rating.getCreatedAt())
                .build();
    }
}