package com.financialapp.banking.api.dto;

import com.financialapp.banking.domain.TransactionCategory;
import com.financialapp.banking.domain.TransactionDirection;
import com.financialapp.banking.domain.TransactionStatus;

import java.time.OffsetDateTime;

public record TransactionDto(
        String id,
        String accountId,
        String counterparty,
        TransactionCategory category,
        OffsetDateTime bookedAt,
        MoneyDto amount,
        TransactionDirection direction,
        TransactionStatus status,
        String reference,
        String transferId) {
}
