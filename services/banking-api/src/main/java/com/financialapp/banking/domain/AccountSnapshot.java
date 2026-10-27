package com.financialapp.banking.domain;

/**
 * Minimal read-only view of an account the {@link TransferPolicy} needs to make
 * a decision, decoupled from persistence entities.
 */
public record AccountSnapshot(String id, AccountStatus status, Currency currency, long availableMinor) {

    public boolean isEligibleForTransfer() {
        return status == AccountStatus.ACTIVE;
    }
}
