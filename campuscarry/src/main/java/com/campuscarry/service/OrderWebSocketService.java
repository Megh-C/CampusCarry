package com.campuscarry.service;

import com.campuscarry.dto.response.OrderFeedItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Broadcasts order events to all connected WebSocket clients.
 *
 * Called from:
 *   OrderService.createOrder()      → broadcasts new order to feed
 *   OrderService.acceptOrder()      → broadcasts order removal (no longer PENDING)
 *   OrderExpiryScheduler            → broadcasts expired order removals
 *
 * Frontend subscribes to:
 *   /topic/orders/new     → receives OrderFeedItemDto, adds card to feed
 *   /topic/orders/removed → receives order UUID string, removes card from feed
 *
 * SimpMessagingTemplate is Spring's WebSocket message sender.
 * It serializes the payload to JSON automatically.
 */
@Service
@RequiredArgsConstructor
public class OrderWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a new PENDING order to all connected deliverers.
     * Called immediately after order is saved in createOrder().
     * Frontend receives this and adds the order card to the live feed.
     */
    public void broadcastNewOrder(OrderFeedItemDto order) {
        messagingTemplate.convertAndSend("/topic/orders/new", order);
    }

    /**
     * Broadcast an order removal to all connected deliverers.
     * Called when an order is accepted, expired, or marked unpaid.
     * Frontend receives the UUID and removes that card from the feed.
     */
    public void broadcastOrderRemoved(UUID orderId) {
        messagingTemplate.convertAndSend("/topic/orders/removed", orderId.toString());
    }
}