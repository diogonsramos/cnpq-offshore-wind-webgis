import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs/promises'
import { constants } from 'fs'

const DATA_ROOT = '/mnt/e/cnpq_webgis/data'

const MIME: Record<string, string> = {
  '.tif': 'image/tiff', '.geojson': 'application/geo+json',
  '.json': 'application/json', '.parquet': 'application/octet-stream',
}

function serveDir(urlPrefix: string, fsDir: string) {
  const prefix = new RegExp('^' + urlPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return (req: any, res: any, next: any) => {
    const urlPath = (req.url || '').replace(prefix, '').replace(/^\//, '')
    const filePath = path.join(fsDir, urlPath)
    if (!filePath.startsWith(fsDir)) { res.statusCode = 403; return res.end() }
    ;(async () => {
      try {
        await fs.access(filePath, constants.R_OK)
        const stat = await fs.stat(filePath)
        if (!stat.isFile()) { res.statusCode = 404; return res.end() }
        const fileSize = stat.size
        const ext = path.extname(filePath).toLowerCase()
        const range = req.headers.range
        const fd = await fs.open(filePath, 'r')
        try {
          if (range) {
            const parts = range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
            const chunkSize = end - start + 1
            const buf = Buffer.alloc(chunkSize)
            await fd.read(buf, 0, chunkSize, start)
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize,
              'Content-Type': MIME[ext] || 'application/octet-stream',
            })
            res.end(buf)
          } else {
            const readBuf = Buffer.alloc(fileSize)
            const { bytesRead } = await fd.read(readBuf, 0, fileSize, 0)
            res.writeHead(200, {
              'Content-Length': fileSize,
              'Content-Type': MIME[ext] || 'application/octet-stream',
              'Accept-Ranges': 'bytes',
            })
            res.end(readBuf.subarray(0, bytesRead))
          }
        } finally {
          await fd.close()
        }
      } catch { next() }
    })()
  }
}

function cogServer() {
  return {
    name: 'cog-server',
    configureServer(server: any) {
      server.middlewares.use('/data/cogs/', (req: any, res: any, next: any) => {
        const urlPath = (req.url || '').replace(/^\/data\/cogs\//, '')
        const filePath = path.join(DATA_ROOT, 'cog', urlPath)
        const COG_ROOT = path.join(DATA_ROOT, 'cog')
        if (!filePath.startsWith(COG_ROOT)) return next()
        ;(async () => {
          try {
            await fs.access(filePath, constants.R_OK)
            const stat = await fs.stat(filePath)
            if (!stat.isFile()) { res.statusCode = 404; return res.end() }
            const fileSize = stat.size
            const mime = filePath.endsWith('.tif') ? 'image/tiff' : 'application/octet-stream'
            const range = req.headers.range
            const fd = await fs.open(filePath, 'r')
            try {
              if (range) {
                const parts = range.replace(/bytes=/, '').split('-')
                const start = parseInt(parts[0], 10)
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
                const chunkSize = end - start + 1
                const buf = Buffer.alloc(chunkSize)
                await fd.read(buf, 0, chunkSize, start)
                res.writeHead(206, {
                  'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': chunkSize,
                  'Content-Type': mime,
                })
                res.end(buf)
              } else {
                const readBuf = Buffer.alloc(fileSize)
                const { bytesRead } = await fd.read(readBuf, 0, fileSize, 0)
                res.writeHead(200, {
                  'Content-Length': fileSize,
                  'Content-Type': mime,
                  'Accept-Ranges': 'bytes',
                })
                res.end(readBuf.subarray(0, bytesRead))
              }
            } finally {
              await fd.close()
            }
          } catch { next() }
        })()
      })
      server.middlewares.use('/data/shp/', serveDir('/data/shp/', path.join(DATA_ROOT, 'shp')))
      server.middlewares.use('/data/geoparquet/', serveDir('/data/geoparquet/', path.join(DATA_ROOT, 'geoparquet')))
    },
  }
}

export default defineConfig({
  plugins: [react(), cogServer()],
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: ['..'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ['plotly.js-dist-min'],
        },
      },
    },
  },
})
