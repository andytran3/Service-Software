import { useRef, useState, type FormEvent } from 'react';
import { focusRing, primaryButton, secondaryButton } from '../../../app/styles';
import { SEARCH_MAX_LENGTH } from '../schemas';

interface SearchFormProps {
  /** The active search from the URL ('' when none). */
  q: string;
  onSearch: (q: string) => void;
  /** Spacing classes for the form (defaults to the list page's top margin). */
  className?: string;
}

/**
 * The "Search requests" form, used on the request list and the landing page. Searches when
 * submitted (Enter or the button) with the trimmed text, or '' for a blank search. "Clear search"
 * appears while a search is active.
 */
export function SearchForm({ q, onSearch, className = 'mt-6' }: SearchFormProps) {
  const [value, setValue] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow URL changes (back/forward, links) without an effect.
  if (q !== syncedQ) {
    setSyncedQ(q);
    setValue(q);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length > SEARCH_MAX_LENGTH) {
      setError(`Search must be at most ${SEARCH_MAX_LENGTH} characters`);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    onSearch(trimmed);
  }

  function handleClear() {
    setValue('');
    setError(null);
    onSearch('');
    inputRef.current?.focus();
  }

  const describedBy = ['search-hint', error ? 'search-error' : null].filter(Boolean).join(' ');

  return (
    <form role="search" onSubmit={handleSubmit} noValidate className={className}>
      <label htmlFor="search" className="block text-sm font-medium">
        Search requests
      </label>
      <p id="search-hint" className="mt-0.5 text-xs text-gray-600">
        Searches titles and descriptions.
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id="search"
          name="q"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-w-0 flex-1 basis-60 rounded-md border bg-white px-3 py-2 text-sm shadow-sm ${error ? 'border-red-600' : 'border-gray-500'} ${focusRing}`}
        />
        <button type="submit" className={primaryButton}>
          Search
        </button>
        {q && (
          <button type="button" onClick={handleClear} className={secondaryButton}>
            Clear search
          </button>
        )}
      </div>
      {error && (
        <p id="search-error" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
