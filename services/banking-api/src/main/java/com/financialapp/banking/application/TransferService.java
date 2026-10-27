package com.financialapp.banking.application;

import com.financialapp.banking.api.dto.CreateTransferRequest;
import com.financialapp.banking.domain.Currency;
import com.financialapp.banking.domain.ErrorCode;
import com.financialapp.banking.domain.IdempotencyKeyRequiredException;
import com.financialapp.banking.domain.ResourceNotFoundException;
import com.financialapp.banking.persistence.TransferEntity;
import com.financialapp.banking.persistence.TransferRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class TransferService {

    private final TransferExecutor executor;
    private final TransferRepository transferRepository;

    public TransferService(TransferExecutor executor, TransferRepository transferRepository) {
        this.executor = executor;
        this.transferRepository = transferRepository;
    }

    public record TransferResult(TransferEntity transfer, boolean replayed) {
    }

    /**
     * Orchestrates a transfer with idempotency. Intentionally not transactional:
     * execution runs in its own transaction so a unique-key race can be caught
     * and resolved by re-reading the committed record.
     */
    public TransferResult createTransfer(String idempotencyKey, CreateTransferRequest request) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IdempotencyKeyRequiredException();
        }

        String fingerprint = fingerprint(request);

        TransferResult replay = executor.tryReplay(idempotencyKey, fingerprint);
        if (replay != null) {
            return replay;
        }

        try {
            return executor.execute(idempotencyKey, fingerprint, request);
        } catch (DataIntegrityViolationException race) {
            TransferResult resolved = executor.tryReplay(idempotencyKey, fingerprint);
            if (resolved != null) {
                return resolved;
            }
            throw race;
        }
    }

    @Transactional(readOnly = true)
    public TransferEntity getTransfer(String transferId) {
        return transferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TRANSFER_NOT_FOUND,
                        "The requested transfer could not be found."));
    }

    private String fingerprint(CreateTransferRequest request) {
        Long amountMinor = request.amount() == null ? null : request.amount().amountMinor();
        Currency currency = request.amount() == null ? null : request.amount().currency();
        String raw = nullToEmpty(request.sourceAccountId())
                + "|" + nullToEmpty(request.destinationAccountId())
                + "|" + (amountMinor == null ? "null" : amountMinor.toString())
                + "|" + (currency == null ? "null" : currency.name())
                + "|" + nullToEmpty(TransferExecutor.normaliseReference(request.reference()));
        return sha256Hex(raw);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required but unavailable.", e);
        }
    }
}
