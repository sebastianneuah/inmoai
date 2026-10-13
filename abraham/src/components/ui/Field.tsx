import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

const control =
  'w-full rounded-md bg-white px-4 text-body text-ink placeholder:text-stone-light shadow-hairline outline-none transition-shadow focus:shadow-[0_0_0_1.5px_#111111] disabled:bg-mist disabled:text-stone';

const errorControl = 'shadow-[0_0_0_1.5px_#C8102E] focus:shadow-[0_0_0_1.5px_#C8102E]';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, optional, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-footnote font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-stone">Opcional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="flex items-center gap-1.5 text-footnote text-red" role="alert">
          <Icon icon={AlertCircle} size={14} />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-footnote text-stone">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} optional={optional}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${fid}-msg` : undefined}
        className={cn(control, 'h-12', error && errorControl, className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, optional, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        ref={ref}
        id={fid}
        aria-invalid={!!error}
        className={cn(control, 'min-h-[88px] resize-none py-3', error && errorControl, className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: string[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, error, options, placeholder, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error}>
      <div className="relative">
        <select
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          className={cn(control, 'h-12 appearance-none pr-10', error && errorControl, className)}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </FieldShell>
  );
});
