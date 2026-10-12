import type { SirenTone } from './config'

/**
 * Procedural sound (Web Audio) — no audio files, so nothing extra to download or license. Engine and effects stay silent
 * until `setEnabled(true)`; the AudioContext is only created from the viewer's own click (autoplay policies): the sound
 * toggle, the siren toggle or the horn.
 */
export type Sound = {
  setEnabled: (on: boolean) => void
  /** Called every game step: engine pitch follows speed, a rumble plays while off the tarmac. */
  update: (speedPercent: number, offRoad: boolean) => void
  /** The siren wails until switched off; it ignores the sound toggle (the viewer asked for it explicitly). */
  setSiren: (on: boolean, tone?: SirenTone) => void
  /** The horn blares while held (`hz` = its lower note); also independent of the sound toggle. */
  setHorn: (on: boolean, hz: number) => void
  crash: () => void
  lap: () => void
  destroy: () => void
}

const CRASH_COOLDOWN_MS = 400
const MASTER_VOLUME = 0.18
const SIREN_LEVEL = 0.35
const HORN_LEVEL = 0.7
/** The horn's second note sits a major third above the first. */
const HORN_THIRD = 1.26

/** A running looped sound (siren, horn): `stop` fades it out and frees its nodes. */
type Voice = { stop: () => void }

function noiseBuffer(ac: AudioContext): AudioBuffer {
  const buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

export function createSound(): Sound {
  let ac: AudioContext | null = null
  let enabled = false
  let lastCrash = 0
  let engineGain: GainNode
  let engineFilter: BiquadFilterNode
  let osc: OscillatorNode
  let osc2: OscillatorNode
  let rumbleGain: GainNode
  let master: GainNode
  let noise: AudioBuffer
  let siren: Voice | null = null
  let horn: Voice | null = null

  function build(): AudioContext {
    const ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = MASTER_VOLUME
    master.connect(ctx.destination)

    engineFilter = ctx.createBiquadFilter()
    engineFilter.type = 'lowpass'
    engineFilter.frequency.value = 400
    engineGain = ctx.createGain()
    engineGain.gain.value = 0
    engineFilter.connect(engineGain).connect(master)
    osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.connect(engineFilter)
    osc.start()
    osc2 = ctx.createOscillator()
    osc2.type = 'square'
    osc2.detune.value = 7
    osc2.connect(engineFilter)
    osc2.start()

    noise = noiseBuffer(ctx)
    const rumble = ctx.createBufferSource()
    rumble.buffer = noise
    rumble.loop = true
    const rumbleFilter = ctx.createBiquadFilter()
    rumbleFilter.type = 'bandpass'
    rumbleFilter.frequency.value = 350
    rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0
    rumble.connect(rumbleFilter).connect(rumbleGain).connect(master)
    rumble.start()
    return ctx
  }

  function ensure(): AudioContext {
    ac ??= build()
    void ac.resume()
    return ac
  }

  /** The context only sleeps when nothing is meant to be audible. */
  function suspendIfIdle(): void {
    if (ac && !enabled && !siren && !horn) void ac.suspend()
  }

  function beep(freq: number, at: number, length: number): void {
    if (!ac) return
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = 'triangle'
    o.frequency.value = freq
    g.gain.setValueAtTime(0.5, ac.currentTime + at)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + at + length)
    o.connect(g).connect(master)
    o.start(ac.currentTime + at)
    o.stop(ac.currentTime + at + length)
  }

  /** `oscs` through a low-pass and a fading gain into the master bus; `extra` are helper nodes (LFOs) stopped with them. */
  function voice(
    oscs: OscillatorNode[],
    extra: OscillatorNode[],
    cutoff: number,
    level: number,
    attack: number
  ): Voice {
    const ctx = ensure()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(level, ctx.currentTime + attack)
    filter.connect(gain).connect(master)
    for (const o of oscs) {
      o.connect(filter)
      o.start()
    }
    for (const o of extra) o.start()
    return {
      stop() {
        const t = ctx.currentTime
        gain.gain.cancelScheduledValues(t)
        gain.gain.setValueAtTime(gain.gain.value, t)
        gain.gain.linearRampToValueAtTime(0, t + 0.06)
        for (const o of [...oscs, ...extra]) o.stop(t + 0.08)
      }
    }
  }

  function startSiren(tone: SirenTone): Voice {
    const ctx = ensure()
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = tone.centre
    const lfo = ctx.createOscillator()
    lfo.type = tone.shape
    lfo.frequency.value = tone.rate
    const depth = ctx.createGain()
    depth.gain.value = tone.depth
    lfo.connect(depth).connect(o.frequency)
    return voice([o], [lfo], 2600, SIREN_LEVEL, 0.05)
  }

  function startHorn(hz: number): Voice {
    const ctx = ensure()
    const oscs = [hz, hz * HORN_THIRD].map(f => {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      return o
    })
    return voice(oscs, [], 2000, HORN_LEVEL, 0.02)
  }

  return {
    setEnabled(on) {
      enabled = on
      if (on) {
        ensure()
      } else if (ac) {
        engineGain.gain.value = 0
        rumbleGain.gain.value = 0
        suspendIfIdle()
      }
    },
    update(speedPercent, offRoad) {
      if (!enabled || !ac) return
      const t = ac.currentTime
      const freq = 48 + speedPercent * 200
      osc.frequency.setTargetAtTime(freq, t, 0.06)
      osc2.frequency.setTargetAtTime(freq * 0.5, t, 0.06)
      engineFilter.frequency.setTargetAtTime(280 + speedPercent * 1400, t, 0.08)
      engineGain.gain.setTargetAtTime(speedPercent > 0.01 ? 0.3 + speedPercent * 0.3 : 0.18, t, 0.08)
      rumbleGain.gain.setTargetAtTime(offRoad ? 0.25 + speedPercent * 0.6 : 0, t, 0.05)
    },
    setSiren(on, tone) {
      siren?.stop()
      siren = on && tone ? startSiren(tone) : null
      suspendIfIdle()
    },
    setHorn(on, hz) {
      if (on === !!horn) return
      horn?.stop()
      horn = on ? startHorn(hz) : null
      suspendIfIdle()
    },
    crash() {
      if (!enabled || !ac) return
      const now = performance.now()
      if (now - lastCrash < CRASH_COOLDOWN_MS) return
      lastCrash = now
      const t = ac.currentTime
      const src = ac.createBufferSource()
      src.buffer = noise
      const filter = ac.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 700
      const g = ac.createGain()
      g.gain.setValueAtTime(0.9, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      src.connect(filter).connect(g).connect(master)
      src.start(t)
      src.stop(t + 0.4)
      const thump = ac.createOscillator()
      const tg = ac.createGain()
      thump.frequency.setValueAtTime(120, t)
      thump.frequency.exponentialRampToValueAtTime(35, t + 0.3)
      tg.gain.setValueAtTime(0.9, t)
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      thump.connect(tg).connect(master)
      thump.start(t)
      thump.stop(t + 0.3)
    },
    lap() {
      if (!enabled) return
      beep(880, 0, 0.18)
      beep(1320, 0.18, 0.3)
    },
    destroy() {
      enabled = false
      siren = null
      horn = null
      void ac?.close()
      ac = null
    }
  }
}
