package com.ycyw.chat.repository;

import com.ycyw.chat.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Spring Data JPA repository for chat messages.
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
}
