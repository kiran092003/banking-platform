package banking_platform.transaction_service.controller;

import banking_platform.transaction_service.service.TransactionOutboxStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Hidden;

@Hidden
@RestController
@RequestMapping("/internal/outbox")
@RequiredArgsConstructor
public class TransactionOutboxRecoveryController {

    private final TransactionOutboxStatusService transactionOutboxStatusService;

    @PostMapping("/{eventId}/retry")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> retryFailedEvent(
            @PathVariable String eventId
    ) {

        transactionOutboxStatusService.retryFailedEvent(eventId);

        return ResponseEntity.accepted().build();
    }
}