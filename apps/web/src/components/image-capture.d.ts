// `ImageCapture` isn't in the TS DOM lib; Chrome on Android ships it, Safari/Firefox don't (feature-detect before use).
declare class ImageCapture {
  constructor(track: MediaStreamTrack)
  takePhoto(): Promise<Blob>
}

interface Window {
  ImageCapture?: typeof ImageCapture
}
