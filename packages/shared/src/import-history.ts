type ImportAction = { operCode: number | null; operName?: string | null }

/** Operation codes that register a used car brought in from abroad (or its customs-based re-registration). */
export const IMPORT_OPER_CODES: ReadonlySet<number> = new Set([70, 71, 100, 172, 221])

/** "РЕЄСТРАЦІЯ ТЗ ПРИВЕЗЕНОГО З-ЗА КОРДОНУ ПО ПОСВІДЧЕННЮ МИТНИЦІ" and kin — catches codes not in the list. */
const IMPORT_NAME = /ПРИВЕЗЕН|ВВЕЗЕН/i
/** A new car brought in by a dealer ("ПЕРВИННА РЕЄСТРАЦІЯ НОВОГО ТЗ ... ВВЕЗЕНО З-ЗА КОРДОНУ") is not a used import. */
const NEW_CAR_NAME = /ПЕРВИН|НОВОГО/i

/** True when the operation says the car was brought in from abroad used. */
export function isImportOperation({ operCode, operName }: ImportAction): boolean {
  if (operCode != null && IMPORT_OPER_CODES.has(operCode)) return true
  return !!operName && IMPORT_NAME.test(operName) && !NEW_CAR_NAME.test(operName)
}

/** True when any operation in the history is a used import. */
export function hasImportOperation(actions: readonly ImportAction[]): boolean {
  return actions.some(isImportOperation)
}
