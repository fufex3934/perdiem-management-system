'use client';

import { FormEvent, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Field {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

interface AuthFormProps {
  title: string;
  description: string;
  fields: Field[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  footer?: React.ReactNode;
}

export function AuthForm({
  title,
  description,
  fields,
  submitLabel,
  onSubmit,
  footer,
}: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries()) as Record<string, string>;

    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.body.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type ?? 'text'}
              placeholder={field.placeholder}
              required={field.required ?? true}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700',
            isSubmitting && 'cursor-not-allowed opacity-70',
          )}
        >
          {isSubmitting ? 'Please wait...' : submitLabel}
        </button>
      </form>

      {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
    </div>
  );
}
