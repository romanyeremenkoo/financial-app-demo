package com.financialapp.banking.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

    @Test
    void addsAmountsOfTheSameCurrency() {
        Money result = Money.of(1234, Currency.EUR).add(Money.of(766, Currency.EUR));
        assertThat(result.amountMinor()).isEqualTo(2000);
        assertThat(result.currency()).isEqualTo(Currency.EUR);
    }

    @Test
    void subtractsAmountsOfTheSameCurrency() {
        Money result = Money.of(5000, Currency.EUR).subtract(Money.of(1500, Currency.EUR));
        assertThat(result.amountMinor()).isEqualTo(3500);
    }

    @Test
    void comparesAmounts() {
        assertThat(Money.of(100, Currency.EUR).isGreaterThan(Money.of(50, Currency.EUR))).isTrue();
        assertThat(Money.of(50, Currency.EUR).isLessThan(Money.of(100, Currency.EUR))).isTrue();
        assertThat(Money.of(100, Currency.EUR).compareTo(Money.of(100, Currency.EUR))).isZero();
    }

    @Test
    void rejectsAddingDifferentCurrencies() {
        assertThatThrownBy(() -> Money.of(100, Currency.EUR).add(Money.of(100, Currency.GBP)))
                .isInstanceOf(CurrencyMismatchException.class)
                .extracting("code").isEqualTo(ErrorCode.CURRENCY_MISMATCH);
    }

    @Test
    void rejectsComparingDifferentCurrencies() {
        assertThatThrownBy(() -> Money.of(100, Currency.EUR).compareTo(Money.of(100, Currency.GBP)))
                .isInstanceOf(CurrencyMismatchException.class);
    }

    @Test
    void exposesPrecisionAndMinorUnitFactor() {
        assertThat(Currency.EUR.precision()).isEqualTo(2);
        assertThat(Currency.GBP.precision()).isEqualTo(2);
        assertThat(Currency.EUR.minorUnitsPerMajor()).isEqualTo(100);
    }

    @Test
    void reportsSign() {
        assertThat(Money.of(1, Currency.EUR).isPositive()).isTrue();
        assertThat(Money.of(-1, Currency.EUR).isNegative()).isTrue();
        assertThat(Money.zero(Currency.EUR).isZero()).isTrue();
    }

    @Test
    void valueEquality() {
        assertThat(Money.of(100, Currency.EUR)).isEqualTo(Money.of(100, Currency.EUR));
        assertThat(Money.of(100, Currency.EUR)).isNotEqualTo(Money.of(100, Currency.GBP));
    }
}
