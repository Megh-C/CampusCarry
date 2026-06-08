package com.campuscarry.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminStatsResponseDto {

    // Date range these stats cover
    private LocalDate from;
    private LocalDate to;

    // User stats
    private long totalUsers;
    private long activeUsers;
    private long suspendedUsers;
    private long bannedUsers;

    // Order stats
    private long totalOrders;
    private long pendingOrders;
    private long acceptedOrders;
    private long deliveredOrders;
    private long expiredOrders;

    // Revenue stats
    // Total delivery fees collected across all DELIVERED orders in the range
    private BigDecimal totalRevenue;

    // Payment health
    // Orders where payment failed after 3 retries — needs manual attention
    private long failedPayments;
}