import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  id: string;
  label?: string;
  error?: string;
  children: React.ReactNode;
}

function FieldWrapper({ id, label, error, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fd-cacao">
          {label}
        </label>
      )}
      {children}
      {error && <span className="text-xs text-fd-error">{error}</span>}
    </div>
  );
}

const baseInputClass =
  "rounded-md border border-fd-khaki bg-white px-3 py-2 text-sm text-fd-cacao placeholder:text-fd-taupe focus:outline-none focus:ring-2 focus:ring-fd-leather/30 focus:border-fd-leather transition-colors duration-150";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = "", id, ...rest }, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper id={inputId} label={label} error={error}>
      <input ref={ref} id={inputId} className={`${baseInputClass} ${className}`} {...rest} />
    </FieldWrapper>
  );
});
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <FieldWrapper id={inputId} label={label} error={error}>
        <textarea ref={ref} id={inputId} className={`${baseInputClass} min-h-[80px] resize-y ${className}`} {...rest} />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", id, children, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <FieldWrapper id={inputId} label={label} error={error}>
        <select ref={ref} id={inputId} className={`${baseInputClass} ${className}`} {...rest}>
          {children}
        </select>
      </FieldWrapper>
    );
  },
);
Select.displayName = "Select";
