package banking_platform.transaction_service.service;

import banking_platform.transaction_service.repository.TransactionOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TransactionOutboxClaimService {

    private static final long CLAIM_LEASE_MINUTES = 2;

    private final TransactionOutboxRepository transactionOutboxRepository;

    @Transactional
    public boolean claimEvent(Long id) {

        int updatedRows =
                transactionOutboxRepository.claimEvent(
                        id,
                        LocalDateTime.now()
                );

        return updatedRows == 1;
    }

    @Transactional
    public int recoverAbandonedEvents() {

        LocalDateTime currentTime = LocalDateTime.now();

        LocalDateTime leaseExpiryTime =
                currentTime.minusMinutes(CLAIM_LEASE_MINUTES);

        return transactionOutboxRepository.recoverAbandonedEvents(
                leaseExpiryTime,
                currentTime
        );
    }
}