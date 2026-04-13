package com.ycyw.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Application entry point — PoC Chat Your Car Your Way.
 *
 * This proof of concept validates the target architecture :
 * - Spring Boot (backend API + WebSocket)
 * - PostgreSQL (session and message persistence)
 * - Real-time communication via STOMP over WebSocket
 */
@SpringBootApplication
public class ChatApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatApplication.class, args);
    }
}
