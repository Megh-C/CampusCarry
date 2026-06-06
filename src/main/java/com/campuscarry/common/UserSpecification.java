package com.campuscarry.common;

import com.campuscarry.entity.User;
import com.campuscarry.entity.enums.UserStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds dynamic JPA queries for admin user filtering.
 * Only adds a WHERE clause for params that are actually provided.
 * If no params provided — returns all users with no filtering.
 */
public class UserSpecification {

    public static Specification<User> withFilters(String search,
                                                  UserStatus status,
                                                  String gender,
                                                  Integer year) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(root.get("phone"), "%" + search + "%")
                ));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (gender != null && !gender.isBlank()) {
                predicates.add(cb.equal(
                        cb.lower(root.get("gender").as(String.class)),
                        gender.toLowerCase()));
            }

            if (year != null) {
                predicates.add(cb.equal(root.get("year"), year));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}