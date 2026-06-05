package com.campuscarry.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

// Returned to frontend for populating the pickup location dropdown
@Getter
@Setter
@Builder
public class LocationResponseDto {
    private UUID id;
    private String name;
    private String code;
}