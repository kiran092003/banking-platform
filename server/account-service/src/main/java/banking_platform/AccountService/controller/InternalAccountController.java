package banking_platform.AccountService.controller;

import banking_platform.AccountService.dto.AccountDepositRequestDTO;
import banking_platform.AccountService.dto.AccountResponseDTO;
import banking_platform.AccountService.dto.AccountTransferRequestDTO;
import banking_platform.AccountService.dto.AccountWithdrawRequestDTO;
import banking_platform.AccountService.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Hidden;

@Hidden
@RestController
@RequestMapping("/accounts/internal")
@RequiredArgsConstructor
public class InternalAccountController {

    private final AccountService accountService;

    // =========================================================
    // INTERNAL TRANSFER
    // TRANSACTION SERVICE ONLY
    // =========================================================

    @PostMapping("/transfer")
    public ResponseEntity<Void> transfer(
            @Valid @RequestBody AccountTransferRequestDTO request
    ) {

        accountService.transfer(request);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/deposit")
    public ResponseEntity<Void> deposit(
            @Valid @RequestBody AccountDepositRequestDTO request
    ) {

        accountService.deposit(request);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/withdraw")
    public ResponseEntity<Void> withdraw(
            @Valid @RequestBody AccountWithdrawRequestDTO request
    ) {
        accountService.withdraw(request);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<AccountResponseDTO> getAccountByUserId(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(
                accountService.getAccountByUserId(userId)
        );
    }

    /*
     * Account by its own id.
     *
     * Transaction Service uses this to find out which user owns the receiving
     * account, so that the counterparty can be notified too.
     */
    @GetMapping("/id/{accountId}")
    public ResponseEntity<AccountResponseDTO> getAccountById(
            @PathVariable Long accountId
    ) {
        return ResponseEntity.ok(
                accountService.getAccountById(accountId)
        );
    }
}