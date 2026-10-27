package com.financialapp.banking.api;

import com.financialapp.banking.api.dto.CardDto;
import com.financialapp.banking.api.dto.UpdateCardStatusRequest;
import com.financialapp.banking.application.CardService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CardController {

    private final CardService cardService;
    private final DtoMapper mapper;

    public CardController(CardService cardService, DtoMapper mapper) {
        this.cardService = cardService;
        this.mapper = mapper;
    }

    @GetMapping("/cards")
    public List<CardDto> listCards(@RequestParam(required = false) String accountId) {
        return cardService.listCards(accountId).stream().map(mapper::toCardDto).toList();
    }

    @GetMapping("/cards/{cardId}")
    public CardDto getCard(@PathVariable String cardId) {
        return mapper.toCardDto(cardService.getCard(cardId));
    }

    @PatchMapping("/cards/{cardId}/status")
    public CardDto updateCardStatus(@PathVariable String cardId,
                                    @Valid @RequestBody UpdateCardStatusRequest request) {
        return mapper.toCardDto(cardService.updateStatus(cardId, request.status()));
    }
}
