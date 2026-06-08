package com.campuscarry.payment;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Mock payment gateway — swap with RazorpayGatewayService when KYC is ready.
 * collectPayment and sendPayout are the only two operations needed.
 * No refund method — payment is only taken after acceptance so no refunds on expiry.
 */
@Service
public class MockGatewayService {

    // Simulates collecting fee from requester after deliverer accepts
    public String collectPayment(BigDecimal amount, String userEmail) {
        return "mock_collection_" + System.currentTimeMillis();
    }

    // Simulates paying out fee to deliverer's UPI after delivery confirmed
    public String sendPayout(String upiId, BigDecimal amount) {
        return "mock_payout_" + System.currentTimeMillis();
    }
}