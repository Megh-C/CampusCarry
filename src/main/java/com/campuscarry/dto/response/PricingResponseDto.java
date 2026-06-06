package com.campuscarry.dto.response;

import com.campuscarry.entity.enums.HostelCluster;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
public class PricingResponseDto {
    private UUID id;
    private UUID locationId;
    private String locationName;
    private HostelCluster cluster;
    private BigDecimal basePrice;
}