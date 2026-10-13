import { Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

import type { Lang } from '../spa/spa-text.js'

import { CHROME_TEXT, CODE_TEXT, NOTICE_TEXT, fill } from './mail-text.js'
import type { CodeMailKind, NoticeMailKind } from './mail-text.js'

// Email clients only reliably support sRGB hex — no oklch / P3 / CSS variables here.
const COLOR = {
  bg: '#f4f5f7',
  card: '#ffffff',
  text: '#1d2129',
  muted: '#6b7280',
  accent: '#2563eb',
  border: '#e5e7eb'
}

const styles = {
  body: { backgroundColor: COLOR.bg, margin: 0, padding: '24px 0', fontFamily: 'Arial, Helvetica, sans-serif' },
  card: {
    backgroundColor: COLOR.card,
    border: `1px solid ${COLOR.border}`,
    borderRadius: 12,
    padding: '28px 32px',
    maxWidth: 480
  },
  brand: { fontSize: 14, fontWeight: 700, color: COLOR.accent, margin: '0 0 16px' },
  heading: { fontSize: 22, fontWeight: 700, color: COLOR.text, margin: '0 0 12px' },
  text: { fontSize: 15, lineHeight: '22px', color: COLOR.text, margin: '0 0 12px' },
  code: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: 8,
    color: COLOR.text,
    backgroundColor: COLOR.bg,
    borderRadius: 8,
    padding: '14px 0',
    textAlign: 'center' as const,
    margin: '16px 0',
    fontFamily: 'Consolas, Menlo, monospace'
  },
  button: {
    backgroundColor: COLOR.accent,
    color: '#ffffff',
    borderRadius: 8,
    padding: '12px 22px',
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none'
  },
  muted: { fontSize: 13, lineHeight: '19px', color: COLOR.muted, margin: '0 0 8px' },
  link: { fontSize: 12, color: COLOR.accent, wordBreak: 'break-all' as const },
  hr: { borderColor: COLOR.border, margin: '20px 0 12px' }
}

type LayoutProps = { lang: Lang; preview: string; children: ReactNode }

function Layout({ lang, preview, children }: LayoutProps): ReactNode {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.card}>
          <Text style={styles.brand}>carsua.app</Text>
          {children}
          <Hr style={styles.hr} />
          <Text style={styles.muted}>{CHROME_TEXT[lang].footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export type CodeEmailProps = {
  kind: CodeMailKind
  lang: Lang
  code: string
  /** Magic link — only sign-in mails carry one; set-email / re-auth mails are code-only. */
  link: string | null
  minutes: number
  /** Human-readable requester, e.g. "Chrome on Windows". */
  device: string
}

export function CodeEmail({ kind, lang, code, link, minutes, device }: CodeEmailProps): ReactNode {
  const text = CODE_TEXT[kind][lang]
  const chrome = CHROME_TEXT[lang]
  return (
    <Layout lang={lang} preview={text.subject(code)}>
      <Text style={styles.heading}>{text.heading}</Text>
      <Text style={styles.text}>{text.intro}</Text>
      <Text style={styles.muted}>{chrome.codeLabel}</Text>
      <Text style={styles.code}>{code}</Text>
      {link ? (
        <Section style={{ textAlign: 'center', margin: '8px 0 16px' }}>
          <Button href={link} style={styles.button}>
            {text.button}
          </Button>
        </Section>
      ) : null}
      <Text style={styles.muted}>{text.expires(minutes)}</Text>
      <Text style={styles.muted}>{text.requestedFrom(device)}</Text>
      <Text style={styles.muted}>{text.ignore}</Text>
      {link ? (
        <>
          <Text style={styles.muted}>{chrome.linkFallback}</Text>
          <Link href={link} style={styles.link}>
            {link}
          </Link>
        </>
      ) : null}
    </Layout>
  )
}

export type NoticeEmailProps = {
  kind: NoticeMailKind
  lang: Lang
  /** Substituted into `{device}`, `{time}`, `{days}`, `{email}`. */
  values: Record<string, string>
  link: string | null
}

export function NoticeEmail({ kind, lang, values, link }: NoticeEmailProps): ReactNode {
  const text = NOTICE_TEXT[kind][lang]
  return (
    <Layout lang={lang} preview={text.heading}>
      <Text style={styles.heading}>{text.heading}</Text>
      <Text style={styles.text}>{fill(text.body, values)}</Text>
      {text.button && link ? (
        <Section style={{ margin: '8px 0 16px' }}>
          <Button href={link} style={styles.button}>
            {text.button}
          </Button>
        </Section>
      ) : null}
      <Text style={styles.muted}>{text.ignore}</Text>
    </Layout>
  )
}
