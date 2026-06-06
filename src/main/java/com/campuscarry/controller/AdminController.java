package com.campuscarry.controller;

import com.campuscarry.dto.request.AddLocationRequestDto;
import com.campuscarry.dto.request.UpdatePricingRequestDto;
import com.campuscarry.dto.request.UpdateUserStatusRequestDto;
import com.campuscarry.dto.response.*;
import com.campuscarry.entity.enums.*;
import com.campuscarry.dto.response.ApiResponseDto;
import com.campuscarry.repository.PaymentRepository;
import com.campuscarry.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// All endpoints in this controller require ADMIN role
// Enforced at class level — no need to repeat @PreAuthorize on each method
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;


    // ── User Management ──────────────────────────────────────────────

    //WORKING CHECKED WITHOUT QUERY PARAMS
    // GET /api/v1/admin/users?search=john&status=ACTIVE&gender=MALE&year=2&page=0&size=10&sort=createdAt,desc
    // Search and filter all users. Sort options: createdAt, totalDeliveries, rating
    @GetMapping("/users")
    public ResponseEntity<ApiResponseDto<Page<AdminUserResponseDto>>> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<AdminUserResponseDto> users = adminService.getAllUsers(
                search, status, gender, year, pageable);
        return ResponseEntity.ok(ApiResponseDto.success("Users loaded", users));
    }

    //THIS ENDPOINT IS WORKING
    // PATCH /api/v1/admin/users/{id}/status
    // Update a student's account status — ACTIVE, SUSPENDED, BANNED
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponseDto<AdminUserResponseDto>> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequestDto request) {

        AdminUserResponseDto response = adminService.updateUserStatus(id, request);
        return ResponseEntity.ok(ApiResponseDto.success("User status updated.", response));
    }

    // ── Order Management ─────────────────────────────────────────────

    //CHECKED WITHOUT THE QUERY PARAM ITS WORKING
    // GET /api/v1/admin/orders?search=42&status=DELIVERED&size=LARGE&from=2024-01-01&to=2024-01-31
    // Full order list with search + filter. Sort by createdAt or deliveryFee.
    @GetMapping("/orders")
    public ResponseEntity<ApiResponseDto<Page<OrderResponseDto>>> getAllOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) OrderSize size,
            @RequestParam(required = false) PaymentStatus paymentStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, pageSize, sort);

        Page<OrderResponseDto> orders = adminService.getAllOrders(
                search, status, size, paymentStatus, from, to, pageable);
        return ResponseEntity.ok(ApiResponseDto.success("Orders loaded", orders));
    }

    //WORKING PROPERLY
    // GET /api/v1/admin/orders/{id}
    // Full detail of a single order including both party details and payment status
    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> getOrderById(
            @PathVariable UUID id) {

        OrderResponseDto response = adminService.getOrderById(id);
        return ResponseEntity.ok(ApiResponseDto.success("Order loaded", response));
    }

    // GET /api/v1/admin/payments/failed?from=&to=&page=0&size=10
    // All orders with paymentStatus=FAILED — needs manual admin intervention
    @GetMapping("/payments/failed")
    public ResponseEntity<ApiResponseDto<Page<OrderResponseDto>>> getFailedPayments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<OrderResponseDto> orders = adminService.getFailedPaymentOrders(from, to, pageable);
        return ResponseEntity.ok(ApiResponseDto.success("Failed payments loaded", orders));
    }

    // ── Location Management ──────────────────────────────────────────

    //WORKING
    // POST /api/v1/admin/locations
    // Add a new pickup location. After adding, set pricing via PATCH /admin/pricing/{id}
    @PostMapping("/locations")
    public ResponseEntity<ApiResponseDto<LocationResponseDto>> addLocation(
            @Valid @RequestBody AddLocationRequestDto request) {

        LocationResponseDto response = adminService.addLocation(request);
        return ResponseEntity.ok(ApiResponseDto.success("Location added successfully.", response));
    }

    //WORKING
    // PATCH /api/v1/admin/locations/{id}/toggle
    // Toggle a location active/inactive. Inactive = hidden from student order form.
    @PatchMapping("/locations/{id}/toggle")
    public ResponseEntity<ApiResponseDto<LocationResponseDto>> toggleLocation(
            @PathVariable UUID id) {

        LocationResponseDto response = adminService.toggleLocationStatus(id);
        return ResponseEntity.ok(ApiResponseDto.success("Location status toggled.", response));
    }

    // ── Pricing Management ───────────────────────────────────────────

    //WORKING
    // GET /api/v1/admin/pricing
    // Full pricing matrix — all location + cluster combinations
    @GetMapping("/pricing")
    public ResponseEntity<ApiResponseDto<List<PricingResponseDto>>> getFullPricingMatrix() {
        List<PricingResponseDto> pricing = adminService.getFullPricingMatrix();
        return ResponseEntity.ok(ApiResponseDto.success("Pricing matrix loaded", pricing));
    }

    //WORKING PROPERLY THE ID HERE IS THE ID OF THE PAIR FORM THE DB TABLE
    // PATCH /api/v1/admin/pricing/{id}
    // Update base price for a specific location + cluster pair
    // Only affects new orders — existing orders keep their fee snapshot
    @PatchMapping("/pricing/{id}")
    public ResponseEntity<ApiResponseDto<PricingResponseDto>> updatePricing(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePricingRequestDto request) {

        PricingResponseDto response = adminService.updatePricing(id, request);
        return ResponseEntity.ok(ApiResponseDto.success("Pricing updated successfully.", response));
    }

    // ── Stats ────────────────────────────────────────────────────────

    // GET /api/v1/admin/stats?from=2024-01-01&to=2024-01-31
    // Platform stats for a date range. Defaults to today if no range provided.
    @GetMapping("/stats")
    public ResponseEntity<ApiResponseDto<AdminStatsResponseDto>> getStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        AdminStatsResponseDto stats = adminService.getStats(from, to);
        return ResponseEntity.ok(ApiResponseDto.success("Stats loaded", stats));
    }
}