package com.financialapp.banking.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecordEntity, String> {

    Optional<IdempotencyRecordEntity> findByIdempotencyKey(String idempotencyKey);
}
