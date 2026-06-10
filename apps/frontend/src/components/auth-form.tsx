'use client';

import { FormEvent, useState } from 'react';
import { ErrorAlert } from '@/components/shared/error-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClientError } from '@/lib/api-client';

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
  onFieldChange?: (name: string, value: string) => void;
  footer?: React.ReactNode;
  extra?: React.ReactNode;
}

export function AuthForm({
  title,
  description,
  fields,
  submitLabel,
  onSubmit,
  onFieldChange,
  footer,
  extra,
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
    <Card className="w-full max-w-md border-border/60 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type ?? 'text'}
                placeholder={field.placeholder}
                required={field.required ?? true}
                onChange={(e) => onFieldChange?.(field.name, e.target.value)}
              />
            </div>
          ))}

          {error && <ErrorAlert message={error} />}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : submitLabel}
          </Button>
        </form>

        {extra}

        {footer && (
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        )}
      </CardContent>
    </Card>
  );
}
