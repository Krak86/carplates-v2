/** From this mass the tonnes are shown too, in brackets. */
export const TONNE_FROM_KG = 1000

/** "2 601 kg (2.6 t)" — kilograms always, tonnes in brackets from 1 000 kg. */
export function formatWeight(
  kg: number,
  kgFormat: Intl.NumberFormat,
  tonneFormat: Intl.NumberFormat,
  kgUnit: string,
  tonneUnit: string
): string {
  const base = `${kgFormat.format(Math.round(kg))} ${kgUnit}`
  return kg >= TONNE_FROM_KG ? `${base} (${tonneFormat.format(kg / 1000)} ${tonneUnit})` : base
}
