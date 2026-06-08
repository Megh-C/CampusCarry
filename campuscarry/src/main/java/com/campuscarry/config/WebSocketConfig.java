    package com.campuscarry.config;

    import org.springframework.context.annotation.Configuration;
    import org.springframework.messaging.simp.config.MessageBrokerRegistry;
    import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
    import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
    import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

    /**
     * WebSocket configuration using STOMP protocol.
     *
     * STOMP (Simple Text Oriented Messaging Protocol) is a messaging protocol
     * that runs on top of WebSocket. It gives us topics, subscriptions and
     * message routing out of the box without writing raw WebSocket handlers.
     *
     * SockJS is a fallback — if WebSocket is not supported by the browser or
     * blocked by a proxy, SockJS falls back to HTTP long-polling automatically.
     *
     * Topic structure:
     *   /topic/orders/new     → new PENDING order broadcast to all connected students
     *   /topic/orders/removed → order removed from feed (accepted / expired / unpaid)
     *
     * Frontend connects to: ws://localhost:8080/ws
     * or with SockJS:       http://localhost:8080/ws
     */
    @Configuration
    @EnableWebSocketMessageBroker
    public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

        @Override
        public void configureMessageBroker(MessageBrokerRegistry registry) {
            // Enable simple in-memory message broker for /topic destinations
            // In production this can be replaced with a full RabbitMQ/ActiveMQ broker
            registry.enableSimpleBroker("/topic");

            // Prefix for messages FROM client TO server (not used for feed — feed is server→client only)
            registry.setApplicationDestinationPrefixes("/app");
        }

        @Override
        public void registerStompEndpoints(StompEndpointRegistry registry) {
            // WebSocket handshake endpoint
            // Frontend connects here to establish the WebSocket connection
            registry.addEndpoint("/ws")
                    // Allow all origins for development — restrict to your domain in production
                    .setAllowedOriginPatterns("*")
                    // SockJS fallback for browsers/proxies that don't support WebSocket
                    .withSockJS();
        }
    }