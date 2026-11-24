"""Startup config of the ALPR service (step 4 of docs/security-wiki.md). Run inside the image: `pnpm alpr:test`.

Each case imports `app` in a child process: the key check runs before the models load, so the failing case is fast.
"""

import os
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).parent


def _run(code: str, **env: str) -> subprocess.CompletedProcess[str]:
    base = {k: v for k, v in os.environ.items() if k not in ("ALPR_API_KEY", "ALPR_ALLOW_NO_KEY")}
    return subprocess.run(
        [sys.executable, "-c", code], cwd=HERE, env={**base, **env}, capture_output=True, text=True, timeout=300
    )


class StartupConfig(unittest.TestCase):
    def test_exits_without_a_key(self) -> None:
        result = _run("import app")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ALPR_API_KEY", result.stderr)

    def test_dev_opt_out_starts_without_a_key(self) -> None:
        self.assertEqual(_run("import app", ALPR_ALLOW_NO_KEY="1").returncode, 0)

    def test_docs_are_not_served(self) -> None:
        code = (
            "import app\n"
            "assert app.app.docs_url is None and app.app.redoc_url is None and app.app.openapi_url is None\n"
            "paths = {r.path for r in app.app.routes}\n"
            "assert not paths & {'/docs', '/redoc', '/openapi.json'}, paths\n"
        )
        result = _run(code, ALPR_API_KEY="test-key")
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
