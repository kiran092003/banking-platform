import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { store } from '@/app/store';
import { router } from '@/app/router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry a request the server deliberately rejected — only
        // transient failures (network, timeout, 5xx) are worth another attempt.
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status && status < 500 && status !== 429) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      // A mutation moves money; retrying it is the caller's explicit decision.
      retry: false,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}
