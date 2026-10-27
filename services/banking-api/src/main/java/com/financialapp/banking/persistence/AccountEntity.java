package com.financialapp.banking.persistence;

import com.financialapp.banking.domain.AccountSnapshot;
import com.financialapp.banking.domain.AccountStatus;
import com.financialapp.banking.domain.AccountType;
import com.financialapp.banking.domain.Currency;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "account")
public class AccountEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private AccountType type;

    @Column(name = "masked_iban", nullable = false)
    private String maskedIban;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Currency currency;

    @Column(name = "balance_minor", nullable = false)
    private long balanceMinor;

    @Column(name = "available_minor", nullable = false)
    private long availableMinor;

    @Column(nullable = false)
    private AccountStatus status;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Version
    @Column(nullable = false)
    private long version;

    public AccountEntity() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AccountType getType() {
        return type;
    }

    public void setType(AccountType type) {
        this.type = type;
    }

    public String getMaskedIban() {
        return maskedIban;
    }

    public void setMaskedIban(String maskedIban) {
        this.maskedIban = maskedIban;
    }

    public Currency getCurrency() {
        return currency;
    }

    public void setCurrency(Currency currency) {
        this.currency = currency;
    }

    public long getBalanceMinor() {
        return balanceMinor;
    }

    public void setBalanceMinor(long balanceMinor) {
        this.balanceMinor = balanceMinor;
    }

    public long getAvailableMinor() {
        return availableMinor;
    }

    public void setAvailableMinor(long availableMinor) {
        this.availableMinor = availableMinor;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public long getVersion() {
        return version;
    }

    public AccountSnapshot toSnapshot() {
        return new AccountSnapshot(id, status, currency, availableMinor);
    }
}
