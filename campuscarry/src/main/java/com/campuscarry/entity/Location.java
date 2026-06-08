package com.campuscarry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location extends BaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // Display name shown to students in the order form dropdown
    // e.g. "Main Gate / 1-A Gate", "One Food World", "SJT"
    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    // Short code used internally and for display e.g. "MAIN_GATE", "OFW"
    // Must be unique — used as a stable identifier if name ever changes
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    // Admin can deactivate a location (e.g. restaurant closed permanently)
    // Inactive locations are hidden from the order form dropdown
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;
}