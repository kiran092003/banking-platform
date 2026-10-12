package banking_platform.AccountService.repository;

import banking_platform.AccountService.entity.AccountOperation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountOperationRepository
        extends JpaRepository<AccountOperation, Long> {

    Optional<AccountOperation> findByOperationId(
            String operationId
    );

    boolean existsByOperationId(
            String operationId
    );
}