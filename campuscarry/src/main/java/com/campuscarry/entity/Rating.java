package com.campuscarry.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

/**
 * Stores a rating given by the requester to the deliverer after a completed order.
 *
 * One Rating per Order — enforced by the unique constraint on order_id.
 * Rater  = requester (the one who placed the order)
 * Ratee  = deliverer (the one who delivered it)
 *
 * In v2 this can be extended to two-way rating (deliverer rates requester too).
 */
@Entity
@Table(
        name = "ratings",
        indexes = {
                // Fast lookup of all ratings received by a deliverer
                @Index(name = "idx_rating_ratee_id", columnList = "ratee_id"),
                // Fast lookup of all ratings given by a requester
                @Index(name = "idx_rating_rater_id", columnList = "rater_id")
        },
        uniqueConstraints = {
                // One rating per order — cannot rate the same delivery twice
                @UniqueConstraint(name = "uq_rating_order_id", columnNames = "order_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rating extends BaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    // ── Order Reference ──────────────────────────────────────────────

    // The order this rating is for — one rating per order maximum
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // ── Parties ──────────────────────────────────────────────────────

    // The student who gave the rating (requester)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rater_id", nullable = false)
    private User rater;

    // The student who received the rating (deliverer)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ratee_id", nullable = false)
    private User ratee;

    // ── Rating Content ───────────────────────────────────────────────

    // 1 to 5 stars
    @Column(name = "stars", nullable = false)
    private Integer stars;

    // Optional written feedback e.g. "Very fast delivery, thanks!"
    @Column(name = "description", length = 500)
    private String description;
}