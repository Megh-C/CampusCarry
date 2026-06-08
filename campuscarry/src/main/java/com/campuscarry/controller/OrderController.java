package com.campuscarry.controller;

import com.campuscarry.dto.request.CreateOrderRequestDto;
import com.campuscarry.dto.request.DeliverOrderRequestDto;
import com.campuscarry.dto.response.OrderFeedItemDto;
import com.campuscarry.dto.response.OrderResponseDto;
import com.campuscarry.entity.User;
import com.campuscarry.dto.response.ApiResponseDto;
import com.campuscarry.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // POST /api/v1/orders
    // Places a new delivery order. Only ACTIVE students can do this.
    // @AuthenticationPrincipal pulls the logged-in User from the JWT SecurityContext
    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> createOrder(
            @Valid @RequestBody CreateOrderRequestDto request,
            @AuthenticationPrincipal User currentUser) {

        OrderResponseDto response = orderService.createOrder(request, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Order placed successfully", response));
    }

    // GET /api/v1/orders/feed?page=0&size=10&pickupLocationId=xxx
    // Public feed of all PENDING orders for deliverers to browse.
    // Optional filter by pickupLocationId if deliverer is at a specific spot.
    @GetMapping("/feed")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<Page<OrderFeedItemDto>>> getOrderFeed(
            @RequestParam(required = false) UUID pickupLocationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<OrderFeedItemDto> feed = orderService.getOrderFeed(pickupLocationId, pageable);
        return ResponseEntity.ok(ApiResponseDto.success("Feed loaded", feed));
    }

    // POST /api/v1/orders/{id}/accept
    // Deliverer accepts a PENDING order. First student to hit this wins (exclusive).
    // Triggers OTP email to the requester.
    @PostMapping("/{id}/accept")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> acceptOrder(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        OrderResponseDto response = orderService.acceptOrder(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Order accepted. OTP sent to requester.", response));
    }

    // POST /api/v1/orders/{id}/notify
    // Deliverer presses "I'm here" button on arrival at hostel block.
    // Sends arrival email to requester and reveals both phone numbers.
    @PostMapping("/{id}/notify")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> notifyArrival(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        OrderResponseDto response = orderService.notifyArrival(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Arrival confirmed. Show the OTP prompt to the requester.", response));
    }

    // POST /api/v1/orders/{id}/deliver
    // Deliverer submits OTP received from requester at handoff.
    // Validates OTP → marks DELIVERED → triggers payout to deliverer.
    @PostMapping("/{id}/deliver")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> confirmDelivery(
            @PathVariable UUID id,
            @Valid @RequestBody DeliverOrderRequestDto request,
            @AuthenticationPrincipal User currentUser) {

        OrderResponseDto response = orderService.confirmDelivery(id, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Delivery confirmed successfully.", response));
    }

    // GET /api/v1/me/orders?role=requester&page=0&size=10
    // Returns the logged-in student's order history.
    // role=requester → orders they placed
    // role=deliverer → orders they delivered
    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<Page<OrderResponseDto>>> getMyOrders(
            @RequestParam(defaultValue = "requester") String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal User currentUser) {

        Pageable pageable = PageRequest.of(page, size);
        Page<OrderResponseDto> orders = orderService.getMyOrders(
                currentUser.getId(), role, pageable);
        return ResponseEntity.ok(ApiResponseDto.success("Orders loaded", orders));
    }

    // GET /api/v1/orders/{id}
    // Get full details of a single order
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> getOrderById(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        OrderResponseDto response = orderService.getOrderById(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success("Order loaded", response));
    }

    // POST /api/v1/orders/{id}/retry
    // Copies an expired or unpaid order into a new order
    // Requester does not need to refill the form
    @PostMapping("/{id}/retry")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> retryOrder(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser) {

        OrderResponseDto response = orderService.retryOrder(id, currentUser.getId());
        return ResponseEntity.ok(ApiResponseDto.success(
                "Order retried successfully.", response));
    }
}

