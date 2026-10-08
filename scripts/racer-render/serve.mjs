// Local helper for the racer sprite render: serves render.html + the Kenney GLBs and saves PNGs POSTed by the page.
// Usage: node scripts/racer-render/serve.mjs <kit "Models/GLB format" dir> <out dir> [photos dir for /bg]
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const [modelsDir, outDir, photosDir] = process.argv.slice(2)
if (!modelsDir || !outDir) throw new Error('usage: serve.mjs <modelsDir> <outDir>')
mkdirSync(outDir, { recursive: true })

const TYPES = { '.html': 'text/html', '.glb': 'model/gltf-binary', '.png': 'image/png', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (req.method === 'POST' && url.pathname === '/save') {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      writeFileSync(join(outDir, basename(url.searchParams.get('name'))), Buffer.concat(chunks))
      res.end('ok')
    })
    return
  }
  const file =
    url.pathname === '/'
      ? join(here, 'render.html')
      : url.pathname === '/preview'
        ? join(here, 'preview.html')
        : url.pathname === '/bg'
        ? join(here, 'backdrop.html')
        : url.pathname.startsWith('/photos/') && photosDir
          ? join(photosDir, basename(url.pathname))
          : existsSync(join(modelsDir, basename(url.pathname)))
            ? join(modelsDir, basename(url.pathname))
            : join(outDir, basename(url.pathname)) // already-saved sprites, to inspect them (plate rects)
  if (!existsSync(file)) {
    res.statusCode = 404
    return res.end('nf')
  }
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  res.setHeader('content-type', TYPES[ext] ?? 'application/octet-stream')
  res.end(readFileSync(file))
}).listen(8765, () => console.log('racer-render on http://localhost:8765'))
