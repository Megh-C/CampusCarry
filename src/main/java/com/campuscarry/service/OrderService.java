package com.campuscarry.service;

import com.campuscarry.dto.request.CreateOrderRequestDto;
import com.campuscarry.dto.request.DeliverOrderRequestDto;
import com.campuscarry.dto.response.OrderFeedItemDto;
import com.campuscarry.dto.response.OrderResponseDto;
import com.campuscarry.entity.Order;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.entity.enums.PaymentStatus;
import com.campuscarry.exception.BadRequestException;
import com.campuscarry.exception.ForbiddenException;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.payment.PaymentService;
import com.campuscarry.repository.OrderRepository;
import com.campuscarry.repository.UserRepository;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final PricingService pricingService;
    private final PaymentService paymentService;

    // ── Create Order ─────────────────────────────────────────────────
    // Called by: POST /orders
    // Flow: validate requester → calculate fee → generate order number → save → mock payment hold

    @Transactional
    public OrderResponseDto createOrder(CreateOrderRequestDto request, UUID requesterId) {

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        // A student cannot place an order if they are currently on a delivery
        // This prevents conflict of interest and keeps the system clean
        if (requester.isOnDelivery()) {
            throw new BadRequestException(
                    "You cannot place an order while you are on an active delivery.");
        }

        // Calculate delivery fee based on pickup location + drop hostel block
        // For now returns a placeholder fee
        BigDecimal deliveryFee = calculateDeliveryFee(
                request.getPickupLocationId(),
                request.getDropHostelBlock(),
                request.getSize().name()
        );

        // Generate daily order number (1, 2, 3... resets each day)
        int orderNumber = generateOrderNumber();

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .requester(requester)
                .pickupLocationId(request.getPickupLocationId())
                .description(request.getDescription())
                .size(request.getSize())
                .dropHostelBlock(request.getDropHostelBlock().toUpperCase())
                .deliveryFee(deliveryFee)
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING)
                // Order expires 10 minutes from now - scheduler will mark it EXPIRED if still PENDING
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        orderRepository.save(order);



        return mapToOrderResponse(order, requesterId);
    }

    // ── Get Order Feed ───────────────────────────────────────────────
    // Called by: GET /orders/feed
    // Returns paginated list of PENDING orders for the deliverer to browse.
    // Optional filter by pickupLocationId if deliverer is already at a spot.

    public Page<OrderFeedItemDto> getOrderFeed(UUID pickupLocationId, Pageable pageable) {
        Page<Order> orders;

        if (pickupLocationId != null) {
            // Filtered feed - deliverer wants orders only from a specific location
            orders = orderRepository.findByStatusAndPickupLocationIdOrderByCreatedAtDesc(
                    OrderStatus.PENDING, pickupLocationId, pageable);
        } else {
            // Full feed - all pending orders
            orders = orderRepository.findByStatusOrderByCreatedAtDesc(
                    OrderStatus.PENDING, pageable);
        }

        return orders.map(this::mapToFeedItem);
    }

    // ── Accept Order ─────────────────────────────────────────────────
    // Called by: POST /orders/{id}/accept
    // Flow: validate deliverer capacity → assign deliverer → generate OTP →
    //       email OTP to requester → update deliverer's active counts

    @Transactional
    public OrderResponseDto acceptOrder(UUID orderId, UUID delivererId) {

        //TESTED AND THIS EDGE CASE IS WORKING
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        //EDGE CASE WORKING HAVE TO CHANGE THE CRON JOB LOGIC
        // Only PENDING orders can be accepted
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("This order is no longer available.");
        }

        //THIS EDGE CASE ALSO WORKING
        // Requester cannot deliver their own order
        if (order.getRequester().getId().equals(delivererId)) {
            throw new ForbiddenException("You cannot deliver your own order.");
        }

        //CANT CHECK THIS WONT GENERALLY HAPPEN JUST A SANITY CHECK -> DELIVERER IS COMING FROM AUTH NOT REQUEST BODY
        User deliverer = userRepository.findById(delivererId)
                .orElseThrow(() -> new ResourceNotFoundException("Deliverer not found."));


        // THIS IS ALSO WORKING BUT CHECK THE FUNCTION LOGIC ONCE WHEN CAN AND CANT ACCEPT
        // Uses canAcceptOrder() defined on User entity
        if (!deliverer.canAcceptOrder(order.getSize().name())) {
            throw new BadRequestException(
                    "You do not have capacity to accept a " + order.getSize().name() +
                            " order. Complete your current deliveries first.");
        }

        // Generate 6-digit OTP and store hashed
        // This OTP will be emailed to requester and verified at handoff
        String rawOtp = generateOtp();
        String hashedOtp = passwordEncoder.encode(rawOtp);

        // Assign deliverer and update order state
        order.setDeliverer(deliverer);
        order.setStatus(OrderStatus.ACCEPTED);
        order.setAcceptedAt(LocalDateTime.now());
        order.setOtp(hashedOtp);
        // OTP valid for 5 hours from now
        order.setOtpExpiresAt(LocalDateTime.now().plusHours(5));
        // Payment window — requester has 5 mins from acceptance to complete payment
        order.setPaymentDeadline(LocalDateTime.now().plusMinutes(1));
        orderRepository.save(order);

        // Update deliverer's active delivery counts on the User entity
        // These counts are used by canAcceptOrder() to enforce capacity limits
        updateDelivererCountsOnAccept(deliverer, order.getSize().name());
        userRepository.save(deliverer);

        // Email OTP to requester so they have it ready for handoff
        emailService.sendOrderOtpEmail(
                order.getRequester().getEmail(),
                order.getRequester().getFullName(),
                rawOtp,
                order.getOrderNumber(),
                deliverer.getFullName()
        );

        // Initiate payment collection from requester
        // Mock for now — real Razorpay call when gateway is integrated
        paymentService.initiateCollection(order, order.getRequester());

        return mapToOrderResponse(order, delivererId);
    }

    // ── Notify Arrival ───────────────────────────────────────────────
    // Called by: POST /orders/{id}/notify
    // Deliverer presses "I'm here" button.
    // Sends email to requester with deliverer's phone number.
    // Returns both phone numbers to the frontend for display.

    @Transactional
    public OrderResponseDto notifyArrival(UUID orderId, UUID delivererId) {

        //EDGE CASE WORKING CHECKED
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        // Only the assigned deliverer can press notify
        if (!order.getDeliverer().getId().equals(delivererId)) {
            throw new ForbiddenException("You are not the deliverer for this order.");
        }

        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new BadRequestException("Order is not in an active delivery state.");
        }

        // Response includes both phone numbers since order is ACCEPTED
        // mapToOrderResponse handles the phone reveal logic
        return mapToOrderResponse(order, delivererId);
    }

    // ── Confirm Delivery ─────────────────────────────────────────────
    // Called by: POST /orders/{id}/deliver
    // Flow: validate OTP → mark DELIVERED → release payment to deliverer →
    //       decrement deliverer's active counts → increment totalDeliveries

    @Transactional
    public OrderResponseDto confirmDelivery(UUID orderId, DeliverOrderRequestDto request,
                                            UUID delivererId) {

        //EDGE CASE WORKING
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        //EDGE CASE WORKING
        // Only the assigned deliverer can confirm delivery
        if (!order.getDeliverer().getId().equals(delivererId)) {
            throw new ForbiddenException("You are not the deliverer for this order.");
        }

        //EDGE CASE WORKING
        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new BadRequestException("Order is not in an active delivery state.");
        }

        // Validate OTP expiry window
        if (!order.isOtpValid()) {
            throw new BadRequestException(
                    "OTP has expired. Please contact support to resolve this delivery.");
        }

        //EDGE CASE WORKING
        // Validate OTP value against stored hash
        if (!passwordEncoder.matches(request.getOtp(), order.getOtp())) {
            throw new BadRequestException("Invalid OTP. Please try again.");
        }

        // Mark order as delivered
        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        orderRepository.save(order);

        // Decrement deliverer's active counts and flip isOnDelivery if all done
        User deliverer = order.getDeliverer();
        updateDelivererCountsOnDeliver(deliverer, order.getSize().name());
        deliverer.setTotalDeliveries(deliverer.getTotalDeliveries() + 1);
        userRepository.save(deliverer);

        /// Trigger automatic payout to deliverer's UPI ID
        // Retried up to 3 times by PaymentRetryScheduler if it fails
        paymentService.initiatePayout(order, deliverer);

        return mapToOrderResponse(order, delivererId);
    }

    // ── My Orders ────────────────────────────────────────────────────
    // Called by: GET /me/orders?role=requester|deliverer
    // Returns paginated order history for the logged-in student

    public Page<OrderResponseDto> getMyOrders(UUID userId, String role, Pageable pageable) {
        Page<Order> orders;

        if ("deliverer".equalsIgnoreCase(role)) {
            orders = orderRepository.findByDelivererIdOrderByCreatedAtDesc(userId, pageable);
        } else {
            // Default: orders placed by the student as requester
            orders = orderRepository.findByRequesterIdOrderByCreatedAtDesc(userId, pageable);
        }

        return orders.map(order -> mapToOrderResponse(order, userId));
    }

    // ── Private Helpers ──────────────────────────────────────────────

    // Increments active size count and flips isOnDelivery flag when deliverer accepts
    private void updateDelivererCountsOnAccept(User deliverer, String size) {
        switch (size.toUpperCase()) {
            case "SMALL"  -> deliverer.setActiveSmall(deliverer.getActiveSmall() + 1);
            case "MEDIUM" -> deliverer.setActiveMedium(deliverer.getActiveMedium() + 1);
            case "LARGE"  -> deliverer.setActiveLarge(deliverer.getActiveLarge() + 1);
        }
        deliverer.setOnDelivery(true);
    }

    // Decrements active size count and flips isOnDelivery to false when all deliveries done
    private void updateDelivererCountsOnDeliver(User deliverer, String size) {
        switch (size.toUpperCase()) {
            case "SMALL"  -> deliverer.setActiveSmall(Math.max(0, deliverer.getActiveSmall() - 1));
            case "MEDIUM" -> deliverer.setActiveMedium(Math.max(0, deliverer.getActiveMedium() - 1));
            case "LARGE"  -> deliverer.setActiveLarge(Math.max(0, deliverer.getActiveLarge() - 1));
        }
        // Flip isOnDelivery to false only when all active counts are zero
        if (deliverer.getActiveSmall() == 0 &&
                deliverer.getActiveMedium() == 0 &&
                deliverer.getActiveLarge() == 0) {
            deliverer.setOnDelivery(false);
        }
    }

    // Generates daily order number by finding the max order number for today and adding 1
    private int generateOrderNumber() {
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        return orderRepository.findMaxOrderNumberSince(startOfDay)
                .map(max -> max + 1)
                .orElse(1);  // First order of the day
    }

    // Fee calculation placeholder - will be replaced with LocationClusterPricing lookup
    // Formula: baseFeeBySize + distanceSurchargeByCluster
    // Calculates delivery fee using the real LocationClusterPricing matrix
