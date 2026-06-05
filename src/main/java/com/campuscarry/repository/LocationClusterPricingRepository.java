package com.campuscarry.repository;

import com.campuscarry.entity.LocationClusterPricing;
import com.campuscarry.entity.enums.HostelCluster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LocationClusterPricingRepository extends JpaRepository<LocationClusterPricing, UUID> {

    // Core fee lookup — finds price for a specific location + cluster combination
    Optional<LocationClusterPricing> findByLocationIdAndCluster(
            UUID locationId, HostelCluster cluster);

    // All pricing rows for a location — used by admin pricing management page
    List<LocationClusterPricing> findByLocationIdOrderByClusterAsc(UUID locationId);

    // All pricing rows — used by admin to view full matrix
    List<LocationClusterPricing> findAllByOrderByLocationNameAscClusterAsc();
}