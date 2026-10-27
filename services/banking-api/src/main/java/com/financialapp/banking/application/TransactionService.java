package com.financialapp.banking.application;

import com.financialapp.banking.domain.ErrorCode;
import com.financialapp.banking.domain.ResourceNotFoundException;
import com.financialapp.banking.domain.TransactionCategory;
import com.financialapp.banking.domain.TransactionDirection;
import com.financialapp.banking.persistence.TransactionEntity;
import com.financialapp.banking.persistence.TransactionRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public record TransactionQuery(
            String accountId,
            TransactionCategory category,
            TransactionDirection direction,
            String search,
            String sort,
            int page,
            int size) {
    }

    public Page<TransactionEntity> search(TransactionQuery query) {
        Pageable pageable = PageRequest.of(query.page(), query.size(), sortFor(query.sort()));
        return transactionRepository.findAll(specificationFor(query), pageable);
    }

    public TransactionEntity getTransaction(String transactionId) {
        return transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TRANSACTION_NOT_FOUND,
                        "The requested transaction could not be found."));
    }

    private Specification<TransactionEntity> specificationFor(TransactionQuery query) {
        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (query.accountId() != null && !query.accountId().isBlank()) {
                predicates.add(cb.equal(root.get("accountId"), query.accountId()));
            }
            if (query.category() != null) {
                predicates.add(cb.equal(root.get("category"), query.category()));
            }
            if (query.direction() != null) {
                predicates.add(cb.equal(root.get("direction"), query.direction()));
            }
            if (query.search() != null && !query.search().isBlank()) {
                String like = "%" + query.search().trim().toLowerCase() + "%";
                Predicate counterparty = cb.like(cb.lower(root.get("counterparty")), like);
                Predicate reference = cb.like(cb.lower(root.get("reference")), like);
                predicates.add(cb.or(counterparty, reference));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Maps the API sort key to a deterministic order: the chosen key first, then
     * transaction id as a stable tie-breaker.
     */
    private Sort sortFor(String sort) {
        String key = sort == null ? "date-desc" : sort;
        Sort primary = switch (key) {
            case "date-asc" -> Sort.by(Sort.Order.asc("bookedAt"));
            case "amount-desc" -> Sort.by(Sort.Order.desc("amountMinor"));
            case "amount-asc" -> Sort.by(Sort.Order.asc("amountMinor"));
            default -> Sort.by(Sort.Order.desc("bookedAt"));
        };
        return primary.and(Sort.by(Sort.Order.asc("id")));
    }
}
