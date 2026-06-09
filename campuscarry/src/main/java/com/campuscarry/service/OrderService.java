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
import com.campuscarry.repository.LocationRepository;
import com.campuscarry.repository.OrderRepository;
import com.campuscarry.repository.RatingRepository;
import com.campuscarry.repository.UserRepository;
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
    private final LocationRepository locationRepository;
    private final RatingRepository ratingRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final PricingService pricingService;
    private final PaymentService paymentService;
    private final OrderWebSocketService webSocketService;

    // ── Create Order ─────────────────────────────────────────────────
    // POST /orders
    // No payment taken here — payment happens when deliverer accepts.
    // After saving → broadcast new order to all connected deliverers via WebSocket.

    @Transactional
    public OrderResponseDto createOrder(CreateOrderRequestDto request, UUID requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        if (requester.isOnDelivery()) {
            throw new BadRequestException(
                    "You cannot place an order while you are on an active delivery.");
        }

        BigDecimal deliveryFee = pricingService.calculateFee(
                request.getPickupLocationId(),
                request.getDropHostelBlock(),
                request.getSize().name()
        );

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
                // Order expires 10 minutes from now — scheduler marks EXPIRED if still PENDING
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        orderRepository.save(order);

        // Broadcast new order to all connected deliverers
        // Frontend receives this and adds the card to the live feed instantly
        webSocketService.broadcastNewOrder(mapToFeedItem(order));

        return mapToOrderResponse(order, requesterId);
    }

    // ── Accept Order ─────────────────────────────────────────────────
    // POST /orders/{id}/accept
    // Payment initiated here — requester has 5 mins to complete payment.
    // After accepting → broadcast order removal so it disappears from all feeds.

    @Transactional
    public OrderResponseDto acceptOrder(UUID orderId, UUID delivererId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        // Only PENDING orders can be accepted
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BadRequestException("This order is no longer available.");
        }

        // Requester cannot deliver their own order
        if (order.getRequester().getId().equals(delivererId)) {
            throw new ForbiddenException("You cannot deliver your own order.");
        }

        User deliverer = userRepository.findById(delivererId)
                .orElseThrow(() -> new ResourceNotFoundException("Deliverer not found."));

        // Check capacity using canAcceptOrder() defined on User entity
        if (!deliverer.canAcceptOrder(order.getSize().name())) {
            throw new BadRequestException(
                    "You do not have capacity to accept a " + order.getSize().name() +
                            " order. Complete your current deliveries first.");
        }

        // Generate 6-digit OTP — emailed to requester, verified at handoff
        String rawOtp = generateOtp();
        String hashedOtp = passwordEncoder.encode(rawOtp);

        order.setDeliverer(deliverer);
        order.setStatus(OrderStatus.ACCEPTED);
        order.setAcceptedAt(LocalDateTime.now());
        order.setOtp(hashedOtp);
        // OTP valid for 5 hours from acceptance
        order.setOtpExpiresAt(LocalDateTime.now().plusHours(5));
        // Payment window — requester has 5 mins from acceptance to pay
        order.setPaymentDeadline(LocalDateTime.now().plusMinutes(5));
        orderRepository.save(order);

        // Update deliverer's active delivery counts
        updateDelivererCountsOnAccept(deliverer, order.getSize().name());
        userRepository.save(deliverer);

        // Initiate payment collection from requester
        // Mocked — marks HELD immediately
        // Real: generates Razorpay order, frontend opens UPI payment modal
        paymentService.initiateCollection(order, order.getRequester());

        // Email OTP to requester — they share this with deliverer at handoff
        emailService.sendOrderOtpEmail(
                order.getRequester().getEmail(),
                order.getRequester().getFullName(),
                rawOtp,
                order.getOrderNumber(),
                deliverer.getFullName()
        );

        // Broadcast removal — order disappears from all connected deliverers' feeds
        webSocketService.broadcastOrderRemoved(order.getId());

        return mapToOrderResponse(order, delivererId);
    }

    // ── Notify Arrival ───────────────────────────────────────────────
    // POST /orders/{id}/notify
    // Deliverer presses "I'm Here" — no email.
    // Broadcasts WebSocket event so orderer's UI updates in real time.
    // Phone numbers already visible since order is ACCEPTED.

    // Called by GET /orders/feed for initial page load
    // After this WebSocket pushes live updates
    public Page<OrderFeedItemDto> getOrderFeed(UUID pickupLocationId, Pageable pageable) {
        Page<Order> page = (pickupLocationId != null)
                ? orderRepository.findByStatusAndPickupLocationIdOrderByCreatedAtDesc(
                        OrderStatus.PENDING, pickupLocationId, pageable)
                : orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.PENDING, pageable);
        return page.map(this::mapToFeedItem);
    }

    @Transactional
    public OrderResponseDto notifyArrival(UUID orderId, UUID delivererId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        if (!order.getDeliverer().getId().equals(delivererId)) {
            throw new ForbiddenException("You are not the deliverer for this order.");
        }

        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new BadRequestException("Order is not in an active delivery state.");
        }

        webSocketService.broadcastOrderArrived(orderId);
        return mapToOrderResponse(order, delivererId);
    }

    // ── Confirm Delivery ─────────────────────────────────────────────
    // POST /orders/{id}/deliver
    // OTP validated → mark DELIVERED → trigger payout to deliverer.
    // No WebSocket event — order was already removed from feed at acceptance.

    @Transactional
    public OrderResponseDto confirmDelivery(UUID orderId, DeliverOrderRequestDto request,
                                            UUID delivererId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        if (!order.getDeliverer().getId().equals(delivererId)) {
            throw new ForbiddenException("You are not the deliverer for this order.");
        }

        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new BadRequestException("Order is not in an active delivery state.");
        }

        if (!order.isOtpValid()) {
            throw new BadRequestException(
                    "OTP has expired. Please contact support to resolve this delivery.");
        }

        if (!passwordEncoder.matches(request.getOtp(), order.getOtp())) {
            throw new BadRequestException("Invalid OTP. Please try again.");
        }

        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        orderRepository.save(order);

        User deliverer = order.getDeliverer();
        updateDelivererCountsOnDeliver(deliverer, order.getSize().name());
        deliverer.setTotalDeliveries(deliverer.getTotalDeliveries() + 1);
        userRepository.save(deliverer);

        // Trigger automatic payout — retried up to 3 times by PaymentRetryScheduler if fails
        paymentService.initiatePayout(order, deliverer);

        return mapToOrderResponse(order, delivererId);
    }

    // ── My Orders ────────────────────────────────────────────────────
    // GET /orders/me?role=requester|deliverer

    public Page<OrderResponseDto> getMyOrders(UUID userId, String role, Pageable pageable) {
        Page<Order> orders;
        if ("deliverer".equalsIgnoreCase(role)) {
            orders = orderRepository.findByDelivererIdOrderByCreatedAtDesc(userId, pageable);
        } else {
            orders = orderRepository.findByRequesterIdOrderByCreatedAtDesc(userId, pageable);
        }
        return orders.map(order -> mapToOrderResponse(order, userId));
    }

    // ── Get Single Order ─────────────────────────────────────────────
    // GET /orders/{id}

    public OrderResponseDto getOrderById(UUID orderId, UUID viewerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        return mapToOrderResponse(order, viewerId);
    }

    // ── Retry Expired / Unpaid Order ─────────────────────────────────
    // POST /orders/{id}/retry
    // Copies an expired or unpaid order into a new order — no refilling form.
    // Recalculates fee in case pricing changed since original order.

    @Transactional
    public OrderResponseDto retryOrder(UUID expiredOrderId, UUID requesterId) {
        Order expired = orderRepository.findById(expiredOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));

        if (!expired.getRequester().getId().equals(requesterId)) {
            throw new ForbiddenException("You can only retry your own orders.");
        }

        if (expired.getStatus() != OrderStatus.EXPIRED &&
                expired.getStatus() != OrderStatus.UNPAID) {
            throw new BadRequestException("Only expired or unpaid orders can be retried.");
        }

        // Recalculate fee — pricing may have changed since original order
        BigDecimal newFee = pricingService.calculateFee(
                expired.getPickupLocationId(),
                expired.getDropHostelBlock(),
                expired.getSize().name()
        );

        // New order — fresh ID, fresh expiry, copied details
        Order newOrder = Order.builder()
                .orderNumber(generateOrderNumber())
                .requester(expired.getRequester())
                .pickupLocationId(expired.getPickupLocationId())
                .description(expired.getDescription())
                .size(expired.getSize())
                .dropHostelBlock(expired.getDropHostelBlock())
                .deliveryFee(newFee)
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();

        orderRepository.save(newOrder);

        // Broadcast retried order to feed
        webSocketService.broadcastNewOrder(mapToFeedItem(newOrder));

        return mapToOrderResponse(newOrder, requesterId);
    }

    // ── Private Helpers ──────────────────────────────────────────────

    private void updateDelivererCountsOnAccept(User deliverer, String size) {
        switch (size.toUpperCase()) {
            case "SMALL"  -> deliverer.setActiveSmall(deliverer.getActiveSmall() + 1);
            case "MEDIUM" -> deliverer.setActiveMedium(deliverer.getActiveMedium() + 1);
            case "LARGE"  -> deliverer.setActiveLarge(deliverer.getActiveLarge() + 1);
        }
        deliverer.setOnDelivery(true);
    }

    private void updateDelivererCountsOnDeliver(User deliverer, String size) {
        switch (size.toUpperCase()) {
            case "SMALL"  -> deliverer.setActiveSmall(Math.max(0, deliverer.getActiveSmall() - 1));
            case "MEDIUM" -> deliverer.setActiveMedium(Math.max(0, deliverer.getActiveMedium() - 1));
            case "LARGE"  -> deliverer.setActiveLarge(Math.max(0, deliverer.getActiveLarge() - 1));
        }
        if (deliverer.getActiveSmall() == 0 &&
                deliverer.getActiveMedium() == 0 &&
                deliverer.getActiveLarge() == 0) {
            deliverer.setOnDelivery(false);
        }
    }

    private int generateOrderNumber() {
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        return orderRepository.findMaxOrderNumberSince(startOfDay)
                .map(max -> max + 1)
                .orElse(1);
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        return String.valueOf(100000 + random.nextInt(900000));
    }

    private OrderResponseDto mapToOrderResponse(Order order, UUID viewerId) {
        boolean isAcceptedOrDelivered = order.getStatus() == OrderStatus.ACCEPTED ||
                order.getStatus() == OrderStatus.DELIVERED;

        String locationName = locationRepository.findById(order.getPickupLocationId())
                .map(loc -> loc.getName())
                .orElse(null);

        return OrderResponseDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .size(order.getSize())
                .status(order.getStatus())
                .description(order.getDescription())
                .dropHostelBlock(order.getDropHostelBlock())
                .deliveryFee(order.getDeliveryFee())
                .pickupLocationId(order.getPickupLocationId())
                .pickupLocationName(locationName)
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
                // Rating flags — frontend uses these to show/hide rating prompt
                .isRated(order.isRated())
                .isRatingSkipped(order.isRatingSkipped())
                .ratingStars(order.isRated()
                        ? ratingRepository.findByOrderId(order.getId())
                                .map(r -> r.getStars())
                                .orElse(null)
                        : null)
                .build();
    }

    // Public so OrderExpiryScheduler can use it for WebSocket broadcasts
    public OrderFeedItemDto mapToFeedItem(Order order) {
        String locationName = locationRepository.findById(order.getPickupLocationId())
                .map(loc -> loc.getName())
                .orElse(null);
        return OrderFeedItemDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .size(order.getSize())
                .description(order.getDescription())
                .pickupLocationName(locationName)
                .dropHostelBlock(order.getDropHostelBlock())
                .deliveryFee(order.getDeliveryFee())
                .requesterName(order.getRequester().getFullName())
                .expiresAt(order.getExpiresAt())
                .createdAt(order.getCreatedAt())
                .build();
    }
}