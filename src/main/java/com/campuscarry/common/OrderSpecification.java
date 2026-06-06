package com.campuscarry.common;

import com.campuscarry.entity.Order;
import com.campuscarry.entity.enums.OrderSize;
import com.campuscarry.entity.enums.OrderStatus;
import com.campuscarry.entity.enums.PaymentStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds dynamic JPA queries for admin order filtering.
 * Only adds conditions for params that are actually provided.
 * If no params provided — returns all orders with no filtering.
 */
public class OrderSpecification {

    public static Specification<Order> withFilters(String search,
                                                   OrderStatus status,
                                                   OrderSize size,
                                                   PaymentStatus paymentStatus,
                                                   LocalDateTime from,
                                                   LocalDateTime to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                predicates.add(cb.or(
                        cb.like(root.get("orderNumber").as(String.class),
                                "%" + search + "%"),
                        cb.like(cb.lower(root.get("description")),
                                "%" + search.toLowerCase() + "%")
                ));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (size != null) {
                predicates.add(cb.equal(root.get("size"), size));
            }

            if (paymentStatus != null) {
                predicates.add(cb.equal(root.get("paymentStatus"), paymentStatus));
            }

            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }

            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}