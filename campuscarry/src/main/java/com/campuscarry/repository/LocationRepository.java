package com.campuscarry.repository;

import com.campuscarry.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LocationRepository extends JpaRepository<Location, UUID> {

    // Only active locations shown to students in the order form dropdown
    List<Location> findByIsActiveTrueOrderByNameAsc();

    // Used by admin and seeder to check existence before inserting
    boolean existsByCode(String code);

    Optional<Location> findByCode(String code);
}