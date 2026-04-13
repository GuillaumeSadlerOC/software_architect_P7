package com.ycyw.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration with the STOMP protocol.
 *
 * Architecture :
 * - Connection endpoint : /ws/chat
 * - Incoming messages (client → server): prefix /app
 * - Outgoing messages (server → client): prefix /topic (broadcast) and /queue (individual)
 *
 * In production, the simple broker would be replaced by an external broker
 * to support multi-instance clustering.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefix for messages sent to subscribers
        registry.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages sent by the client to @MessageMapping
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket — SockJS as a fallback for browser compatibility
        registry.addEndpoint("/ws/chat")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
