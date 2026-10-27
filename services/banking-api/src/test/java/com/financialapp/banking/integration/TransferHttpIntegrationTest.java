package com.financialapp.banking.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TransferHttpIntegrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    private String body(String source, String dest, long amount, String reference) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "sourceAccountId", source,
                "destinationAccountId", dest,
                "amount", Map.of("amountMinor", amount, "currency", "EUR"),
                "reference", reference));
    }

    @Test
    void firstTransferReturns201ThenReplayReturns200() throws Exception {
        String payload = body("acc-current", "acc-savings", 7_500, "Rainy day");
        String key = "http-key-00000001";

        mockMvc.perform(post("/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotency-Replayed", "false"))
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.amount.amountMinor").value(7500))
                .andExpect(jsonPath("$.debitTransactionId").isNotEmpty())
                .andExpect(jsonPath("$.creditTransactionId").isNotEmpty());

        mockMvc.perform(post("/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(header().string("Idempotency-Replayed", "true"));
    }

    @Test
    void reuseWithDifferentPayloadReturns409() throws Exception {
        String key = "http-key-00000002";
        mockMvc.perform(post("/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("acc-current", "acc-savings", 1_000, "A")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/transfers")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("acc-current", "acc-savings", 2_000, "A")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
    }

    @Test
    void missingIdempotencyKeyReturns400() throws Exception {
        mockMvc.perform(post("/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("acc-current", "acc-savings", 1_000, "A")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REQUIRED"));
    }

    @Test
    void listAccountsReturnsSeededAccountsInDisplayOrder() throws Exception {
        mockMvc.perform(get("/accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("acc-current"))
                .andExpect(jsonPath("$[1].id").value("acc-savings"))
                .andExpect(jsonPath("$[2].id").value("acc-joint"))
                .andExpect(jsonPath("$[0].balance.currency").value("EUR"));
    }

    @Test
    void listTransactionsFiltersByCategoryAndPaginates() throws Exception {
        mockMvc.perform(get("/transactions")
                        .param("accountId", "acc-current")
                        .param("category", "income")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.items[0].category").value("income"));
    }

    @Test
    void transactionSizeOverMaximumReturns400() throws Exception {
        mockMvc.perform(get("/transactions").param("size", "5000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }
}
