type OwnerAction = { operCode: number | null; operName: string | null }

/** Operations that start a new owner's tenure: first registration or a change of owner. */
const OWNER_START =
  /ПЕРВИН|ПРИДБАН|ПРИВЕЗЕН|ВВЕЗЕН|ВЛАСН|ДОГОВОР|КУПІВЛ|ПРОДАЖ|ДАРУВАН|СПАДЩИН|СПАДКУВАН|(^|[^А-ЯІЇЄҐ])РЕЄСТРАЦ/
/** A registered "proper user" (lessee etc.) is not a change of owner. */
const NOT_OWNER = /КОРИСТУВАЧ/
/** Same owner, details changed (name / address) — even when the operation name mentions the owner. */
const SAME_OWNER = /ПРІЗВИЩ|ПРИЗВИЩ|ІМЕН|ИМЕН|ПІБ|АДРЕС|НАЙМЕНУВАН|ПЕРЕЙМЕНУВАН/

/**
 * Estimated number of owners from the registration history. The registry carries no owner
 * identity, so this counts operations that start a tenure — an estimate: unregistered sales
 * lower it, a re-registration to the same owner raises it, and history only begins in 2013.
 */
export function countOwners(actions: readonly OwnerAction[]): number {
  if (actions.length === 0) return 0

  const count = actions.filter(({ operCode, operName }) => {
    const name = operName?.toUpperCase()
    if (!name) return operCode === 100 || operCode === 300
    return OWNER_START.test(name) && !SAME_OWNER.test(name) && !NOT_OWNER.test(name)
  }).length

  return Math.max(count, 1)
}
