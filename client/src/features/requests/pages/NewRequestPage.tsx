import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { focusRing } from '../../../app/styles';
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

// The order of the fields on the page, so focus goes to the first invalid one.
const FIELD_ORDER: RequestFormField[] = ['title', 'type', 'description'];

/** Small uppercase label, used for field labels and the eyebrow. */
const smallLabel = 'block text-xs font-semibold tracking-wider text-gray-600 uppercase';

// gray-500 borders (4.8:1 on white) meet the 3:1 minimum for form control boundaries.
const inputClasses = `mt-2 block w-full rounded-xl border bg-white px-4 py-2.5 text-sm shadow-xs ${focusRing}`;

const submitButton = `inline-flex items-center justify-center rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

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

/** Label above the control, then the hint and any error below, linked with aria-describedby. */
function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className={smallLabel}>
        {label}
      </label>
      {children(describedBy)}
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-gray-600">
          {hint}
        </p>
      )}
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
    errors[field] ? 'border-red-600' : 'border-gray-500';

  // The eyebrow names the chosen type; before one is chosen it repeats the heading, so it is
  // hidden from screen readers then.
  const eyebrow = isRequestType(values.type) ? `${values.type} request` : 'New request';

  return (
    <section
      aria-labelledby="new-request-heading"
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10"
    >
      <p className={smallLabel} aria-hidden={values.type ? undefined : true}>
        {eyebrow}
      </p>
      <h1 id="new-request-heading" className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        New request
      </h1>
      <p className="mt-2 text-gray-600">All fields are required.</p>

      {formError && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">Could not create the request.</p>
          <p className="mt-1 text-sm text-red-800">{formError}</p>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-8">
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

        <div>
          <button type="submit" disabled={createRequest.isPending} className={submitButton}>
            {createRequest.isPending ? 'Creating…' : 'Create request'}
          </button>
        </div>
      </form>
    </section>
  );
}
