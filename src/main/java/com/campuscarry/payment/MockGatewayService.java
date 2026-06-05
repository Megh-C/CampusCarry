package com.campuscarry.payment;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Mock payment gateway service.
 *
 * This is the ONLY class that needs to change when real Razorpay is integrated.
 * All payment logic in PaymentService calls this — keeping the rest of the
 * codebase completely gateway-agnostic.
 *
 * When integrating real Razorpay:
 *   1. Replace this class with RazorpayGatewayService
 *   2. Inject RazorpayClient here using keys from application.properties
 *   3. Nothing else in the codebase changes
 *
 * Mock behavior:
 *   - collectPayment  → always returns a fake reference, never fails
 *   - sendPayout      → always returns a fake reference, never fails
 */
@Service
public class MockGatewayService {

    /**
     * Simulates collecting payment from the requester.
     * In real Razorpay: creates a Razorpay Order and returns the order ID.
     * Frontend would use this ID to open the Razorpay payment modal.
     *
     * @param amount    Fee to collect
     * @param userEmail Requester's email for Razorpay customer record
     * @return          Mock gateway reference ID
     */
    public String collectPayment(BigDecimal amount, String userEmail) {
        // Real implementation: RazorpayClient.orders.create(...)
        // Returns Razorpay order ID e.g. "order_ABC123"
        return "mock_collection_" + System.currentTimeMillis();
    }

    /**
     * Simulates sending payout to the deliverer's UPI ID.
     * In real Razorpay X: calls Razorpay Payouts API with deliverer's UPI ID.
     *
     * @param upiId     Deliverer's UPI ID e.g. "name@upi"
     * @param amount    Fee to pay out
     * @return          Mock gateway reference ID
     */
    public String sendPayout(String upiId, BigDecimal amount) {
        // Real implementation: RazorpayClient.payouts.create(...)
        // Returns Razorpay payout ID e.g. "pout_XYZ789"
        return "mock_payout_" + System.currentTimeMillis();
    }
}