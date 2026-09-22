/**
 * Registration offices (`dep`) aren't geocoded yet — this searches by name as
 * a stand-in until real coordinates land, without changing the call site.
 */
export function depMapsUrl(dep: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dep)}`
}
