/// <reference lib="webworker" />
import { encodeJpeg } from '@/lib/image-encode'

// Decode, downscale and JPEG-encode off the main thread: a 12 MP photo otherwise blocks the UI for a second or more.
// Replies with the JPEG blob, or null when the browser can't decode the file (the caller then uploads the original).
self.onmessage = async (event: MessageEvent<File>): Promise<void> => {
  try {
    const bitmap = await createImageBitmap(event.data)
    const blob = await encodeJpeg(bitmap)
    self.postMessage(blob)
  } catch {
    self.postMessage(null)
  }
}
