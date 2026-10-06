import { infocarBrandSlug } from './infocarLookup.js'

export type SocialChannel = {
  /** Stable key stored in `social_posts.channel`: the infocar brand slug for a make, `group:<id>` for a group. */
  id: string
  kind: 'make' | 'group'
  name: string
  /** YouTube channel id (`UC…`), the key of the channel's public RSS feed. */
  youtubeId: string
  /** Infocar brand slugs the channel speaks for (a make: just itself). */
  brands: string[]
}

/** `[infocar brand slug, channel title, YouTube channel id]` — official global channel where one exists. */
const MAKES: ReadonlyArray<readonly [string, string, string]> = [
  ['audi', 'Audi', 'UCO5ujNeWRIwP4DbCZqZWcLw'],
  ['bmw', 'BMW', 'UCYwrS5QvBY_JbSdbINLey6Q'],
  ['mini', 'MINI', 'UCuCQXqQLAQuTObCGlTYDE3w'],
  ['mercedes', 'Mercedes-Benz', 'UClj0L8WZrVydk5xKOscI6-A'],
  ['volkswagen', 'Volkswagen', 'UC0US_GEXVmwMH04OMcNuhpQ'],
  ['porsche', 'Porsche', 'UC_BaxRhNREI_V0DVXjXDALA'],
  ['skoda', 'Škoda', 'UCjG24cC7xIEkVtxKdhHDwtg'],
  ['seat', 'SEAT', 'UCAibUHzsaJehlu7H5ZSHWow'],
  ['cupra', 'CUPRA Official', 'UCfsWpI_CXDSs39uVPo5c92Q'],
  ['opel', 'Opel', 'UCSr5PuKiJ5Zi00zfsiT-7jA'],
  ['peugeot', 'Peugeot', 'UC1VOZroPEnEaDDEqnMtdgiw'],
  ['citroen', 'Citroën Brasil', 'UC50iiu3RcPIVk126O2ANJ1g'],
  ['fiat', 'Fiat', 'UC_nBvBIV0K6P5C3tA27Hwrg'],
  ['alfa-romeo', 'Alfa Romeo', 'UCZ0KUEiciMan-aG7e1mr4uA'],
  ['jeep', 'Jeep', 'UCMWLdSdAyDcCy_OVzONKm0w'],
  ['dodge', 'Dodge', 'UC6NMqrESrKioKr9axv_YM7w'],
  ['chrysler', 'Chrysler', 'UCTrYqPWfAOku2Wkdxer4DRQ'],
  ['maserati', 'Maserati', 'UCrragB5FbqfGKWyXoD-UAEg'],
  ['chevrolet', 'Chevrolet', 'UCSVpCNZzOeMekuMiFze3fnQ'],
  ['cadillac', 'Cadillac', 'UCMMTsbfETvrSwwcvB7VE-iw'],
  ['buick', 'Buick', 'UCZmCWjcFeojrg_s3bN2Ek4w'],
  ['gmc', 'GMC', 'UCVcZB2_5HBDVtw8B9c4tIHw'],
  ['ford', 'Ford Motor Company', 'UCKA96UxTdgFBwGZMGZ-135w'],
  ['lincoln', 'Lincoln', 'UCZ_rMh5GlBHjjw3vLh1Xqvg'],
  ['tesla', 'Tesla', 'UC5WjFrtBdufl6CZojX3D8dQ'],
  ['renault', 'Renault', 'UC_5f-QXvYZ6_btITN7IpatQ'],
  ['volvo', 'Volvo Cars', 'UCaY-4ndPCRKp60qXF7zBJ0w'],
  ['jaguar', 'Jaguar', 'UCU3MVTYYP82UKA9I_WDpRGw'],
  ['bentley', 'Bentley Motors', 'UC0KPOSoAX5aOjtIGGoA0UFg'],
  ['lamborghini', 'Lamborghini', 'UC9DXZC8BCDOW6pYAQKgozqw'],
  ['smart', 'smart', 'UCJsZpxZGgpvgn4sF2Rs6l9g'],
  ['toyota', 'Toyota Global', 'UCu2Nnh9SBz5ax3NQFEnInyg'],
  ['lexus', 'Lexus', 'UCEDHfFp2GZonrhuAaz7VjPw'],
  ['honda', 'Honda', 'UC22zQ9nBEk6KOjUWqR5XXZg'],
  ['nissan', 'Nissan', 'UCIpK0Bh0wFnC-QqgJs6hx5w'],
  ['infiniti', 'INFINITI USA', 'UCJdhI5r-WPakBfpyMh0VmwA'],
  ['mazda', 'Mazda USA', 'UC0Ihuy4gj2w-AYEQXRnUdUA'],
  ['subaru', 'Subaru', 'UCw0N2zPZlYsrUcVIJkI6mBA'],
  ['mitsubishi', 'Mitsubishi Motors Global', 'UCRFlVtvzVnLEiRk9AScqjpg'],
  ['hyundai', 'HyundaiUSA', 'UCx_eAZKDceT1yaY4bRo636A'],
  ['kia', 'Kia America', 'UCbp3o7U6oSa6s-LQBZvOnGg'],
  ['genesis', 'Genesis', 'UChv9FR8xwUxEkdBUVu4VUOw'],
  ['byd', 'BYD Global', 'UCHlKiZpRUfYpxgiNrFzpjbA'],
  ['geely', 'Geely International', 'UC86W3wr3b8JlsRZlgWBizRg'],
  ['mg', 'MG Motor Europe', 'UCRkzXwI_w2sikVu0ADnHd6g'],
  ['tata', 'Tata Motors', 'UCGk_EOyEtbl-XdbVHRPwnfQ'],
  ['harley-davidson', 'Harley-Davidson', 'UCbqVd7XZqpqidIpdblY9dhQ'],
  ['ducati', 'Ducati', 'UCzGsJzGNCfvY9x6Ij2XiODw'],
  ['ktm', 'KTM', 'UCb3-KtEqkRuJeT2ekC5Mzow'],
  ['yamaha', 'Yamaha Motor Global', 'UCEe7dmonT8QIBwbd2l9gxIA']
]

