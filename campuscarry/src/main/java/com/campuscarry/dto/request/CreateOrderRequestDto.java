package com.campuscarry.dto.request;

import com.campuscarry.entity.enums.OrderSize;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateOrderRequestDto {

    // The campus pickup spot where the item needs to be collected from
    @NotNull(message = "Pickup location is required")
    private UUID pickupLocationId;

    // Optional description e.g. "Chicken biryani - Order #5 at Zaitoon"
    // Helps deliverer identify the order at the restaurant
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    // Size affects delivery fee and deliverer capacity limits
    @NotNull(message = "Order size is required")
    private OrderSize size;

    // Format: A_MH (mens hostel) or A_LH (ladies hostel)
    // Cluster is derived at service layer from this value — not stored separately
    @NotBlank(message = "Drop hostel block is required")
    @Pattern(
            regexp = "^[A-Za-z]{1,2}_(MH|LH)$",
            message = "Hostel block must be in format A_MH or A_LH"
    )
    private String dropHostelBlock;
}