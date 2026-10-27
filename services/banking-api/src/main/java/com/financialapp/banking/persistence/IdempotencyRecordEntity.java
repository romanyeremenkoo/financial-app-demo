package com.financialapp.banking.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * Stored result of a transfer executed under a given idempotency key. The unique
 * constraint on {@code idempotency_key} lets concurrent requests with the same
 * key resolve to a single transfer.
 */
@Entity
@Table(name = "idempotency_record")
public class IdempotencyRecordEntity {

    @Id
    @Column(name = "idempotency_key", nullable = false, updatable = false)
    private String idempotencyKey;

    @Column(nullable = false, updatable = false)
    private String fingerprint;

    @Column(name = "transfer_id", nullable = false, updatable = false)
    private String transferId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected IdempotencyRecordEntity() {
    }

    public IdempotencyRecordEntity(String idempotencyKey, String fingerprint, String transferId,
                                   OffsetDateTime createdAt) {
        this.idempotencyKey = idempotencyKey;
        this.fingerprint = fingerprint;
        this.transferId = transferId;
        this.createdAt = createdAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getFingerprint() {
        return fingerprint;
    }

    public String getTransferId() {
        return transferId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
