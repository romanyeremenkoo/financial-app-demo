package com.financialapp.banking.persistence;

import com.financialapp.banking.domain.CardNetwork;
import com.financialapp.banking.domain.CardStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "card")
public class CardEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(name = "account_id", nullable = false)
    private String accountId;

    @Column(nullable = false)
    private String label;

    @Column(name = "holder_name", nullable = false)
    private String holderName;

    @Column(name = "masked_number", nullable = false)
    private String maskedNumber;

    @Column(nullable = false)
    private String expiry;

    @Column(nullable = false)
    private CardNetwork network;

    @Column(nullable = false)
    private CardStatus status;

    public CardEntity() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getHolderName() {
        return holderName;
    }

    public void setHolderName(String holderName) {
        this.holderName = holderName;
    }

    public String getMaskedNumber() {
        return maskedNumber;
    }

    public void setMaskedNumber(String maskedNumber) {
        this.maskedNumber = maskedNumber;
    }

    public String getExpiry() {
        return expiry;
    }

    public void setExpiry(String expiry) {
        this.expiry = expiry;
    }

    public CardNetwork getNetwork() {
        return network;
    }

    public void setNetwork(CardNetwork network) {
        this.network = network;
    }

    public CardStatus getStatus() {
        return status;
    }

    public void setStatus(CardStatus status) {
        this.status = status;
    }
}
