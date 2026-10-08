/**
 * Procedural sound (Web Audio) — no audio files, so nothing extra to download or license. Silent until `setEnabled(true)`;
 * the AudioContext is only created then, from the viewer's own click on the sound toggle (autoplay policies).
 */
export type Sound = {
  setEnabled: (on: boolean) => void
  /** Called every game step: engine pitch follows speed, a rumble plays while off the tarmac. */
  update: (speedPercent: number, offRoad: boolean) => void
  crash: () => void
  lap: () => void
  destroy: () => void
}

const CRASH_COOLDOWN_MS = 400
const MASTER_VOLUME = 0.18

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

  return {
    setEnabled(on) {
      enabled = on
      if (on) {
        ac ??= build()
        void ac.resume()
      } else if (ac) {
        engineGain.gain.value = 0
        rumbleGain.gain.value = 0
        void ac.suspend()
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
      void ac?.close()
      ac = null
    }
  }
}
