package com.financialapp.banking.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financialapp.banking.application.AccountService;
import com.financialapp.banking.application.CardService;
import com.financialapp.banking.application.TransactionService;
import com.financialapp.banking.application.TransferService;
import com.financialapp.banking.application.TransferService.TransferResult;
import com.financialapp.banking.domain.BusinessRuleException;
import com.financialapp.banking.domain.CardNetwork;
import com.financialapp.banking.domain.CardStatus;
import com.financialapp.banking.domain.Currency;
import com.financialapp.banking.domain.ErrorCode;
import com.financialapp.banking.domain.ResourceNotFoundException;
import com.financialapp.banking.persistence.AccountEntity;
import com.financialapp.banking.persistence.CardEntity;
import com.financialapp.banking.persistence.TransferEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AccountController.class, CardController.class,
        TransactionController.class, TransferController.class, HealthController.class})
@TestPropertySource(properties = "app.cors.allowed-origins=http://localhost:4200")
class ApiWebLayerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AccountService accountService;
    @MockBean
    private CardService cardService;
    @MockBean
    private TransactionService transactionService;
    @MockBean
    private TransferService transferService;
    @MockBean
    private DtoMapper dtoMapper;

    private CardEntity sampleCard() {
        CardEntity card = new CardEntity();
        card.setId("card-everyday");
        card.setAccountId("acc-current");
        card.setLabel("Everyday virtual card");
        card.setHolderName("Elena Vasquez");
        card.setMaskedNumber("•••• •••• •••• 4218");
        card.setExpiry("09/29");
        card.setNetwork(CardNetwork.VISA);
        card.setStatus(CardStatus.FROZEN);
        return card;
    }

    @Test
    void patchCardStatusReturnsUpdatedCard() throws Exception {
        CardEntity card = sampleCard();
        when(cardService.updateStatus(eq("card-everyday"), eq(CardStatus.FROZEN))).thenReturn(card);
        when(dtoMapper.toCardDto(any())).thenCallRealMethod();

        mockMvc.perform(patch("/cards/card-everyday/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"frozen\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("card-everyday"))
                .andExpect(jsonPath("$.status").value("frozen"));
    }

    @Test
    void patchCardStatusUnknownCardReturns404() throws Exception {
        when(cardService.updateStatus(eq("missing"), any()))
                .thenThrow(new ResourceNotFoundException(ErrorCode.CARD_NOT_FOUND,
                        "The requested card could not be found."));

        mockMvc.perform(patch("/cards/missing/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CARD_NOT_FOUND"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void patchCardStatusMissingBodyFieldReturns400WithDetails() throws Exception {
        mockMvc.perform(patch("/cards/card-everyday/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details").isArray())
                .andExpect(jsonPath("$.details[0].field").value("status"));
    }

    @Test
    void getAccountUnknownReturns404() throws Exception {
        when(accountService.getAccount(eq("missing")))
                .thenThrow(new ResourceNotFoundException(ErrorCode.ACCOUNT_NOT_FOUND,
                        "The requested account could not be found."));

        mockMvc.perform(get("/accounts/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_FOUND"));
    }

    @Test
    void createTransferMissingIdempotencyKeyReturns400() throws Exception {
        when(transferService.createTransfer(any(), any()))
                .thenThrow(new com.financialapp.banking.domain.IdempotencyKeyRequiredException());

        mockMvc.perform(post("/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceAccountId\":\"acc-current\",\"destinationAccountId\":\"acc-savings\","
                                + "\"amount\":{\"amountMinor\":1000,\"currency\":\"EUR\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REQUIRED"));
    }

    @Test
    void createTransferBusinessErrorReturns422() throws Exception {
        when(transferService.createTransfer(any(), any()))
                .thenThrow(new BusinessRuleException(ErrorCode.INSUFFICIENT_FUNDS,
                        "Not enough available funds in the source account."));

        mockMvc.perform(post("/transfers")
                        .header("Idempotency-Key", "key-12345678")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceAccountId\":\"acc-current\",\"destinationAccountId\":\"acc-savings\","
                                + "\"amount\":{\"amountMinor\":999999999,\"currency\":\"EUR\"}}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_FUNDS"));
    }

    @Test
    void createTransferSuccessReturns201WithReplayHeader() throws Exception {
        TransferEntity transfer = new TransferEntity();
        transfer.setId("transfer-1");
        transfer.setSourceAccountId("acc-current");
        transfer.setDestinationAccountId("acc-savings");
        transfer.setAmountMinor(1000);
        transfer.setCurrency(Currency.EUR);
        transfer.setCreatedAt(OffsetDateTime.now());
        transfer.setDebitTransactionId("txn-d");
        transfer.setCreditTransactionId("txn-c");
        when(transferService.createTransfer(eq("key-12345678"), any()))
                .thenReturn(new TransferResult(transfer, false));
        when(dtoMapper.toTransferDto(any())).thenCallRealMethod();

        mockMvc.perform(post("/transfers")
                        .header("Idempotency-Key", "key-12345678")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceAccountId\":\"acc-current\",\"destinationAccountId\":\"acc-savings\","
                                + "\"amount\":{\"amountMinor\":1000,\"currency\":\"EUR\"}}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotency-Replayed", "false"))
                .andExpect(jsonPath("$.id").value("transfer-1"))
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.amount.amountMinor").value(1000))
                .andExpect(jsonPath("$.amount.currency").value("EUR"));
    }

    @Test
    void healthReportsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
