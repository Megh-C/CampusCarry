package com.campuscarry.service;

import com.campuscarry.dto.response.FeeEstimateResponseDto;
import com.campuscarry.dto.response.LocationResponseDto;
import com.campuscarry.entity.Location;
import com.campuscarry.entity.enums.OrderSize;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final PricingService pricingService;

    /**
     * Returns all active pickup locations for the order form dropdown.
     * Called by: GET /locations
     */
    public List<LocationResponseDto> getActiveLocations() {
        return locationRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Calculates and returns a fee estimate before order is placed.
     * Called by: GET /orders/estimate?pickupLocationId=&dropHostelBlock=&size=
     * Frontend calls this in real time as student fills the order form.
     */
    public FeeEstimateResponseDto getEstimate(UUID pickupLocationId,
                                              String dropHostelBlock,
                                              String size) {

        Location location = locationRepository.findById(pickupLocationId)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found."));

        BigDecimal fee = pricingService.calculateFee(
                pickupLocationId, dropHostelBlock, size);

        return FeeEstimateResponseDto.builder()
                .pickupLocationId(pickupLocationId)
                .pickupLocationName(location.getName())
                .dropHostelBlock(dropHostelBlock.toUpperCase())
                .size(OrderSize.valueOf(size.toUpperCase()))
                .estimatedFee(fee)
                .build();
    }

    private LocationResponseDto mapToDto(Location location) {
        return LocationResponseDto.builder()
                .id(location.getId())
                .name(location.getName())
                .code(location.getCode())
                .build();
    }
}