"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validatePassword, PasswordValidationResult } from "@/lib/password-policy";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showPolicy?: boolean;
  onValidationChange?: (result: PasswordValidationResult) => void;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showPolicy = false, onValidationChange, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [validationResult, setValidationResult] = React.useState<PasswordValidationResult | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Validate password if showPolicy is enabled
      if (showPolicy && value.length > 0) {
        const result = validatePassword(value);
        setValidationResult(result);
        onValidationChange?.(result);
      } else if (value.length === 0) {
        setValidationResult(null);
        onValidationChange?.({ isValid: true, errors: [], strength: 'weak' });
      }

      onChange?.(e);
    };

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            ref={ref}
            onChange={handleChange}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {showPolicy && validationResult && (
          <div className="space-y-1">
            {validationResult.errors.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {validationResult.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-destructive">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            )}
            {validationResult.isValid && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Password strength:</span>
                <span
                  className={cn(
                    "font-medium",
                    validationResult.strength === "strong" && "text-green-600",
                    validationResult.strength === "medium" && "text-yellow-600",
                    validationResult.strength === "weak" && "text-red-600"
                  )}
                >
                  {validationResult.strength.charAt(0).toUpperCase() + validationResult.strength.slice(1)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
