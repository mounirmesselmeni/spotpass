/**
 * Validation message translation and mapping utilities
 *
 * Maps technical backend error messages to user-friendly, translatable messages
 */

import type { TFunction } from 'i18next';

/**
 * Common error message patterns from backend validation
 */
const ERROR_PATTERNS = {
  // UUID validation errors
  uuid: /invalid length.*UUID|should be a valid UUID|uuid|expected length 32/i,

  // Required field errors
  required: /field required|cannot be null|none is not an allowed value|this field is required/i,

  // Email validation errors
  email: /valid email|email/i,

  // String length errors
  tooShort:
    /ensure this value has at least (\d+) characters|string should have at least (\d+) characters|min_length/i,
  tooLong:
    /ensure this value has at most (\d+) characters|string should have at most (\d+) characters|max_length/i,

  // Number range errors
  tooSmall: /greater than or equal to|value should be greater than or equal to|ge=/i,
  tooLarge: /less than or equal to|value should be less than or equal to|le=/i,

  // Type errors
  notInteger: /value is not a valid integer|int/i,
  notString: /str type expected/i,
  notBoolean: /value is not a valid boolean/i,

  // Format errors
  phoneNumber: /phone|invalid phone number format/i,
  url: /invalid url|url/i,
};

/**
 * Field-specific error message overrides
 * Maps field names to specific translation keys
 */
const FIELD_SPECIFIC_MESSAGES: Record<string, Record<string, string>> = {
  zone_id: {
    required: 'validation.zoneRequired',
    uuid: 'validation.zoneRequired',
  },
  table_id: {
    required: 'validation.tableRequired',
    uuid: 'validation.tableRequired',
  },
  email: {
    email: 'validation.invalidEmail',
    required: 'validation.emailRequired',
  },
  phone_number: {
    required: 'validation.phoneRequired',
    phoneNumber: 'validation.invalidPhone',
  },
  password: {
    required: 'validation.passwordRequired',
    tooShort: 'validation.passwordTooShort',
  },
  full_name: {
    required: 'validation.nameRequired',
  },
  name: {
    required: 'validation.nameRequired',
  },
};

/**
 * Default translation keys for error types
 */
const DEFAULT_TRANSLATIONS: Record<string, string> = {
  uuid: 'validation.fieldRequired',
  required: 'validation.fieldRequired',
  email: 'validation.invalidEmail',
  tooShort: 'validation.tooShort',
  tooLong: 'validation.tooLong',
  tooSmall: 'validation.tooSmall',
  tooLarge: 'validation.tooLarge',
  notInteger: 'validation.mustBeInteger',
  notString: 'validation.mustBeString',
  notBoolean: 'validation.mustBeBoolean',
  phoneNumber: 'validation.invalidPhone',
  url: 'validation.invalidUrl',
};

/**
 * Detect error type from technical message
 */
function detectErrorType(message: string): string | null {
  for (const [type, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.test(message)) {
      return type;
    }
  }
  return null;
}

/**
 * Get user-friendly translation key for an error message
 *
 * @param technicalMessage - Raw error message from backend
 * @param fieldName - Name of the field with error
 * @returns Translation key for i18n
 */
export function getValidationTranslationKey(technicalMessage: string, fieldName: string): string {
  const errorType = detectErrorType(technicalMessage);

  if (!errorType) {
    // Return original message if no pattern matches
    return technicalMessage;
  }

  // Check for field-specific override
  if (FIELD_SPECIFIC_MESSAGES[fieldName]?.[errorType]) {
    return FIELD_SPECIFIC_MESSAGES[fieldName][errorType];
  }

  // Use default translation for error type
  return DEFAULT_TRANSLATIONS[errorType] || technicalMessage;
}

/**
 * Translate validation error message
 *
 * @param technicalMessage - Raw error message from backend
 * @param fieldName - Name of the field with error
 * @param t - i18next translation function
 * @returns User-friendly translated message
 */
export function translateValidationError(
  technicalMessage: string,
  fieldName: string,
  t: TFunction
): string {
  const translationKey = getValidationTranslationKey(technicalMessage, fieldName);

  // If it's a translation key (starts with validation.), translate it
  if (translationKey.startsWith('validation.')) {
    const translated = t(translationKey);
    // If translation exists and is different from key, use it
    if (translated !== translationKey) {
      return translated;
    }
  }

  // Fallback to original message or a generic error
  return technicalMessage || t('validation.invalidValue', 'Invalid value');
}

/**
 * Get field label for error messages
 * Maps technical field names to user-friendly labels
 */
const FIELD_LABELS: Record<string, string> = {
  zone_id: 'validation.fields.zone',
  table_id: 'validation.fields.table',
  email: 'validation.fields.email',
  phone_number: 'validation.fields.phone',
  full_name: 'validation.fields.fullName',
  name: 'validation.fields.name',
  password: 'validation.fields.password',
  min_capacity: 'validation.fields.minCapacity',
  max_capacity: 'validation.fields.maxCapacity',
  number_of_guests: 'validation.fields.numberOfGuests',
  duration_minutes: 'validation.fields.duration',
};

/**
 * Get translated field label
 */
export function getFieldLabel(fieldName: string, t: TFunction): string {
  const labelKey = FIELD_LABELS[fieldName];
  if (labelKey) {
    const translated = t(labelKey);
    if (translated !== labelKey) {
      return translated;
    }
  }
  // Fallback to field name with capitalization
  return fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
