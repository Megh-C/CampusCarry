package com.campuscarry.service;

import com.campuscarry.common.OrderSpecification;
import com.campuscarry.common.UserSpecification;
import com.campuscarry.dto.request.AddLocationRequestDto;
import com.campuscarry.dto.request.UpdatePricingRequestDto;
import com.campuscarry.dto.request.UpdateUserStatusRequestDto;
import com.campuscarry.dto.response.*;
import com.campuscarry.entity.Location;
import com.campuscarry.entity.LocationClusterPricing;
import com.campuscarry.entity.Order;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.*;
import com.campuscarry.exception.ConflictException;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.payment.PaymentService;
import com.campuscarry.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final LocationRepository locationRepository;
    private final LocationClusterPricingRepository pricingRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;

    // ── User Management ──────────────────────────────────────────────

    /**
     * Called by: GET /admin/users
     * Returns paginated, searchable, filterable list of all users.
     * Sort options handled via Pageable — frontend passes sort=createdAt,desc etc.
     */
    public Page<AdminUserResponseDto> getAllUsers(String search, UserStatus status,
                                                  String gender, Integer year,
                                                  Pageable pageable) {
        return userRepository
                .findAll(UserSpecification.withFilters(search, status, gender, year), pageable)
                .map(this::mapToAdminUserDto);
    }

    /**
     * Called by: PATCH /admin/users/{id}/status
     * Admin can ACTIVATE, SUSPEND or BAN a user.
     * Cannot change status of another ADMIN — prevents accidental lockout.
     */
    @Transactional
    public AdminUserResponseDto updateUserStatus(UUID userId,
                                                 UpdateUserStatusRequestDto request) {
        //EDGE CASE WORKING
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        //EDGE CASE WORKING
        // Prevent admin from accidentally suspending another admin
        if (user.getRole() == Role.ADMIN) {
            throw new ConflictException("Cannot change status of an admin account.");
        }

        user.setStatus(request.getStatus());
        userRepository.save(user);

        return mapToAdminUserDto(user);
    }

    // ── Order Management ─────────────────────────────────────────────

    /**
     * Called by: GET /admin/orders
     * Full order list with search, filter by status/size/payment/date range.
     * Sort by createdAt asc/desc or deliveryFee via Pageable.
     */
    public Page<OrderResponseDto> getAllOrders(String search, OrderStatus status,
                                               OrderSize size, PaymentStatus paymentStatus,
                                               LocalDate from, LocalDate to,
                                               Pageable pageable) {
        LocalDateTime fromDt = from != null
                ? LocalDateTime.of(from, LocalTime.MIDNIGHT) : null;
        LocalDateTime toDt = to != null
                ? LocalDateTime.of(to, LocalTime.MAX) : null;

        return orderRepository
                .findAll(OrderSpecification.withFilters(
                        search, status, size, paymentStatus, fromDt, toDt), pageable)
                .map(order -> mapToOrderResponseDto(order));
    }

    /**
     * Called by: GET /admin/orders/{id}
     * Full order detail including payment trail for admin audit.
     */
    public OrderResponseDto getOrderById(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        return mapToOrderResponseDto(order);
    }

    /**
     * Called by: GET /admin/payments/failed
     * All orders where paymentStatus = FAILED — needs manual admin intervention.
     * Sorted by createdAt desc by default — override via Pageable.
     */
    public Page<OrderResponseDto> getFailedPaymentOrders(LocalDate from, LocalDate to,
                                                         Pageable pageable) {
        LocalDateTime fromDt = from != null
                ? LocalDateTime.of(from, LocalTime.MIDNIGHT) : null;
        LocalDateTime toDt = to != null
                ? LocalDateTime.of(to, LocalTime.MAX) : null;

        return orderRepository
                .findAll(OrderSpecification.withFilters(
                        null, null, null, PaymentStatus.FAILED, fromDt, toDt), pageable)
                .map(order -> mapToOrderResponseDto(order));
    }

    // ── Location Management ──────────────────────────────────────────

    /**
     * Called by: POST /admin/locations
     * Adds a new pickup location.
     * After adding, admin must add pricing rows for each cluster via PATCH /admin/pricing.
     */
    @Transactional
    public LocationResponseDto addLocation(AddLocationRequestDto request) {
        String code = request.getCode().toUpperCase().trim();

        if (locationRepository.existsByCode(code)) {
            throw new ConflictException("A location with this code already exists.");
        }

        Location location = Location.builder()
                .name(request.getName().trim())
                .code(code)
                .isActive(true)
                .build();

        locationRepository.save(location);

        return mapToLocationDto(location);
    }

    /**
     * Called by: PATCH /admin/locations/{id}/toggle
     * Toggles a location between active and inactive.
     * Inactive locations are hidden from the student order form.
     */
    @Transactional
    public LocationResponseDto toggleLocationStatus(UUID locationId) {
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found."));

        // Flip active status
        location.setActive(!location.isActive());
        locationRepository.save(location);

        return mapToLocationDto(location);
    }

    /**
     * Called by: GET /admin/locations
     * Returns ALL locations (active and inactive) for the admin panel.
     */
    public List<LocationResponseDto> getAllLocations() {
        return locationRepository.findAll()
                .stream()
                .map(this::mapToLocationDto)
                .collect(Collectors.toList());
    }

    /**
     * Called by: GET /admin/pricing
     * Returns the full pricing matrix — all location + cluster combinations.
     */
    public List<PricingResponseDto> getFullPricingMatrix() {
        return pricingRepository.findAllByOrderByLocationNameAscClusterAsc()
                .stream()
                .map(this::mapToPricingDto)
                .collect(Collectors.toList());
    }

    /**
     * Called by: PATCH /admin/pricing/{id}
     * Updates the base price for a specific location + cluster pair.
     * Only affects new orders — existing orders store a fee snapshot.
     */
    @Transactional
    public PricingResponseDto updatePricing(UUID pricingId, UpdatePricingRequestDto request) {
        LocationClusterPricing pricing = pricingRepository.findById(pricingId)
                .orElseThrow(() -> new ResourceNotFoundException("Pricing entry not found."));

        pricing.setBasePrice(request.getBasePrice());
        pricingRepository.save(pricing);

        return mapToPricingDto(pricing);
    }

    // ── Stats ────────────────────────────────────────────────────────

    /**
     * Called by: GET /admin/stats?from=2024-01-01&to=2024-01-31
     * Returns platform stats for the given date range.
     * Defaults to today if no range provided.
     */
    public AdminStatsResponseDto getStats(LocalDate from, LocalDate to) {
        // Default to today if no range provided
        LocalDate effectiveFrom = from != null ? from : LocalDate.now();
        LocalDate effectiveTo   = to   != null ? to   : LocalDate.now();

        LocalDateTime fromDt = LocalDateTime.of(effectiveFrom, LocalTime.MIDNIGHT);
        LocalDateTime toDt   = LocalDateTime.of(effectiveTo, LocalTime.MAX);

        return AdminStatsResponseDto.builder()
                .from(effectiveFrom)
                .to(effectiveTo)
                // User stats — global counts, not date-filtered
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countByStatus(UserStatus.ACTIVE))
                .suspendedUsers(userRepository.countByStatus(UserStatus.SUSPENDED))
                .bannedUsers(userRepository.countByStatus(UserStatus.BANNED))
                // Order stats — date range filtered
                .totalOrders(
                        orderRepository.countByStatusAndDateRange(OrderStatus.PENDING, fromDt, toDt) +
                                orderRepository.countByStatusAndDateRange(OrderStatus.ACCEPTED, fromDt, toDt) +
                                orderRepository.countByStatusAndDateRange(OrderStatus.DELIVERED, fromDt, toDt) +
                                orderRepository.countByStatusAndDateRange(OrderStatus.EXPIRED, fromDt, toDt) +
                                orderRepository.countByStatusAndDateRange(OrderStatus.UNPAID, fromDt, toDt))
                .pendingOrders(
                        orderRepository.countByStatusAndDateRange(OrderStatus.PENDING, fromDt, toDt))
                .acceptedOrders(
                        orderRepository.countByStatusAndDateRange(OrderStatus.ACCEPTED, fromDt, toDt))
                .deliveredOrders(
                        orderRepository.countByStatusAndDateRange(OrderStatus.DELIVERED, fromDt, toDt))
                .expiredOrders(
                        orderRepository.countByStatusAndDateRange(OrderStatus.EXPIRED, fromDt, toDt))
                // Revenue — sum of fees on delivered orders in range
                .totalRevenue(
                        orderRepository.sumDeliveryFeeByDateRange(fromDt, toDt))
                // Failed payments — global count, not date-filtered
                .failedPayments(
                        orderRepository.countByPaymentStatus(PaymentStatus.FAILED))
                .build();
    }

    // ── Private Mappers ──────────────────────────────────────────────

    private AdminUserResponseDto mapToAdminUserDto(User user) {
        return AdminUserResponseDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .gender(user.getGender())
                .year(user.getYear())
                .hostelBlock(user.getHostelBlock())
                .upiId(user.getUpiId())
                .role(user.getRole())
                .status(user.getStatus())
                .rating(user.getRating())
                .totalDeliveries(user.getTotalDeliveries())
                .isOnDelivery(user.isOnDelivery())
                .activeSmall(user.getActiveSmall())
                .activeMedium(user.getActiveMedium())
                .activeLarge(user.getActiveLarge())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private OrderResponseDto mapToOrderResponseDto(Order order) {
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
                .requesterPhone(isAcceptedOrDelivered
                        ? order.getRequester().getPhone() : null)
                .delivererId(order.getDeliverer() != null
                        ? order.getDeliverer().getId() : null)
                .delivererName(order.getDeliverer() != null
                        ? order.getDeliverer().getFullName() : null)
                .delivererPhone(isAcceptedOrDelivered && order.getDeliverer() != null
                        ? order.getDeliverer().getPhone() : null)
                .paymentStatus(order.getPaymentStatus())
                .createdAt(order.getCreatedAt())
                .expiresAt(order.getExpiresAt())
                .acceptedAt(order.getAcceptedAt())
                .deliveredAt(order.getDeliveredAt())
                .isRated(order.isRated())
                .isRatingSkipped(order.isRatingSkipped())
                .build();
    }

    private LocationResponseDto mapToLocationDto(Location location) {
        return LocationResponseDto.builder()
                .id(location.getId())
                .name(location.getName())
                .code(location.getCode())
                .active(location.isActive())
                .build();
    }

    private PricingResponseDto mapToPricingDto(LocationClusterPricing pricing) {
        return PricingResponseDto.builder()
                .id(pricing.getId())
                .locationId(pricing.getLocation().getId())
                .locationName(pricing.getLocation().getName())
                .cluster(pricing.getCluster())
                .basePrice(pricing.getBasePrice())
                .build();
    }
}