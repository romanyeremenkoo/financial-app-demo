package com.financialapp.banking.api;

import com.financialapp.banking.api.dto.CreateTransferRequest;
import com.financialapp.banking.api.dto.TransferDto;
import com.financialapp.banking.application.TransferService;
import com.financialapp.banking.application.TransferService.TransferResult;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TransferController {

    private static final String REPLAYED_HEADER = "Idempotency-Replayed";

    private final TransferService transferService;
    private final DtoMapper mapper;

    public TransferController(TransferService transferService, DtoMapper mapper) {
        this.transferService = transferService;
        this.mapper = mapper;
    }

    @PostMapping("/transfers")
    public ResponseEntity<TransferDto> createTransfer(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateTransferRequest request) {

        TransferResult result = transferService.createTransfer(idempotencyKey, request);
        HttpStatus status = result.replayed() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status)
                .header(REPLAYED_HEADER, Boolean.toString(result.replayed()))
                .body(mapper.toTransferDto(result.transfer()));
    }

    @GetMapping("/transfers/{transferId}")
    public TransferDto getTransfer(@PathVariable String transferId) {
        return mapper.toTransferDto(transferService.getTransfer(transferId));
    }
}