// Formula: basePrice (location × cluster) + sizeSurcharge (SMALL=0, MEDIUM=7, LARGE=15)
    private BigDecimal calculateDeliveryFee(UUID pickupLocationId,
                                            String dropHostelBlock,
                                            String size) {
        return pricingService.calculateFee(pickupLocationId, dropHostelBlock, size);
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        return String.valueOf(100000 + random.nextInt(900000));
    }

    // Maps Order entity to full response DTO.
    // Phone numbers are ONLY included if order is ACCEPTED or DELIVERED.
    // This is the contact reveal logic - before acceptance, numbers are hidden.
    private OrderResponseDto mapToOrderResponse(Order order, UUID viewerId) {
        boolean isAcceptedOrDelivered = order.getStatus() == OrderStatus.ACCEPTED ||
                order.getStatus() == OrderStatus.DELIVERED;

        return OrderResponseDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .size(order.getSize())
                .status(order.getStatus())
                .description(order.getDescription())
                .dropHostelBlock(order.getDropHostelBlock())
                .deliveryFee(order.getDeliveryFee())
                .pickupLocationId(order.getPickupLocationId())
                .requesterId(order.getRequester().getId())
                .requesterName(order.getRequester().getFullName())
                // Phone numbers revealed only after order is accepted
                .requesterPhone(isAcceptedOrDelivered ? order.getRequester().getPhone() : null)
                .delivererId(order.getDeliverer() != null ? order.getDeliverer().getId() : null)
                .delivererName(order.getDeliverer() != null ? order.getDeliverer().getFullName() : null)
                .delivererPhone(isAcceptedOrDelivered && order.getDeliverer() != null
                        ? order.getDeliverer().getPhone() : null)
                .paymentStatus(order.getPaymentStatus())
                .createdAt(order.getCreatedAt())
                .expiresAt(order.getExpiresAt())
                .acceptedAt(order.getAcceptedAt())
                .deliveredAt(order.getDeliveredAt())
                .build();
    }

    // Lightweight mapping for the feed - no phone numbers, no payment details
    private OrderFeedItemDto mapToFeedItem(Order order) {
        return OrderFeedItemDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .size(order.getSize())
                .description(order.getDescription())
                .dropHostelBlock(order.getDropHostelBlock())
                .deliveryFee(order.getDeliveryFee())
                .requesterName(order.getRequester().getFullName())
                .expiresAt(order.getExpiresAt())
                .createdAt(order.getCreatedAt())
                .build();
    }
}