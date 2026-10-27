// Token Weather: a live forecast of the context window, above the prompt.
import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

import type { TokenWeatherReading } from '../types'

type Dollar = Parameters<Hook<'session.start'>>[0]

const HISTORY = 12
const BARS = '▁▂▃▄▅▆▇█'
const FORECAST = [
  { upTo: 25, icon: '☀', word: 'Clear', color: 'yellow' },
  { upTo: 50, icon: '☁', word: 'Cloudy', color: 'cyan' },
  { upTo: 75, icon: '☂', word: 'Showers', color: 'blue' },
  { upTo: 90, icon: '☇', word: 'Storm', color: 'magenta' },
  { upTo: Infinity, icon: '↯', word: 'Compact soon', color: 'red' }
] as const

const readings = atom({ plugin: 'token-weather', key: 'readings' } as const, [] as TokenWeatherReading[])

const short = (n: number) => {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`
  return String(n)
}

const sparkline = (history: TokenWeatherReading[]) => {
  const top = Math.max(...history.map(r => r.tokens), 1)
  return history.map(r => BARS[Math.floor((r.tokens / top) * (BARS.length - 1))]).join('')
}

const trend = (history: TokenWeatherReading[]) => {
  const delta = history[history.length - 1].tokens - history[history.length - 2].tokens
  if (delta === 0) return '  steady'
  return delta > 0 ? `  ▲ +${short(delta)} last turn` : `  ▼ ${short(-delta)} last turn`
}

// Top level on purpose: the engine only lets `$` flow into functions declared at the top of the file.
const takeReading = async ($: Dollar) => {
  const { context } = await $.session.usage()
  if (!context.window) return

  const tokens = context.tokens ?? 0
  const percent = context.percent ?? Math.round((tokens / context.window) * 100)
  await update($, readings, history => [...history, { tokens, window: context.window, percent }].slice(-HISTORY))
}

export const register: Register = (on, options) => {
  const isEnabled = options.enabled !== false
  const isSparkline = options.showSparkline !== false
  const isNotice = options.showStartupNotice !== false

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await takeReading($)
    if (isNotice) {
      $.ui.toast('Token Weather loaded')
    }
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId) {
      await takeReading($) // main-loop turns only, not subagents
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const history = await read($, readings)
    if (!isEnabled || e.props.hasSurvey || history.length === 0) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const now = history[history.length - 1]
    const f = FORECAST.find(b => now.percent < b.upTo) ?? FORECAST[FORECAST.length - 1]
    const isWide = isSparkline && e.props.bodyColumns >= 60

    return (
      <Box flexDirection="row" paddingX={1}>
        <Text color={f.color} bold>
          {f.icon} {f.word}
        </Text>
        <Text>{`  ${now.percent}% of context`}</Text>
        <Text dimColor>{`  ${short(now.tokens)} / ${short(now.window)}`}</Text>
        {isWide && <Text dimColor>{'   last turns '}</Text>}
        {isWide && <Text color={f.color}>{sparkline(history)}</Text>}
        {isWide && history.length > 1 && <Text dimColor>{trend(history)}</Text>}
      </Box>
    )
  })
}
