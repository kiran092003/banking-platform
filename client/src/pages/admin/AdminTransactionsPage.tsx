import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { MonoText } from '@/components/common/Money';
import TransactionsPage from '@/pages/transactions/TransactionsPage';

/**
 * Platform-wide transaction oversight is NOT available from the backend.
 *
 * `TransactionHistoryService.getTransactionHistory` always applies
 * `TransactionSpecification.hasUserId(<caller's JWT userId>)`, and
 * `GET /transaction/transactions` takes no userId parameter. An ADMIN token
 * therefore returns that admin's own transactions, not everyone's.
 *
 * We say so rather than labelling a personal list "all transactions".
 */
export default function AdminTransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transactions"
        description="Transaction oversight"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Transactions' }]}
      />

      <Alert
        tone="warning"
        title="Platform-wide transaction history is not exposed by the backend"
        className="mb-5"
      >
        <p>
          The transaction service scopes every history query to the caller&apos;s own{' '}
          <MonoText>userId</MonoText> taken from the JWT, and{' '}
          <MonoText>GET /transaction/transactions</MonoText> accepts no user filter. The list
          below is therefore <strong>your own</strong> transaction history, not every
          user&apos;s.
        </p>
        <p className="mt-2">
          A platform-wide view needs a new admin endpoint on the transaction service. An
          individual transaction can still be opened by ID from{' '}
          <Link to="/transactions" className="font-medium underline">
            Transactions
          </Link>
          .
        </p>
      </Alert>

      <TransactionsPage />
    </>
  );
}
