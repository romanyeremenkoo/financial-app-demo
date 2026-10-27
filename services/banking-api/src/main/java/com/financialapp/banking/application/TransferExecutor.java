package com.financialapp.banking.application;

import com.financialapp.banking.api.dto.CreateTransferRequest;
import com.financialapp.banking.domain.Currency;
import com.financialapp.banking.domain.IdempotencyConflictException;
import com.financialapp.banking.domain.TransactionCategory;
import com.financialapp.banking.domain.TransactionDirection;
import com.financialapp.banking.domain.TransactionStatus;
import com.financialapp.banking.domain.TransferPolicy;
import com.financialapp.banking.persistence.AccountEntity;
import com.financialapp.banking.persistence.AccountRepository;
import com.financialapp.banking.persistence.IdempotencyRecordEntity;
import com.financialapp.banking.persistence.IdempotencyRecordRepository;
import com.financialapp.banking.persistence.TransactionEntity;
import com.financialapp.banking.persistence.TransactionRepository;
import com.financialapp.banking.persistence.TransferEntity;
import com.financialapp.banking.persistence.TransferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Holds the transactional units for transfer execution. Kept separate from the
 * orchestrating {@link TransferService} so that Spring's transaction proxy is
 * actually applied (self-invocation would bypass it) and so that a unique-key
 * race can roll back the failed attempt before the orchestrator re-reads.
 */
@Service
public class TransferExecutor {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final TransferRepository transferRepository;
    private final IdempotencyRecordRepository idempotencyRepository;
    private final TransferPolicy transferPolicy = new TransferPolicy();

    public TransferExecutor(AccountRepository accountRepository,
                            TransactionRepository transactionRepository,
                            TransferRepository transferRepository,
                            IdempotencyRecordRepository idempotencyRepository) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.transferRepository = transferRepository;
        this.idempotencyRepository = idempotencyRepository;
    }

    /**
     * Returns the stored transfer for a key if one exists, verifying the payload
     * fingerprint. A mismatch is a reuse conflict.
     */
    @Transactional(readOnly = true)
    public TransferService.TransferResult tryReplay(String idempotencyKey, String fingerprint) {
        return idempotencyRepository.findByIdempotencyKey(idempotencyKey)
                .map(record -> {
                    if (!record.getFingerprint().equals(fingerprint)) {
                        throw new IdempotencyConflictException();
                    }
                    TransferEntity transfer = transferRepository.findById(record.getTransferId())
                            .orElseThrow(() -> new IllegalStateException(
                                    "Idempotency record references a missing transfer."));
                    return new TransferService.TransferResult(transfer, true);
                })
                .orElse(null);
    }

    /**
     * Executes and persists a new transfer as a single atomic unit: both account
     * rows are locked in deterministic id order, balances are moved, exactly two
     * balancing ledger rows are written, and the idempotency record is inserted
     * and flushed so a duplicate key surfaces here and rolls the whole unit back.
     */
    @Transactional
    public TransferService.TransferResult execute(String idempotencyKey, String fingerprint,
                                                  CreateTransferRequest request) {
        String sourceId = request.sourceAccountId();
        String destinationId = request.destinationAccountId();
        Long amountMinor = request.amount() == null ? null : request.amount().amountMinor();
        Currency currency = request.amount() == null ? null : request.amount().currency();

        List<String> lockOrder = new ArrayList<>();
        for (String id : List.of(nullToEmpty(sourceId), nullToEmpty(destinationId))) {
            if (!id.isBlank() && !lockOrder.contains(id)) {
                lockOrder.add(id);
            }
        }
        lockOrder.sort(String::compareTo);

        AccountEntity source = null;
        AccountEntity destination = null;
        for (String id : lockOrder) {
            AccountEntity locked = accountRepository.findByIdForUpdate(id).orElse(null);
            if (locked == null) {
                continue;
            }
            if (id.equals(sourceId)) {
                source = locked;
            }
            if (id.equals(destinationId)) {
                destination = locked;
            }
        }

        transferPolicy.validate(
                sourceId,
                destinationId,
                source == null ? null : source.toSnapshot(),
                destination == null ? null : destination.toSnapshot(),
                amountMinor,
                currency);

        long amount = amountMinor;
        OffsetDateTime bookedAt = OffsetDateTime.now(ZoneOffset.UTC);
        String reference = normaliseReference(request.reference());
        String transferId = "transfer-" + UUID.randomUUID();
        String debitId = "txn-" + UUID.randomUUID();
        String creditId = "txn-" + UUID.randomUUID();

        source.setBalanceMinor(source.getBalanceMinor() - amount);
        source.setAvailableMinor(source.getAvailableMinor() - amount);
        destination.setBalanceMinor(destination.getBalanceMinor() + amount);
        destination.setAvailableMinor(destination.getAvailableMinor() + amount);

        TransactionEntity debit = new TransactionEntity();
        debit.setId(debitId);
        debit.setAccountId(source.getId());
        debit.setCounterparty(destination.getName());
        debit.setCategory(TransactionCategory.TRANSFER);
        debit.setBookedAt(bookedAt);
        debit.setAmountMinor(amount);
        debit.setCurrency(currency);
        debit.setDirection(TransactionDirection.DEBIT);
        debit.setStatus(TransactionStatus.COMPLETED);
        debit.setReference(reference);
        debit.setTransferId(transferId);

        TransactionEntity credit = new TransactionEntity();
        credit.setId(creditId);
        credit.setAccountId(destination.getId());
        credit.setCounterparty(source.getName());
        credit.setCategory(TransactionCategory.TRANSFER);
        credit.setBookedAt(bookedAt);
        credit.setAmountMinor(amount);
        credit.setCurrency(currency);
        credit.setDirection(TransactionDirection.CREDIT);
        credit.setStatus(TransactionStatus.COMPLETED);
        credit.setReference(reference);
        credit.setTransferId(transferId);

        transactionRepository.save(debit);
        transactionRepository.save(credit);

        TransferEntity transfer = new TransferEntity();
        transfer.setId(transferId);
        transfer.setSourceAccountId(source.getId());
        transfer.setDestinationAccountId(destination.getId());
        transfer.setAmountMinor(amount);
        transfer.setCurrency(currency);
        transfer.setReference(reference);
        transfer.setCreatedAt(bookedAt);
        transfer.setDebitTransactionId(debitId);
        transfer.setCreditTransactionId(creditId);
        transferRepository.save(transfer);

        idempotencyRepository.saveAndFlush(
                new IdempotencyRecordEntity(idempotencyKey, fingerprint, transferId, bookedAt));

        return new TransferService.TransferResult(transfer, false);
    }

    static String normaliseReference(String reference) {
        if (reference == null) {
            return null;
        }
        String trimmed = reference.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
