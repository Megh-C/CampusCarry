package com.campuscarry.dto.response;

import com.campuscarry.entity.enums.OrderSize;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

// Returned by GET /orders/estimate
// Frontend calls this in real time as student fills the order form
// so they can see the fee before placing the order
@Getter
@Setter
@Builder
public class FeeEstimateResponseDto {
    private UUID pickupLocationId;
    private String pickupLocationName;
    private String dropHostelBlock;
    private OrderSize size;
    private BigDecimal estimatedFee;
}