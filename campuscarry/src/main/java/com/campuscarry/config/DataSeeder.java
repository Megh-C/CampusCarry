package com.campuscarry.config;

import com.campuscarry.entity.Location;
import com.campuscarry.entity.LocationClusterPricing;
import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.Gender;
import com.campuscarry.entity.enums.HostelCluster;
import com.campuscarry.entity.enums.Role;
import com.campuscarry.entity.enums.UserStatus;
import com.campuscarry.repository.LocationClusterPricingRepository;
import com.campuscarry.repository.LocationRepository;
import com.campuscarry.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Runs once on application startup.
 * Seeds the 6 pickup locations and the full 12×6 pricing matrix
 * if they don't already exist in the DB.
 *
 * Safe to run on every restart — existsByCode() guards against duplicates.
 * Admin can update prices via PATCH /admin/pricing/{id} after seeding.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final LocationRepository locationRepository;
    private final LocationClusterPricingRepository pricingRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;


    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedLocations();
        seedPricingMatrix();
        seedAdminUser();;
        System.out.println("[DataSeeder] Locations and pricing matrix ready.");
    }

    // ── Seed Locations ───────────────────────────────────────────────

    private void seedLocations() {
        // Each location: display name + internal code
        Map<String, String> locations = Map.of(
                "MAIN_GATE",    "Main Gate / 1-A Gate",
                "OFW",          "One Food World",
                "DARLING",      "Darling Food Court / All Mart Gate",
                "KC_FC",        "KC/FC",
                "SJT",          "SJT",
                "ENZO",         "Enzo / JustBake"
        );

        locations.forEach((code, name) -> {
            if (!locationRepository.existsByCode(code)) {
                locationRepository.save(Location.builder()
                        .name(name)
                        .code(code)
                        .isActive(true)
                        .build());
            }
        });
    }

    // ── Seed Pricing Matrix ──────────────────────────────────────────

    /**
     * Full 12×6 pricing matrix.
     * Rows = clusters (C1–C12), Columns = locations (in order):
     *   MAIN_GATE, OFW, DARLING, KC_FC, SJT, ENZO
     *
     * C9–C12 (ladies hostel) all use C4 pricing as instructed.
     * Admin can update individual cells via /admin/pricing/{id}.
     */
    private void seedPricingMatrix() {

        // Fetch all locations by code for FK reference
        // If locations weren't seeded yet this would fail — seedLocations() runs first
        var mainGate = locationRepository.findByCode("MAIN_GATE").orElseThrow();
        var ofw      = locationRepository.findByCode("OFW").orElseThrow();
        var darling  = locationRepository.findByCode("DARLING").orElseThrow();
        var kcFc     = locationRepository.findByCode("KC_FC").orElseThrow();
        var sjt      = locationRepository.findByCode("SJT").orElseThrow();
        var enzo     = locationRepository.findByCode("ENZO").orElseThrow();

        // Pricing data: cluster → [MAIN_GATE, OFW, DARLING, KC_FC, SJT, ENZO]
        Map<HostelCluster, int[]> matrix = Map.ofEntries(
                Map.entry(HostelCluster.C1,  new int[]{60, 15, 60, 40, 80, 25}),
                Map.entry(HostelCluster.C2,  new int[]{60, 25, 60, 40, 60, 15}),
                Map.entry(HostelCluster.C3,  new int[]{60, 25, 60, 25, 60, 15}),
                Map.entry(HostelCluster.C4,  new int[]{40, 15, 60, 25, 40, 15}),
                Map.entry(HostelCluster.C5,  new int[]{60, 40, 60, 40, 25, 25}),
                Map.entry(HostelCluster.C6,  new int[]{80, 40, 80, 40, 15, 40}),
                Map.entry(HostelCluster.C7,  new int[]{80, 60, 80, 60, 15, 60}),
                Map.entry(HostelCluster.C8,  new int[]{80, 60, 80, 60, 15, 60}),
                // C9–C12 use same pricing as C4 for now
                Map.entry(HostelCluster.C9,  new int[]{40, 15, 60, 25, 40, 15}),
                Map.entry(HostelCluster.C10, new int[]{40, 15, 60, 25, 40, 15}),
                Map.entry(HostelCluster.C11, new int[]{40, 15, 60, 25, 40, 15}),
                Map.entry(HostelCluster.C12, new int[]{40, 15, 60, 25, 40, 15})
        );

        var locationOrder = new com.campuscarry.entity.Location[]{
                mainGate, ofw, darling, kcFc, sjt, enzo
        };

        matrix.forEach((cluster, prices) -> {
            for (int i = 0; i < locationOrder.length; i++) {
                Location loc = locationOrder[i];
                // Only insert if this cluster+location pair doesn't exist yet
                boolean exists = pricingRepository
                        .findByLocationIdAndCluster(loc.getId(), cluster)
                        .isPresent();
                if (!exists) {
                    pricingRepository.save(LocationClusterPricing.builder()
                            .location(loc)
                            .cluster(cluster)
                            .basePrice(new BigDecimal(prices[i]))
                            .build());
                }
            }
        });
    }

    private void seedAdminUser() {
        String adminEmail = "admin@campuscarry.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            userRepository.save(User.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode("Admin@1234"))
                    .fullName("CampusCarry Admin")
                    .phone("9999999999")
                    .gender(Gender.MALE)
                    .year(1)
                    .hostelBlock("A_MH")
                    .role(Role.ADMIN)
                    .status(UserStatus.ACTIVE)
                    .totalDeliveries(0)
                    .activeSmall(0)
                    .activeMedium(0)
                    .activeLarge(0)
                    .isOnDelivery(false)
                    .build());
            System.out.println("[DataSeeder] Admin user created — admin@campuscarry.com / Admin@1234");
        }
    }
}