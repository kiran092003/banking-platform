package banking_platform.AccountService.controller;

import banking_platform.AccountService.dto.AccountRequestDTO;
import banking_platform.AccountService.dto.AccountResponseDTO;
import banking_platform.AccountService.dto.AccountUpdateRequestDTO;
import banking_platform.AccountService.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import banking_platform.AccountService.exception.AccountNotFoundException;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Accounts",
        description = "Administrative account management APIs"
)
@SecurityRequirement(name = "bearerAuth")
public class AccountController {

    private final AccountService accountService;


    // =========================================================
    // CREATE ACCOUNT
    // ADMIN ONLY
    // =========================================================

    @PostMapping
    @Operation(
            summary = "Create a new account",
            description = "Creates a new bank account for a user. Requires ADMIN privileges."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Account created successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid account data"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN privileges are required"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Account already exists or account data conflicts"
            )
    })
    public ResponseEntity<AccountResponseDTO> createAccount(
            @Valid @RequestBody AccountRequestDTO request
    ) {

        AccountResponseDTO response =
                accountService.createAccount(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }


    // =========================================================
    // GET MY OWN ACCOUNT
    // ANY AUTHENTICATED ROLE
    // =========================================================

    /*
     * Every other endpoint on this controller is ADMIN-only, which left a
     * USER unable to read their own balance or discover the account id that
     * POST /transactions requires as senderAccountId.
     *
     * The user is taken from the authenticated JWT (never from the request),
     * so a caller can only ever reach their own account and this exposes
     * nothing they are not already entitled to.
     *
     * The method-level @PreAuthorize overrides the class-level ADMIN rule.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get the authenticated user's own account",
            description = "Retrieves the account belonging to the currently authenticated user, resolved from the JWT."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Account retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "The authenticated user has no account"
            )
    })
    public ResponseEntity<AccountResponseDTO> getMyAccount() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            throw new AccountNotFoundException(
                    "Authentication is required"
            );
        }

        // JwtFilter stores the userId claim in the authentication details.
        Object details = authentication.getDetails();

        if (!(details instanceof Long userId) || userId <= 0) {
            throw new AccountNotFoundException(
                    "No account is associated with the authenticated user"
            );
        }

        return ResponseEntity.ok(
                accountService.getAccountByUserId(userId)
        );
    }


    // =========================================================
    // GET ACCOUNT BY ID
    // =========================================================

    @GetMapping("/{id}")
    @Operation(
            summary = "Get account by ID",
            description = "Retrieves an account using its unique account ID."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Account retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid account ID"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN privileges are required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Account not found"
            )
    })
    public ResponseEntity<AccountResponseDTO> getAccountById(
            @PathVariable
            @Positive(message = "Account ID must be greater than 0")
            Long id
    ) {

        return ResponseEntity.ok(
                accountService.getAccountById(id)
        );
    }


    // =========================================================
    // GET ACCOUNT BY ACCOUNT NUMBER
    // =========================================================

    @GetMapping("/number/{accountNumber}")
    @Operation(
            summary = "Get account by account number",
            description = "Retrieves an account using its unique 12-digit account number."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Account retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Account number must contain exactly 12 digits"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN privileges are required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Account not found"
            )
    })
    public ResponseEntity<AccountResponseDTO> getAccountByNumber(
            @PathVariable
            @Pattern(
                    regexp = "^[0-9]{12}$",
                    message = "Account number must contain exactly 12 digits"
            )
            String accountNumber
    ) {

        return ResponseEntity.ok(
                accountService.getAccountByNumber(accountNumber)
        );
    }


    // =========================================================
    // GET ACCOUNT BY USER ID
    // =========================================================

    @GetMapping("/user/{userId}")
    @Operation(
            summary = "Get account by user ID",
            description = "Retrieves the account associated with a specific user."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Account retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid user ID"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN privileges are required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Account not found for the specified user"
            )
    })
    public ResponseEntity<AccountResponseDTO> getAccountByUserId(
            @PathVariable
            @Positive(message = "User ID must be greater than 0")
            Long userId
    ) {

        return ResponseEntity.ok(
                accountService.getAccountByUserId(userId)
        );
    }


    // =========================================================
    // GET ALL ACCOUNTS
    // =========================================================

    @GetMapping
    @Operation(
            summary = "Get all accounts",
            description = "Retrieves all accounts managed by the banking platform. Requires ADMIN privileges."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Accounts retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN privileges are required"
            )
    })
    public ResponseEntity<List<AccountResponseDTO>> getAllAccounts() {

        return ResponseEntity.ok(
                accountService.getAllAccounts()
        );
    }


    // =========================================================
    // UPDATE ACCOUNT
    // =========================================================

    @PutMapping("/{id}")
    @Operation(
            summary = "Update an account",
            description = "Updates account information for the specified account ID."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Account updated successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid account ID or update data"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN privileges are required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Account not found"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Account update conflicts with existing data"
            )
    })
    public ResponseEntity<AccountResponseDTO> updateAccount(
            @PathVariable
            @Positive(message = "Account ID must be greater than 0")
            Long id,

            @Valid @RequestBody AccountUpdateRequestDTO request
    ) {

        return ResponseEntity.ok(
                accountService.updateAccount(
                        id,
                        request
                )
        );
    }


    // =========================================================
    // CLOSE ACCOUNT
    // =========================================================

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Close an account",
            description = "Closes the specified account. This is a logical account closure and requires ADMIN privileges."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "204",
                    description = "Account closed successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid account ID"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication is required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "ADMIN privileges are required"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Account not found"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Account cannot be closed in its current state"
            )
    })
    public ResponseEntity<Void> deleteAccount(
            @PathVariable
            @Positive(message = "Account ID must be greater than 0")
            Long id
    ) {

        accountService.deleteAccount(id);

        return ResponseEntity.noContent().build();
    }
}