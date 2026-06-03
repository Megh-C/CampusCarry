package com.campuscarry.entity;


import com.campuscarry.entity.enums.Gender;
import com.campuscarry.entity.enums.Role;
import com.campuscarry.entity.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;


@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_user_email", columnList = "email"),
                @Index(name = "idx_user_status", columnList = "status"),
                @Index(name = "idx_user_hostel_block", columnList = "hostel_block")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity{

    //this is the id
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    //identity and auth-------------------------------------------------
    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    //Profile--------------------------------------------------------------

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone", nullable = false, unique = true, length = 15)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    private Gender gender;

    @Column(name = "year", nullable = false)
    private Integer year;

    // Stores the block letter only (A, B, C ...).
    // Full block name is derived as: hostelBlock + gender (e.g. A + MALE = A MH, A + FEMALE = A LH)
    //in front end give options A,B,C,D
    @Column(name = "hostel_block", nullable = false, length = 5)
    private String hostelBlock;



    //role --------------------------------------------------------------------
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status;

    //Delivery Reputation--------------------------------------------------------------------

    // Null until the student completes their first delivery
    @Column(name = "rating", precision = 3)
    private Double rating;

    @Column(name = "total_deliveries", nullable = false)
    @Builder.Default
    private Integer totalDeliveries = 0;

    //active delivery tracking-------------------------------------------------------------
    // True if the student has at least one accepted, in-progress delivery
    @Column(name = "is_on_delivery", nullable = false)
    @Builder.Default
    private boolean isOnDelivery = false;

    // Rules enforced at service layer before accepting an order:
    // LARGE  → activeLarge == 0 AND activeMedium == 0 AND activeSmall == 0 (exclusive)
    // MEDIUM → activeMedium < 2 AND activeLarge == 0
    // SMALL  → activeSmall < 3  AND activeLarge == 0 AND activeMedium == 0

    @Column(name = "active_small", nullable = false)
    @Builder.Default
    private Integer activeSmall = 0;

    @Column(name = "active_medium", nullable = false)
    @Builder.Default
    private Integer activeMedium = 0;

    @Column(name = "active_large", nullable = false)
    @Builder.Default
    private Integer activeLarge = 0;

    /**
     * Returns the full hostel block display name.
     * e.g. hostelBlock="A", gender=MALE  → "A MH"
     *      hostelBlock="D", gender=FEMALE → "D WH"
     */
    public String getFullHostelBlock() {
        if (gender == Gender.FEMALE) {
            return hostelBlock + " LH";
        } else if (gender == Gender.MALE) {
            return hostelBlock + " MH";
        }
        return hostelBlock;
    }

    public boolean canAcceptOrder(String orderSize) {
        return switch (orderSize.toUpperCase()) {
            case "LARGE" ->
                    activeLarge == 0 && activeMedium == 0 && activeSmall == 0;
            case "MEDIUM" ->
                    activeLarge == 0 && (activeMedium < 2 || (activeMedium == 0 && activeSmall < 2));
            case "SMALL" ->
                    activeLarge == 0 && (activeSmall < 3 || (activeMedium == 1 && activeSmall == 0));
            default -> false;
        };
    }

}