/** `[group id, channel title, YouTube channel id, brand slugs]` — the parent company's channel, the fallback for its makes. */
const GROUPS: ReadonlyArray<readonly [string, string, string, readonly string[]]> = [
  ['bmw-group', 'BMW Group', 'UCv_N2TJ6EBx56eMUK8GwhDQ', ['bmw', 'mini']],
  ['gm', 'General Motors', 'UCxN-Csvy_9sveql5HJviDjA', ['chevrolet', 'cadillac', 'buick', 'gmc']],
  ['renault-group', 'Renault Group', 'UCjpe-FourUgOLzzPu9qV4qg', ['renault', 'dacia']],
  ['hyundai-group', 'Hyundai Motor Group', 'UCP9ejqW5kzOIl33vpCPQ-kw', ['hyundai', 'kia', 'genesis']]
]

export const SOCIAL_CHANNELS: readonly SocialChannel[] = [
  ...MAKES.map(([slug, name, youtubeId]): SocialChannel => ({
    id: slug,
    kind: 'make',
    name,
    youtubeId,
    brands: [slug]
  })),
  ...GROUPS.map(([id, name, youtubeId, brands]): SocialChannel => ({
    id: `group:${id}`,
    kind: 'group',
    name,
    youtubeId,
    brands: [...brands]
  }))
]

/** The channels that speak for a registry brand: its own first, then its parent group's. Empty = no widget. */
export function socialChannelsFor(brand: string | null | undefined): SocialChannel[] {
  const slug = infocarBrandSlug(brand)
  if (!slug) return []
  const matches = SOCIAL_CHANNELS.filter(c => c.brands.includes(slug))
  return [...matches.filter(c => c.kind === 'make'), ...matches.filter(c => c.kind === 'group')]
}

export const youtubeChannelUrl = (youtubeId: string): string => `https://www.youtube.com/channel/${youtubeId}`
export const youtubeFeedUrl = (youtubeId: string): string =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeId}`
