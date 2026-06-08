package com.campuscarry.controller;

import com.campuscarry.dto.request.SubmitRatingRequestDto;
import com.campuscarry.dto.response.RatingResponseDto;
import com.campuscarry.entity.User;
import com.campuscarry.dto.response.ApiResponseDto;
import com.campuscarry.service.RatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    // POST /api/v1/orders/{id}/rate
    // Requester submits a 1-5 star rating + optional description after delivery.
    // Frontend calls this when student submits the rating prompt or rates from history.
    @PostMapping("/{id}/rate")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<RatingResponseDto>> submitRating(
            @PathVariable UUID id,
            @Valid @RequestBody SubmitRatingRequestDto request,
            @AuthenticationPrincipal User currentUser) {

        RatingResponseDto response = ratingService.submitRating(
                id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Rating submitted successfully.", response));
    }

    // POST /api/v1/orders/{id}/skip-rate
    // Requester dismisses the rating prompt without rating.
    // They can still rate later from order history — this just clears the prompt.
    // No request body needed — just the order ID and who is calling.
    @PostMapping("/{id}/skip-rate")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<Void>> skipRating(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        ratingService.skipRating(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Rating skipped."));
    }

    // GET /api/v1/orders/{id}/rating
    // Returns the submitted rating for a specific order.
    // Used by frontend to display rating on order history page.
    @GetMapping("/{id}/rating")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<RatingResponseDto>> getRatingForOrder(
            @PathVariable UUID id) {

        RatingResponseDto response = ratingService.getRatingForOrder(id);
        return ResponseEntity.ok(ApiResponseDto.success("Rating loaded.", response));
    }
}