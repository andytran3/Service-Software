import { secondaryButton } from '../../../app/styles';

interface ErrorStateProps {
  title: string;
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again later.';
}

/** An announced error message with an optional "Try again" action. */
export function ErrorState({ title, error, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
      <p className="font-medium text-red-900">{title}</p>
      <p className="mt-1 text-sm text-red-800">{errorMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={`mt-3 ${secondaryButton}`}
        >
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
      )}
    </div>
  );
}
