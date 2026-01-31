/**
 * Form validation error handling utilities
 *
 * Handles FastAPI validation errors (422) and maps them to Mantine form field errors
 */

import type { UseFormReturnType } from '@mantine/form';
import type { HTTPValidationError, ValidationError } from '@/api/generated/models';
import type { TFunction } from 'i18next';
import { translateValidationError } from './validationMessages';

/**
 * Extract field name from FastAPI error location path
 *
 * @param loc - Location array from ValidationError (e.g., ["body", "email"])
 * @returns Field name (e.g., "email") or null
 */
function extractFieldName(loc: (string | number)[]): string | null {
  // FastAPI format: ["body", "field_name"] or ["query", "param_name"]
  if (loc.length >= 2 && typeof loc[1] === 'string') {
    return loc[1];
  }
  return null;
}

/**
 * Check if error response contains validation errors
 */
function isValidationError(error: any): error is { response?: { data?: HTTPValidationError } } {
  return (
    error?.response?.data?.detail &&
    Array.isArray(error.response.data.detail) &&
    error.response.data.detail.length > 0 &&
    typeof error.response.data.detail[0] === 'object' &&
    'loc' in error.response.data.detail[0]
  );
}

/**
 * Check if error response is a simple string error
 */
function isStringError(error: any): error is { response?: { data?: { detail: string } } } {
  return error?.response?.data?.detail && typeof error.response.data.detail === 'string';
}

/**
 * Handle API errors and set field-level errors on Mantine form
 *
 * @param error - Error object from API call
 * @param form - Mantine form instance
 * @param t - i18next translation function (optional, for translated error messages)
 * @param fieldMapping - Optional mapping of API field names to form field names
 * @returns Object with hasFieldErrors flag and globalError message
 *
 * @example
 * ```tsx
 * const { t } = useTranslation();
 * const { hasFieldErrors, globalError } = handleFormErrors(error, form, t);
 * if (!hasFieldErrors && globalError) {
 *   // Show global notification only if no field errors
 *   notifications.show({ message: globalError, color: 'red' });
 * }
 * ```
 */
export function handleFormErrors<T extends Record<string, any>>(
  error: any,
  form: UseFormReturnType<T>,
  t?: TFunction,
  fieldMapping?: Record<string, string>
): { hasFieldErrors: boolean; globalError: string | null } {
  // Check for FastAPI validation errors (422)
  if (isValidationError(error)) {
    const validationErrors = error.response!.data!.detail as ValidationError[];
    let hasErrors = false;

    validationErrors.forEach((validationError) => {
      const fieldName = extractFieldName(validationError.loc);

      if (fieldName) {
        // Apply field mapping if provided
        const mappedFieldName = fieldMapping?.[fieldName] || fieldName;

        // Translate error message if translation function provided
        const errorMessage = t
          ? translateValidationError(validationError.msg, fieldName, t)
          : validationError.msg;

        // Set error on the specific field
        form.setFieldError(mappedFieldName, errorMessage);
        hasErrors = true;
      }
    });

    return {
      hasFieldErrors: hasErrors,
      globalError: hasErrors ? null : 'Validation error occurred',
    };
  }

  // Check for simple string errors (400, 404, etc.)
  if (isStringError(error)) {
    return {
      hasFieldErrors: false,
      globalError: error.response!.data!.detail,
    };
  }

  // Handle axios/network errors
  if (error?.message) {
    return {
      hasFieldErrors: false,
      globalError: error.message,
    };
  }

  // Fallback for unknown errors
  return {
    hasFieldErrors: false,
    globalError: 'An unexpected error occurred',
  };
}

/**
 * Extract all validation errors as a formatted object
 * Useful for debugging or custom error display
 *
 * @param error - Error object from API call
 * @returns Object mapping field names to error messages
 *
 * @example
 * ```tsx
 * const errors = extractValidationErrors(error);
 * // { email: "Invalid email", phone_number: "Field required" }
 * ```
 */
export function extractValidationErrors(error: any): Record<string, string> {
  if (!isValidationError(error)) {
    return {};
  }

  const validationErrors = error.response!.data!.detail as ValidationError[];
  const errors: Record<string, string> = {};

  validationErrors.forEach((validationError) => {
    const fieldName = extractFieldName(validationError.loc);
    if (fieldName) {
      errors[fieldName] = validationError.msg;
    }
  });

  return errors;
}

/**
 * Get a user-friendly error message from any error
 *
 * @param error - Error object from API call
 * @param defaultMessage - Default message if no specific error found
 * @returns User-friendly error message
 */
export function getErrorMessage(error: any, defaultMessage = 'An error occurred'): string {
  // Check for validation errors
  if (isValidationError(error)) {
    const validationErrors = error.response!.data!.detail as ValidationError[];
    if (validationErrors.length > 0) {
      return validationErrors[0].msg;
    }
  }

  // Check for string errors
  if (isStringError(error)) {
    return error.response!.data!.detail;
  }

  // Check for axios error message
  if (error?.message) {
    return error.message;
  }

  return defaultMessage;
}

/**
 * Clear all form errors
 * Useful when resetting or closing a form
 *
 * @param form - Mantine form instance
 */
export function clearFormErrors<T extends Record<string, any>>(form: UseFormReturnType<T>): void {
  form.clearErrors();
}
