package com.financialapp.banking.persistence;

import com.financialapp.banking.domain.AccountStatus;
import com.financialapp.banking.domain.AccountType;
import com.financialapp.banking.domain.CardNetwork;
import com.financialapp.banking.domain.CardStatus;
import com.financialapp.banking.domain.TransactionCategory;
import com.financialapp.banking.domain.TransactionDirection;
import com.financialapp.banking.domain.TransactionStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA attribute converters that persist the domain enums as their lowercase wire
 * values, matching the CHECK constraints in the Flyway schema and the API
 * contract.
 */
final class EnumConverters {
    private EnumConverters() {
    }
}

@Converter(autoApply = true)
class AccountTypeConverter implements AttributeConverter<AccountType, String> {
    @Override
    public String convertToDatabaseColumn(AccountType attribute) {
        return attribute == null ? null : attribute.wire();
    }

    @Override
    public AccountType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : AccountType.fromWire(dbData);
    }
}

@Converter(autoApply = true)
class AccountStatusConverter implements AttributeConverter<AccountStatus, String> {
    @Override
    public String convertToDatabaseColumn(AccountStatus attribute) {
        return attribute == null ? null : attribute.wire();
    }

    @Override
    public AccountStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : AccountStatus.fromWire(dbData);
    }
}

@Converter(autoApply = true)
class CardStatusConverter implements AttributeConverter<CardStatus, String> {
    @Override
    public String convertToDatabaseColumn(CardStatus attribute) {
        return attribute == null ? null : attribute.wire();
    }

    @Override
    public CardStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : CardStatus.fromWire(dbData);
    }
}

@Converter(autoApply = true)
class CardNetworkConverter implements AttributeConverter<CardNetwork, String> {
    @Override
    public String convertToDatabaseColumn(CardNetwork attribute) {
        return attribute == null ? null : attribute.wire();
    }

    @Override
    public CardNetwork convertToEntityAttribute(String dbData) {
        return dbData == null ? null : CardNetwork.fromWire(dbData);
    }
}

@Converter(autoApply = true)
class TransactionDirectionConverter implements AttributeConverter<TransactionDirection, String> {
    @Override
    public String convertToDatabaseColumn(TransactionDirection attribute) {
        return attribute == null ? null : attribute.wire();
    }

    @Override
    public TransactionDirection convertToEntityAttribute(String dbData) {
        return dbData == null ? null : TransactionDirection.fromWire(dbData);
    }
}

@Converter(autoApply = true)
class TransactionStatusConverter implements AttributeConverter<TransactionStatus, String> {
    @Override
    public String convertToDatabaseColumn(TransactionStatus attribute) {
        return attribute == null ? null : attribute.wire();
    }

    @Override
    public TransactionStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : TransactionStatus.fromWire(dbData);
    }
}

@Converter(autoApply = true)
class TransactionCategoryConverter implements AttributeConverter<TransactionCategory, String> {
    @Override
    public String convertToDatabaseColumn(TransactionCategory attribute) {
        return attribute == null ? null : attribute.wire();
    }

    @Override
    public TransactionCategory convertToEntityAttribute(String dbData) {
        return dbData == null ? null : TransactionCategory.fromWire(dbData);
    }
}
