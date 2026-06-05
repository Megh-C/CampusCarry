package com.campuscarry.controller;

import com.campuscarry.dto.response.FeeEstimateResponseDto;
import com.campuscarry.dto.response.LocationResponseDto;
import com.campuscarry.dto.response.ApiResponseDto;
import com.campuscarry.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    // GET /api/v1/locations
    // Returns all active pickup locations for the order form dropdown.
    // Any authenticated student can call this.
    @GetMapping("/locations")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<List<LocationResponseDto>>> getActiveLocations() {
        List<LocationResponseDto> locations = locationService.getActiveLocations();
        return ResponseEntity.ok(ApiResponseDto.success("Locations loaded", locations));
    }

    // GET /api/v1/orders/estimate?pickupLocationId=&dropHostelBlock=A_MH&size=SMALL
    // Returns fee estimate in real time as student fills the order form.
    // Frontend calls this on every change to location, block, or size dropdowns.
    @GetMapping("/orders/estimate")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponseDto<FeeEstimateResponseDto>> getEstimate(
            @RequestParam UUID pickupLocationId,
            @RequestParam String dropHostelBlock,
            @RequestParam String size) {

        FeeEstimateResponseDto estimate = locationService.getEstimate(
                pickupLocationId, dropHostelBlock, size);
        return ResponseEntity.ok(ApiResponseDto.success("Fee estimated", estimate));
    }
}