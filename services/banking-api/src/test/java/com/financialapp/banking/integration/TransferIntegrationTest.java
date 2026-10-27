package com.financialapp.banking.integration;

import com.financialapp.banking.api.dto.CreateTransferRequest;
import com.financialapp.banking.api.dto.MoneyDto;
import com.financialapp.banking.application.TransferService;
import com.financialapp.banking.application.TransferService.TransferResult;
import com.financialapp.banking.domain.AccountStatus;
import com.financialapp.banking.domain.BusinessRuleException;
import com.financialapp.banking.domain.Currency;
import com.financialapp.banking.domain.ErrorCode;
import com.financialapp.banking.domain.IdempotencyConflictException;
import com.financialapp.banking.domain.TransactionDirection;
import com.financialapp.banking.persistence.AccountEntity;
import com.financialapp.banking.persistence.AccountRepository;
import com.financialapp.banking.persistence.IdempotencyRecordRepository;
import com.financialapp.banking.persistence.TransactionEntity;
import com.financialapp.banking.persistence.TransactionRepository;
import com.financialapp.banking.persistence.TransferRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransferIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private TransferService transferService;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private TransferRepository transferRepository;
    @Autowired
    private IdempotencyRecordRepository idempotencyRepository;

    private CreateTransferRequest request(String source, String dest, long amount, String reference) {
        return new CreateTransferRequest(source, dest, new MoneyDto(amount, Currency.EUR), reference);
    }

    @Test
    void successMovesBalancesAndWritesExactlyTwoBalancingRows() {
        AccountEntity sourceBefore = accountRepository.findById("acc-current").orElseThrow();
        AccountEntity destBefore = accountRepository.findById("acc-savings").orElseThrow();
        long amount = 12_550;

        TransferResult result = transferService.createTransfer(
                "key-success-0001", request("acc-current", "acc-savings", amount, "Monthly savings"));

        assertThat(result.replayed()).isFalse();

        AccountEntity sourceAfter = accountRepository.findById("acc-current").orElseThrow();
        AccountEntity destAfter = accountRepository.findById("acc-savings").orElseThrow();
        assertThat(sourceAfter.getBalanceMinor()).isEqualTo(sourceBefore.getBalanceMinor() - amount);
        assertThat(sourceAfter.getAvailableMinor()).isEqualTo(sourceBefore.getAvailableMinor() - amount);
        assertThat(destAfter.getBalanceMinor()).isEqualTo(destBefore.getBalanceMinor() + amount);
        assertThat(destAfter.getAvailableMinor()).isEqualTo(destBefore.getAvailableMinor() + amount);

        String transferId = result.transfer().getId();
        List<TransactionEntity> legs = transactionRepository.findByTransferIdOrderByDirectionAsc(transferId);
        assertThat(legs).hasSize(2);

        long signedSum = legs.stream()
                .mapToLong(t -> t.getDirection() == TransactionDirection.CREDIT
                        ? t.getAmountMinor() : -t.getAmountMinor())
                .sum();
        assertThat(signedSum).isZero();

        TransactionEntity debit = legs.stream()
                .filter(t -> t.getDirection() == TransactionDirection.DEBIT).findFirst().orElseThrow();
        TransactionEntity credit = legs.stream()
                .filter(t -> t.getDirection() == TransactionDirection.CREDIT).findFirst().orElseThrow();
        assertThat(debit.getAccountId()).isEqualTo("acc-current");
        assertThat(debit.getCounterparty()).isEqualTo("Reserve Savings");
        assertThat(credit.getAccountId()).isEqualTo("acc-savings");
        assertThat(credit.getCounterparty()).isEqualTo("Everyday Current");
        assertThat(debit.getBookedAt()).isEqualTo(credit.getBookedAt());
        assertThat(debit.getAmountMinor()).isEqualTo(amount);
        assertThat(credit.getAmountMinor()).isEqualTo(amount);
    }

    @Test
    void insufficientFundsLeavesBalancesAndLedgerUntouched() {
        AccountEntity sourceBefore = accountRepository.findById("acc-current").orElseThrow();
        long tooMuch = sourceBefore.getAvailableMinor() + 1;
        long transfersBefore = transferRepository.count();
        long transactionsBefore = transactionRepository.count();

        assertThatThrownBy(() -> transferService.createTransfer(
                "key-insufficient-1", request("acc-current", "acc-savings", tooMuch, null)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo(ErrorCode.INSUFFICIENT_FUNDS);

        AccountEntity sourceAfter = accountRepository.findById("acc-current").orElseThrow();
        assertThat(sourceAfter.getBalanceMinor()).isEqualTo(sourceBefore.getBalanceMinor());
        assertThat(sourceAfter.getAvailableMinor()).isEqualTo(sourceBefore.getAvailableMinor());
        assertThat(transferRepository.count()).isEqualTo(transfersBefore);
        assertThat(transactionRepository.count()).isEqualTo(transactionsBefore);
        assertThat(idempotencyRepository.count()).isZero();
    }

    @Test
    void sameAccountRejected() {
        assertThatThrownBy(() -> transferService.createTransfer(
                "key-same-account-1", request("acc-current", "acc-current", 1000, null)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo(ErrorCode.SAME_ACCOUNT);
        assertThat(idempotencyRepository.count()).isZero();
    }

    @Test
    void unknownSourceAccountRejected() {
        assertThatThrownBy(() -> transferService.createTransfer(
                "key-unknown-src-1", request("acc-missing", "acc-savings", 1000, null)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo(ErrorCode.SOURCE_NOT_FOUND);
    }

    @Test
    void duplicateIdempotencyKeyReplaysOriginalWithoutSecondPairOfRows() {
        String key = "key-idem-replay-1";
        CreateTransferRequest req = request("acc-current", "acc-savings", 5_000, "Reference A");

        TransferResult first = transferService.createTransfer(key, req);
        assertThat(first.replayed()).isFalse();

        AccountEntity sourceAfterFirst = accountRepository.findById("acc-current").orElseThrow();

        TransferResult replay = transferService.createTransfer(key, req);
        assertThat(replay.replayed()).isTrue();
        assertThat(replay.transfer().getId()).isEqualTo(first.transfer().getId());

        // No second execution: one transfer, one pair of ledger rows, balance moved once.
        assertThat(transferRepository.count()).isEqualTo(1);
        assertThat(transactionRepository.findByTransferIdOrderByDirectionAsc(
                first.transfer().getId())).hasSize(2);
        AccountEntity sourceAfterReplay = accountRepository.findById("acc-current").orElseThrow();
        assertThat(sourceAfterReplay.getBalanceMinor()).isEqualTo(sourceAfterFirst.getBalanceMinor());
    }

    @Test
    void sameKeyDifferentPayloadConflicts() {
        String key = "key-idem-conflict-1";
        transferService.createTransfer(key, request("acc-current", "acc-savings", 5_000, "A"));

        assertThatThrownBy(() -> transferService.createTransfer(
                key, request("acc-current", "acc-savings", 9_999, "A")))
                .isInstanceOf(IdempotencyConflictException.class)
                .extracting("code").isEqualTo(ErrorCode.IDEMPOTENCY_KEY_REUSED);

        assertThat(transferRepository.count()).isEqualTo(1);
    }

    @Test
    void concurrentTransfersNeverOverspendTheAvailableFunds() throws InterruptedException {
        AccountEntity src = new AccountEntity();
        src.setId("acc-conc-src");
        src.setName("Concurrency Source");
        src.setType(com.financialapp.banking.domain.AccountType.CURRENT);
        src.setMaskedIban("IE00 •••• •••• 0001");
        src.setCurrency(Currency.EUR);
        src.setBalanceMinor(100_000);
        src.setAvailableMinor(100_000);
        src.setStatus(AccountStatus.ACTIVE);
        src.setSortOrder(10);

        AccountEntity dst = new AccountEntity();
        dst.setId("acc-conc-dst");
        dst.setName("Concurrency Destination");
        dst.setType(com.financialapp.banking.domain.AccountType.SAVINGS);
        dst.setMaskedIban("IE00 •••• •••• 0002");
        dst.setCurrency(Currency.EUR);
        dst.setBalanceMinor(0);
        dst.setAvailableMinor(0);
        dst.setStatus(AccountStatus.ACTIVE);
        dst.setSortOrder(11);
        accountRepository.save(src);
        accountRepository.save(dst);

        int threads = 8;
        long amount = 30_000; // only 3 of 8 can succeed from 100_000.
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger insufficient = new AtomicInteger();
        ConcurrentLinkedQueue<Throwable> unexpected = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < threads; i++) {
            String key = "key-conc-" + i;
            pool.submit(() -> {
                try {
                    startGate.await();
                    transferService.createTransfer(key,
                            request("acc-conc-src", "acc-conc-dst", amount, null));
                    successes.incrementAndGet();
                } catch (BusinessRuleException e) {
                    if (e.code() == ErrorCode.INSUFFICIENT_FUNDS) {
                        insufficient.incrementAndGet();
                    } else {
                        unexpected.add(e);
                    }
                } catch (Throwable t) {
                    unexpected.add(t);
                } finally {
                    done.countDown();
                }
            });
        }

        startGate.countDown();
        assertThat(done.await(60, TimeUnit.SECONDS)).isTrue();
        pool.shutdownNow();

        assertThat(unexpected).isEmpty();
        assertThat(successes.get()).isEqualTo(3);
        assertThat(insufficient.get()).isEqualTo(5);

        AccountEntity srcFinal = accountRepository.findById("acc-conc-src").orElseThrow();
        AccountEntity dstFinal = accountRepository.findById("acc-conc-dst").orElseThrow();
        assertThat(srcFinal.getBalanceMinor()).isEqualTo(100_000 - 3 * amount);
        assertThat(srcFinal.getAvailableMinor()).isEqualTo(100_000 - 3 * amount);
        assertThat(srcFinal.getAvailableMinor()).isGreaterThanOrEqualTo(0);
        assertThat(dstFinal.getBalanceMinor()).isEqualTo(3 * amount);
        assertThat(transferRepository.count()).isEqualTo(3);
    }
}
