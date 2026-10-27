package com.financialapp.banking.domain;

/**
 * Pure, side-effect-free validation of an internal transfer against the current
 * account snapshot. Enforces the same invariants, in the same priority order, as
 * the Angular and React demo policies so the UI renders identical error codes in
 * demo mode and API mode.
 *
 * <p>The first violated invariant is thrown as a {@link BusinessRuleException}
 * carrying the matching {@link ErrorCode}. A valid transfer returns normally.
 */
public final class TransferPolicy {

    /**
     * Largest integer a JSON number can carry without loss of precision in a
     * JavaScript client ({@code Number.MAX_SAFE_INTEGER}). Amounts beyond this
     * are rejected as a precision violation, mirroring the frontends'
     * {@code Number.isSafeInteger} guard.
     */
    public static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;

    public void validate(String sourceAccountId,
                         String destinationAccountId,
                         AccountSnapshot source,
                         AccountSnapshot destination,
                         Long amountMinor,
                         Currency amountCurrency) {

        // Source account rules.
        if (isBlank(sourceAccountId)) {
            throw new BusinessRuleException(ErrorCode.SOURCE_REQUIRED,
                    "A source account is required.");
        }
        if (source == null) {
            throw new BusinessRuleException(ErrorCode.SOURCE_NOT_FOUND,
                    "The source account could not be found.");
        }
        if (!source.isEligibleForTransfer()) {
            throw new BusinessRuleException(ErrorCode.SOURCE_INELIGIBLE,
                    "The source account is not eligible for transfers.");
        }

        // Destination account rules.
        if (isBlank(destinationAccountId)) {
            throw new BusinessRuleException(ErrorCode.DESTINATION_REQUIRED,
                    "A destination account is required.");
        }
        if (destination == null) {
            throw new BusinessRuleException(ErrorCode.DESTINATION_NOT_FOUND,
                    "The destination account could not be found.");
        }
        if (!destination.isEligibleForTransfer()) {
            throw new BusinessRuleException(ErrorCode.DESTINATION_INELIGIBLE,
                    "The destination account is not eligible for transfers.");
        }

        // Same-account rule.
        if (sourceAccountId.equals(destinationAccountId)) {
            throw new BusinessRuleException(ErrorCode.SAME_ACCOUNT,
                    "The source and destination accounts must be different.");
        }

        // Amount rules.
        if (amountMinor == null) {
            throw new BusinessRuleException(ErrorCode.AMOUNT_REQUIRED,
                    "An amount is required.");
        }
        if (amountMinor > MAX_SAFE_INTEGER || amountMinor < -MAX_SAFE_INTEGER) {
            throw new BusinessRuleException(ErrorCode.AMOUNT_PRECISION,
                    "The amount exceeds the supported precision.");
        }
        if (amountMinor <= 0) {
            throw new BusinessRuleException(ErrorCode.AMOUNT_NOT_POSITIVE,
                    "The amount must be greater than zero.");
        }

        // Settlement rules.
        if (source.currency() != destination.currency()
                || amountCurrency == null
                || source.currency() != amountCurrency) {
            throw new BusinessRuleException(ErrorCode.CURRENCY_MISMATCH,
                    "The transfer currency must match both accounts.");
        }
        if (amountMinor > source.availableMinor()) {
            throw new BusinessRuleException(ErrorCode.INSUFFICIENT_FUNDS,
                    "Not enough available funds in the source account.");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
