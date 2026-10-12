package banking_platform.AccountService.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class AccountBusinessMetrics {

    private final Counter transferSuccessCounter;
    private final Counter transferFailureCounter;

    private final Counter depositSuccessCounter;
    private final Counter depositFailureCounter;

    private final Counter withdrawalSuccessCounter;
    private final Counter withdrawalFailureCounter;

    public AccountBusinessMetrics(MeterRegistry meterRegistry) {

        transferSuccessCounter =
                Counter.builder("banking.account.transfers.success")
                        .description("Number of successful account transfers")
                        .register(meterRegistry);

        transferFailureCounter =
                Counter.builder("banking.account.transfers.failure")
                        .description("Number of failed account transfers")
                        .register(meterRegistry);

        depositSuccessCounter =
                Counter.builder("banking.account.deposits.success")
                        .description("Number of successful account deposits")
                        .register(meterRegistry);

        depositFailureCounter =
                Counter.builder("banking.account.deposits.failure")
                        .description("Number of failed account deposits")
                        .register(meterRegistry);

        withdrawalSuccessCounter =
                Counter.builder("banking.account.withdrawals.success")
                        .description("Number of successful account withdrawals")
                        .register(meterRegistry);

        withdrawalFailureCounter =
                Counter.builder("banking.account.withdrawals.failure")
                        .description("Number of failed account withdrawals")
                        .register(meterRegistry);
    }

    public void recordTransferSuccess() {
        transferSuccessCounter.increment();
    }

    public void recordTransferFailure() {
        transferFailureCounter.increment();
    }

    public void recordDepositSuccess() {
        depositSuccessCounter.increment();
    }

    public void recordDepositFailure() {
        depositFailureCounter.increment();
    }

    public void recordWithdrawalSuccess() {
        withdrawalSuccessCounter.increment();
    }

    public void recordWithdrawalFailure() {
        withdrawalFailureCounter.increment();
    }
}