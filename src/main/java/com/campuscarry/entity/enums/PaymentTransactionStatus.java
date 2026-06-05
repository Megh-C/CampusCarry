package com.campuscarry.entity.enums;

public enum PaymentTransactionStatus {
    // Payment attempt initiated but not yet confirmed
    PENDING,
    // Payment attempt succeeded
    SUCCESS,
    // Payment attempt failed — check attemptCount for retry eligibility
    FAILED
}