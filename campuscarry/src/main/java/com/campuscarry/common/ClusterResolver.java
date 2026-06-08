package com.campuscarry.common;

import com.campuscarry.entity.enums.HostelCluster;
import com.campuscarry.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Resolves a hostel block string (e.g. "A_MH", "G_LH") to its HostelCluster.
 * Called by PricingService when calculating delivery fee for an order.
 *
 * Block format: {LETTER}_{SUFFIX}
 *   SUFFIX = MH (mens hostel) or LH (ladies hostel)
 *
 * This map is the single source of truth for cluster assignments.
 * Admin can request changes here — one line change per reassignment.
 */
@Component
public class ClusterResolver {

    // Maps every valid hostel block to its cluster
    private static final Map<String, HostelCluster> BLOCK_TO_CLUSTER = Map.ofEntries(
            // ── Mens Hostel ──────────────────────────────────────────
            Map.entry("A_MH", HostelCluster.C1),
            Map.entry("B_MH", HostelCluster.C1),
            Map.entry("C_MH", HostelCluster.C1),

            Map.entry("D_MH", HostelCluster.C2),
            Map.entry("E_MH", HostelCluster.C2),

            Map.entry("F_MH", HostelCluster.C3),
            Map.entry("G_MH", HostelCluster.C3),

            Map.entry("H_MH", HostelCluster.C4),
            Map.entry("J_MH", HostelCluster.C4),

            Map.entry("K_MH", HostelCluster.C5),
            Map.entry("L_MH", HostelCluster.C5),

            Map.entry("M_MH", HostelCluster.C6),

            Map.entry("N_MH", HostelCluster.C7),
            Map.entry("P_MH", HostelCluster.C7),
            Map.entry("Q_MH", HostelCluster.C7),
            Map.entry("R_MH", HostelCluster.C7),

            Map.entry("S_MH", HostelCluster.C8),
            Map.entry("T_MH", HostelCluster.C8),

            // ── Ladies Hostel ────────────────────────────────────────
            Map.entry("G_LH", HostelCluster.C9),
            Map.entry("J_LH", HostelCluster.C9),
            Map.entry("H_LH", HostelCluster.C9),

            Map.entry("A_LH", HostelCluster.C10),
            Map.entry("B_LH", HostelCluster.C10),

            Map.entry("C_LH", HostelCluster.C11),
            Map.entry("D_LH", HostelCluster.C11),

            Map.entry("E_LH", HostelCluster.C12),
            Map.entry("F_LH", HostelCluster.C12)
    );

    /**
     * Resolves block string to HostelCluster.
     * Input is normalized to uppercase before lookup.
     * Throws BadRequestException if block is not recognized.
     */
    public HostelCluster resolve(String hostelBlock) {
        String normalized = hostelBlock.toUpperCase().trim();
        HostelCluster cluster = BLOCK_TO_CLUSTER.get(normalized);
        if (cluster == null) {
            throw new BadRequestException(
                    "Invalid hostel block: " + hostelBlock +
                            ". Expected format: A_MH or A_LH");
        }
        return cluster;
    }
}