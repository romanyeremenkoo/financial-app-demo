package com.financialapp.banking.api;

import com.financialapp.banking.api.dto.AccountDto;
import com.financialapp.banking.api.dto.CardDto;
import com.financialapp.banking.api.dto.MoneyDto;
import com.financialapp.banking.api.dto.TransactionDto;
import com.financialapp.banking.api.dto.TransferDto;
import com.financialapp.banking.domain.Currency;
import com.financialapp.banking.persistence.AccountEntity;
import com.financialapp.banking.persistence.CardEntity;
import com.financialapp.banking.persistence.TransactionEntity;
import com.financialapp.banking.persistence.TransferEntity;
import org.springframework.stereotype.Component;

/**
 * Translates persistence entities into the typed response DTOs. Entities are
 * never exposed from controllers.
 */
@Component
public class DtoMapper {

    public AccountDto toAccountDto(AccountEntity entity) {
        return new AccountDto(
                entity.getId(),
                entity.getName(),
                entity.getType(),
                entity.getMaskedIban(),
                money(entity.getBalanceMinor(), entity.getCurrency()),
                money(entity.getAvailableMinor(), entity.getCurrency()),
                entity.getStatus());
    }

    public CardDto toCardDto(CardEntity entity) {
        return new CardDto(
                entity.getId(),
                entity.getAccountId(),
                entity.getLabel(),
                entity.getHolderName(),
                entity.getMaskedNumber(),
                entity.getExpiry(),
                entity.getNetwork(),
                entity.getStatus());
    }

    public TransactionDto toTransactionDto(TransactionEntity entity) {
        return new TransactionDto(
                entity.getId(),
                entity.getAccountId(),
                entity.getCounterparty(),
                entity.getCategory(),
                entity.getBookedAt(),
                money(entity.getAmountMinor(), entity.getCurrency()),
                entity.getDirection(),
                entity.getStatus(),
                entity.getReference(),
                entity.getTransferId());
    }

    public TransferDto toTransferDto(TransferEntity entity) {
        return new TransferDto(
                entity.getId(),
                entity.getSourceAccountId(),
                entity.getDestinationAccountId(),
                money(entity.getAmountMinor(), entity.getCurrency()),
                entity.getReference(),
                entity.getCreatedAt(),
                "completed",
                entity.getDebitTransactionId(),
                entity.getCreditTransactionId());
    }

    private MoneyDto money(long amountMinor, Currency currency) {
        return new MoneyDto(amountMinor, currency);
    }
}
