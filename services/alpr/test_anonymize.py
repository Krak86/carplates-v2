"""Run inside the ALPR image (no extra dependency): `pnpm alpr:test`.

The face-detection cases need a photo with a person; none is committed (own photos, PII), so they read
`eval/faces/*` (gitignored, see eval-faces.mjs) and skip when it is absent.
"""

import io
import unittest
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import anonymize

FACES_DIR = Path(__file__).parent / "eval" / "faces"


def _jpeg(frame: np.ndarray, exif: bytes | None = None) -> bytes:
    out = io.BytesIO()
    kwargs = {"exif": exif} if exif else {}
    Image.fromarray(frame[:, :, ::-1]).save(out, "JPEG", quality=92, **kwargs)
    return out.getvalue()


def _noise(height: int, width: int) -> np.ndarray:
    return np.random.default_rng(1).integers(0, 255, (height, width, 3), dtype=np.uint8)


class BlurBoxes(unittest.TestCase):
    def test_changes_only_the_padded_box(self) -> None:
        frame = _noise(200, 300)
        out = anonymize.blur_boxes(frame, [(100, 80, 40, 40)])
        pad = round(40 * anonymize.BOX_PAD)
        inside = (slice(80 - pad, 120 + pad), slice(100 - pad, 140 + pad))
        self.assertFalse(np.array_equal(out[inside], frame[inside]))
        mask = np.ones(frame.shape[:2], bool)
        mask[inside] = False
        self.assertTrue(np.array_equal(out[mask], frame[mask]))

    def test_does_not_mutate_the_input(self) -> None:
        frame = _noise(100, 100)
        before = frame.copy()
        anonymize.blur_boxes(frame, [(10, 10, 50, 50)])
        self.assertTrue(np.array_equal(frame, before))

    def test_removes_detail(self) -> None:
        frame = _noise(200, 200)
        out = anonymize.blur_boxes(frame, [(50, 50, 100, 100)])
        self.assertLess(out[40:160, 40:160].std(), frame[40:160, 40:160].std() / 4)

    def test_box_past_the_edge_is_clipped(self) -> None:
        frame = _noise(100, 100)
        out = anonymize.blur_boxes(frame, [(80, 80, 60, 60), (-30, -30, 40, 40), (500, 500, 10, 10)])
        self.assertEqual(out.shape, frame.shape)


class Anonymize(unittest.TestCase):
    def test_no_face_keeps_pixels_and_reports_zero(self) -> None:
        frame = np.full((240, 320, 3), 127, np.uint8)
        jpeg, faces = anonymize.anonymize(_jpeg(frame))
        self.assertEqual(faces, 0)
        decoded = cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_COLOR)
        self.assertEqual(decoded.shape, frame.shape)
        self.assertLess(int(np.abs(decoded.astype(int) - frame).max()), 6)

    def test_output_has_no_exif(self) -> None:
        exif = Image.Exif()
        exif[0x010F] = "SecretMaker"
        jpeg, _ = anonymize.anonymize(_jpeg(_noise(120, 160), exif.tobytes()))
        self.assertNotIn(b"Exif", jpeg[:64])
        self.assertNotIn(b"SecretMaker", jpeg)
        self.assertEqual(len(Image.open(io.BytesIO(jpeg)).getexif()), 0)

    def test_exif_orientation_is_applied(self) -> None:
        exif = Image.Exif()
        exif[0x0112] = 6  # rotate 90 deg clockwise to display
        jpeg, _ = anonymize.anonymize(_jpeg(_noise(100, 200), exif.tobytes()))
        self.assertEqual(Image.open(io.BytesIO(jpeg)).size, (100, 200))

    def test_not_an_image(self) -> None:
        with self.assertRaises(anonymize.UndecodableImage):
            anonymize.anonymize(b"definitely not an image")

    def test_model_is_present(self) -> None:
        self.assertTrue(anonymize.MODEL_PATH.is_file())
        self.assertLess(anonymize.MODEL_PATH.stat().st_size, 1_000_000)


@unittest.skipUnless(FACES_DIR.is_dir() and any(FACES_DIR.glob("*.*")), "no eval/faces photos")
class OwnPhotos(unittest.TestCase):
    def test_faces_are_found_and_blurred(self) -> None:
        total = 0
        for path in sorted(FACES_DIR.glob("*.*")):
            raw = path.read_bytes()
            frame = anonymize.decode(raw)
            boxes = anonymize.detect_faces(frame)
            total += len(boxes)
            if boxes:
                out = anonymize.blur_boxes(frame, boxes)
                x, y, w, h = boxes[0]
                region = (slice(max(0, y), y + h), slice(max(0, x), x + w))
                self.assertFalse(np.array_equal(out[region], frame[region]), path.name)
        self.assertGreater(total, 0)


if __name__ == "__main__":
    unittest.main()
