package com.financialapp.banking.domain;

import java.util.Objects;

/**
 * Immutable monetary value: a signed amount in the currency's minor unit plus an
 * explicit currency. Floating point is never authoritative.
 */
public final class Money {

    private final long amountMinor;
    private final Currency currency;

    public Money(long amountMinor, Currency currency) {
        this.currency = Objects.requireNonNull(currency, "currency");
        this.amountMinor = amountMinor;
    }

    public static Money of(long amountMinor, Currency currency) {
        return new Money(amountMinor, currency);
    }

    public static Money zero(Currency currency) {
        return new Money(0L, currency);
    }

    public long amountMinor() {
        return amountMinor;
    }

    public Currency currency() {
        return currency;
    }

    public boolean isPositive() {
        return amountMinor > 0;
    }

    public boolean isNegative() {
        return amountMinor < 0;
    }

    public boolean isZero() {
        return amountMinor == 0;
    }

    public Money add(Money other) {
        requireSameCurrency(other);
        return new Money(Math.addExact(this.amountMinor, other.amountMinor), currency);
    }

    public Money subtract(Money other) {
        requireSameCurrency(other);
        return new Money(Math.subtractExact(this.amountMinor, other.amountMinor), currency);
    }

    /**
     * Compares two amounts of the same currency.
     *
     * @return negative, zero or positive when this is less than, equal to, or greater than other.
     */
    public int compareTo(Money other) {
        requireSameCurrency(other);
        return Long.compare(this.amountMinor, other.amountMinor);
    }

    public boolean isGreaterThan(Money other) {
        return compareTo(other) > 0;
    }

    public boolean isLessThan(Money other) {
        return compareTo(other) < 0;
    }

    private void requireSameCurrency(Money other) {
        Objects.requireNonNull(other, "other");
        if (this.currency != other.currency) {
            throw new CurrencyMismatchException(this.currency, other.currency);
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Money other)) {
            return false;
        }
        return amountMinor == other.amountMinor && currency == other.currency;
    }

    @Override
    public int hashCode() {
        return Objects.hash(amountMinor, currency);
    }

    @Override
    public String toString() {
        return amountMinor + " " + currency;
    }
}
