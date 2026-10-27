package com.financialapp.banking.application;

import com.financialapp.banking.domain.CardStatus;
import com.financialapp.banking.domain.ErrorCode;
import com.financialapp.banking.domain.ResourceNotFoundException;
import com.financialapp.banking.persistence.CardEntity;
import com.financialapp.banking.persistence.CardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CardService {

    private final CardRepository cardRepository;

    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    public List<CardEntity> listCards(String accountId) {
        if (accountId != null && !accountId.isBlank()) {
            return cardRepository.findByAccountIdOrderByIdAsc(accountId);
        }
        return cardRepository.findAllByOrderByIdAsc();
    }

    public CardEntity getCard(String cardId) {
        return cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CARD_NOT_FOUND,
                        "The requested card could not be found."));
    }

    /**
     * Applies a card status transition. Setting a card to the status it already
     * holds is accepted and is a no-op, keeping the operation safe to retry.
     */
    @Transactional
    public CardEntity updateStatus(String cardId, CardStatus status) {
        CardEntity card = getCard(cardId);
        card.setStatus(status);
        return card;
    }
}
