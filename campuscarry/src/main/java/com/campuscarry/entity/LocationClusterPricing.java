package com.campuscarry.entity;

import com.campuscarry.entity.enums.HostelCluster;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Stores the base delivery price for a specific (Location, HostelCluster) pair.
 *
 * This is the pricing matrix:
 *   rows    = pickup locations (e.g. SJT, Main Gate)
 *   columns = hostel clusters  (e.g. C1, C2 ... C12)
 *
 * Final delivery fee = basePrice (from this table) + sizeSurcharge
 * Size surcharge: SMALL=0, MEDIUM=7, LARGE=15
 *
 * Admin can update any cell via PATCH /admin/pricing/{id}
 * All changes take effect on new orders only — existing orders store a fee snapshot.
 */
@Entity
@Table(
        name = "location_cluster_pricing",
        // Composite unique constraint — one price per location+cluster pair
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_location_cluster",
                        columnNames = {"location_id", "cluster"}
                )
        },
        indexes = {
                @Index(name = "idx_pricing_location_cluster",
                        columnList = "location_id, cluster")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationClusterPricing extends BaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // The pickup location this price applies to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    // The destination hostel cluster this price applies to
    @Enumerated(EnumType.STRING)
    @Column(name = "cluster", nullable = false, length = 10)
    private HostelCluster cluster;

    // Base delivery price for this location → cluster route
    // Final fee = basePrice + sizeSurcharge
    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;
}