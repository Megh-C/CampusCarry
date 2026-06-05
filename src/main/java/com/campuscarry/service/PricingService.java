package com.campuscarry.service;

import com.campuscarry.common.ClusterResolver;
import com.campuscarry.entity.enums.HostelCluster;
import com.campuscarry.exception.ResourceNotFoundException;
import com.campuscarry.repository.LocationClusterPricingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PricingService {

    private final LocationClusterPricingRepository pricingRepository;
    private final ClusterResolver clusterResolver;

    // Size surcharge constants — added on top of the base cluster/location price
    // SMALL = 0 (no surcharge), MEDIUM = 7, LARGE = 15
    private static final BigDecimal SURCHARGE_SMALL  = BigDecimal.ZERO;
    private static final BigDecimal SURCHARGE_MEDIUM = new BigDecimal("7");
    private static final BigDecimal SURCHARGE_LARGE  = new BigDecimal("15");

    /**
     * Calculates the total delivery fee for an order.
     *
     * Formula: basePrice (from LocationClusterPricing matrix) + sizeSurcharge
     *
     * Called from:
     *   - OrderService.createOrder()    → fee stored as snapshot on the Order
     *   - OrderController.getEstimate() → fee previewed before order is placed
     *
     * @param pickupLocationId UUID of the pickup location (e.g. SJT)
     * @param dropHostelBlock  Full block string e.g. "A_MH" or "G_LH"
     * @param size             Order size string: "SMALL", "MEDIUM", "LARGE"
     * @return                 Total delivery fee as BigDecimal
     */
    public BigDecimal calculateFee(UUID pickupLocationId,
                                   String dropHostelBlock,
                                   String size) {

        // Step 1: Resolve block string → cluster enum
        // e.g. "A_MH" → C1, "G_LH" → C9
        HostelCluster cluster = clusterResolver.resolve(dropHostelBlock);

        // Step 2: Look up base price from the pricing matrix
        BigDecimal basePrice = pricingRepository
                .findByLocationIdAndCluster(pickupLocationId, cluster)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Pricing not configured for this location and hostel block. " +
                                "Please contact admin."))
                .getBasePrice();

        // Step 3: Add size surcharge
        BigDecimal surcharge = switch (size.toUpperCase()) {
            case "MEDIUM" -> SURCHARGE_MEDIUM;
            case "LARGE"  -> SURCHARGE_LARGE;
            default       -> SURCHARGE_SMALL;  // SMALL = 0
        };

        return basePrice.add(surcharge);
    }
}