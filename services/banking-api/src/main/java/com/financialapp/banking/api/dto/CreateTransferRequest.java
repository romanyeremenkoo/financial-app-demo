package com.financialapp.banking.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /transfers}. The account-id, same-account and
 * amount invariants are enforced by the domain {@code TransferPolicy} so they
 * surface as the contract's business error codes (HTTP 422) rather than as
 * generic field validation errors.
 */
public record CreateTransferRequest(
        String sourceAccountId,
        String destinationAccountId,
        @Valid MoneyDto amount,
        @Size(max = 140, message = "The reference is too long.") String reference) {
}
