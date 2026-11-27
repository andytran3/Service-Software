import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { focusRing, primaryButton, secondaryButton } from '../../../app/styles';
import { ApiError } from '../api';
import { useCreateRequest } from '../hooks';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateRequestForm,
  type RequestFormErrors,
  type RequestFormField,
} from '../schemas';
import { isRequestType, REQUEST_TYPES } from '../types';

const FIELD_ORDER: RequestFormField[] = ['title', 'description', 'type'];

const inputClasses = `mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm ${focusRing}`;

function isFormField(path: string): path is RequestFormField {
  return (FIELD_ORDER as string[]).includes(path);
}

interface FieldProps {
  id: RequestFormField;
  label: string;
  hint?: string;
  error: string | undefined;
  children: (describedBy: string | undefined) => ReactNode;
}

/** Label, optional hint, control, and error message, linked with aria-describedby. */
function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-gray-600">
          {hint}
        </p>
      )}
      {children(describedBy)}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function NewRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createRequest = useCreateRequest();
  // ?type= (from the landing page's shortcuts and service cards) preselects a valid type.
  const [values, setValues] = useState<Record<RequestFormField, string>>(() => {
    const type = searchParams.get('type');
    return { title: '', description: '', type: isRequestType(type) ? type : '' };
  });
  const [errors, setErrors] = useState<RequestFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<RequestFormField, HTMLElement | null>>>({});

  function focusFirstInvalid(fieldErrors: RequestFormErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) fieldRefs.current[first]?.focus();
  }

  function handleChange(field: RequestFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleServerError(error: unknown) {
    if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
      const fieldErrors: RequestFormErrors = {};
      const otherMessages: string[] = [];
      for (const detail of error.details) {
        if (isFormField(detail.path)) {
          fieldErrors[detail.path] ??= detail.message;
        } else {
          otherMessages.push(detail.message);
        }
      }
      setErrors(fieldErrors);
      setFormError(otherMessages.length > 0 ? otherMessages.join(' ') : null);
      focusFirstInvalid(fieldErrors);
      return;
    }
    setFormError(
      error instanceof Error ? error.message : 'Could not create the request. Try again.',
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateRequestForm(values);
    if (!result.success) {
      setErrors(result.errors);
      focusFirstInvalid(result.errors);
      return;
    }

    setErrors({});
    createRequest.mutate(result.data, {
      onSuccess: (created) => {
        void navigate(`/requests/${created.id}`, { state: { created: true } });
      },
      onError: handleServerError,
    });
  }

  const borderFor = (field: RequestFormField) =>
    errors[field] ? 'border-red-600' : 'border-gray-300';

  return (
    <section aria-labelledby="new-request-heading" className="max-w-2xl">
      <h1 id="new-request-heading" className="text-2xl font-semibold">
        New request
      </h1>
      <p className="mt-1 text-gray-700">All fields are required.</p>

      {formError && (
        <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">Could not create the request.</p>
          <p className="mt-1 text-sm text-red-800">{formError}</p>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Field
          id="title"
          label="Title"
          hint={`Up to ${TITLE_MAX_LENGTH} characters.`}
          error={errors.title}
        >
          {(describedBy) => (
            <input
              ref={(element) => {
                fieldRefs.current.title = element;
              }}
              id="title"
              name="title"
              type="text"
              required
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={describedBy}
              value={values.title}
              onChange={(event) => handleChange('title', event.target.value)}
              className={`${inputClasses} ${borderFor('title')}`}
            />
          )}
        </Field>

        <Field
          id="description"
          label="Description"
          hint={`Up to ${DESCRIPTION_MAX_LENGTH} characters.`}
          error={errors.description}
        >
          {(describedBy) => (
            <textarea
              ref={(element) => {
                fieldRefs.current.description = element;
              }}
              id="description"
              name="description"
              rows={6}
              required
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={describedBy}
              value={values.description}
              onChange={(event) => handleChange('description', event.target.value)}
              className={`${inputClasses} ${borderFor('description')}`}
            />
          )}
        </Field>

        <Field id="type" label="Type" error={errors.type}>
          {(describedBy) => (
            <select
              ref={(element) => {
                fieldRefs.current.type = element;
              }}
              id="type"
              name="type"
              required
              aria-invalid={errors.type ? true : undefined}
              aria-describedby={describedBy}
              value={values.type}
              onChange={(event) => handleChange('type', event.target.value)}
              className={`${inputClasses} ${borderFor('type')}`}
            >
              <option value="">Select a type</option>
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={createRequest.isPending} className={primaryButton}>
            {createRequest.isPending ? 'Creating…' : 'Create request'}
          </button>
          <Link to="/requests" className={secondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
