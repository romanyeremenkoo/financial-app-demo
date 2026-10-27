package com.financialapp.banking.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransferPolicyTest {

    private final TransferPolicy policy = new TransferPolicy();

    private AccountSnapshot active(String id, long available) {
        return new AccountSnapshot(id, AccountStatus.ACTIVE, Currency.EUR, available);
    }

    private void expect(ErrorCode code, Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo(code);
    }

    @Test
    void acceptsAValidTransfer() {
        assertThatCode(() -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), active("acc-b", 0), 5_000L, Currency.EUR))
                .doesNotThrowAnyException();
    }

    @Test
    void sourceRequiredWhenBlank() {
        expect(ErrorCode.SOURCE_REQUIRED, () -> policy.validate("  ", "acc-b",
                null, active("acc-b", 0), 100L, Currency.EUR));
    }

    @Test
    void sourceNotFound() {
        expect(ErrorCode.SOURCE_NOT_FOUND, () -> policy.validate("acc-a", "acc-b",
                null, active("acc-b", 0), 100L, Currency.EUR));
    }

    @Test
    void sourceIneligibleWhenClosed() {
        AccountSnapshot closed = new AccountSnapshot("acc-a", AccountStatus.CLOSED, Currency.EUR, 10_000);
        expect(ErrorCode.SOURCE_INELIGIBLE, () -> policy.validate("acc-a", "acc-b",
                closed, active("acc-b", 0), 100L, Currency.EUR));
    }

    @Test
    void destinationRequiredWhenBlank() {
        expect(ErrorCode.DESTINATION_REQUIRED, () -> policy.validate("acc-a", "",
                active("acc-a", 10_000), null, 100L, Currency.EUR));
    }

    @Test
    void destinationNotFound() {
        expect(ErrorCode.DESTINATION_NOT_FOUND, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), null, 100L, Currency.EUR));
    }

    @Test
    void destinationIneligibleWhenClosed() {
        AccountSnapshot closed = new AccountSnapshot("acc-b", AccountStatus.CLOSED, Currency.EUR, 0);
        expect(ErrorCode.DESTINATION_INELIGIBLE, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), closed, 100L, Currency.EUR));
    }

    @Test
    void sameAccountRejected() {
        expect(ErrorCode.SAME_ACCOUNT, () -> policy.validate("acc-a", "acc-a",
                active("acc-a", 10_000), active("acc-a", 10_000), 100L, Currency.EUR));
    }

    @Test
    void amountRequiredWhenNull() {
        expect(ErrorCode.AMOUNT_REQUIRED, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), active("acc-b", 0), null, Currency.EUR));
    }

    @Test
    void amountPrecisionWhenBeyondSafeInteger() {
        long unsafe = TransferPolicy.MAX_SAFE_INTEGER + 1;
        expect(ErrorCode.AMOUNT_PRECISION, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", Long.MAX_VALUE), active("acc-b", 0), unsafe, Currency.EUR));
    }

    @Test
    void amountNotPositiveWhenZeroOrNegative() {
        expect(ErrorCode.AMOUNT_NOT_POSITIVE, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), active("acc-b", 0), 0L, Currency.EUR));
        expect(ErrorCode.AMOUNT_NOT_POSITIVE, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), active("acc-b", 0), -5L, Currency.EUR));
    }

    @Test
    void currencyMismatchWhenAmountCurrencyDiffers() {
        expect(ErrorCode.CURRENCY_MISMATCH, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), active("acc-b", 0), 100L, Currency.GBP));
    }

    @Test
    void currencyMismatchWhenAccountsDiffer() {
        AccountSnapshot gbpDestination = new AccountSnapshot("acc-b", AccountStatus.ACTIVE, Currency.GBP, 0);
        expect(ErrorCode.CURRENCY_MISMATCH, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 10_000), gbpDestination, 100L, Currency.EUR));
    }

    @Test
    void insufficientFundsWhenAmountExceedsAvailable() {
        expect(ErrorCode.INSUFFICIENT_FUNDS, () -> policy.validate("acc-a", "acc-b",
                active("acc-a", 1_000), active("acc-b", 0), 1_001L, Currency.EUR));
    }

    @Test
    void sourceErrorsTakePriorityOverDestination() {
        expect(ErrorCode.SOURCE_REQUIRED, () -> policy.validate(null, null,
                null, null, 100L, Currency.EUR));
    }
}
