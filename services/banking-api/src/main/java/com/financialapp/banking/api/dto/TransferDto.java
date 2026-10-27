package com.financialapp.banking.api.dto;

import java.time.OffsetDateTime;

public record TransferDto(
        String id,
        String sourceAccountId,
        String destinationAccountId,
        MoneyDto amount,
        String reference,
        OffsetDateTime createdAt,
        String status,
        String debitTransactionId,
        String creditTransactionId) {
}
