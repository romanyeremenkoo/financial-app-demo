package com.financialapp.banking.integration;

import com.financialapp.banking.domain.TransactionDirection;
import com.financialapp.banking.domain.TransactionStatus;
import com.financialapp.banking.persistence.AccountEntity;
import com.financialapp.banking.persistence.AccountRepository;
import com.financialapp.banking.persistence.CardRepository;
import com.financialapp.banking.persistence.TransactionEntity;
import com.financialapp.banking.persistence.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SeedDataIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final Map<String, Long> OPENING_BALANCES = Map.of(
            "acc-current", 318_540L,
            "acc-savings", 1_284_000L,
            "acc-joint", 141_880L);

    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private CardRepository cardRepository;
    @Autowired
    private TransactionRepository transactionRepository;

    @Test
    void migrationsApplyCleanlyAndSeedTheExpectedEntities() {
        assertThat(accountRepository.count()).isEqualTo(3);
        assertThat(cardRepository.count()).isEqualTo(2);
        assertThat(transactionRepository.count()).isGreaterThan(0);

        List<TransactionEntity> all = transactionRepository.findAll();
        assertThat(all).anyMatch(t -> t.getStatus() == TransactionStatus.PENDING);
        assertThat(all).anyMatch(t -> t.getStatus() == TransactionStatus.FAILED);
    }

    @Test
    void seedBalanceInvariantHolds() {
        for (AccountEntity account : accountRepository.findAll()) {
            long opening = OPENING_BALANCES.get(account.getId());
            List<TransactionEntity> entries = transactionRepository.findByAccountId(account.getId());

            long completedSigned = entries.stream()
                    .filter(t -> t.getStatus() == TransactionStatus.COMPLETED)
                    .mapToLong(t -> t.getDirection() == TransactionDirection.CREDIT
                            ? t.getAmountMinor() : -t.getAmountMinor())
                    .sum();

            long pendingHolds = entries.stream()
                    .filter(t -> t.getStatus() == TransactionStatus.PENDING
                            && t.getDirection() == TransactionDirection.DEBIT)
                    .mapToLong(TransactionEntity::getAmountMinor)
                    .sum();

            assertThat(account.getBalanceMinor())
                    .as("balance of %s", account.getId())
                    .isEqualTo(opening + completedSigned);
            assertThat(account.getAvailableMinor())
                    .as("available of %s", account.getId())
                    .isEqualTo(opening + completedSigned - pendingHolds);
        }
    }

    @Test
    void currentAccountReservesThePendingHold() {
        AccountEntity current = accountRepository.findById("acc-current").orElseThrow();
        assertThat(current.getBalanceMinor() - current.getAvailableMinor()).isEqualTo(15_000);
    }
}
