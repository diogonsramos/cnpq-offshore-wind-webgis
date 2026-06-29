import { fromUrl } from 'geotiff'

export interface RasterBounds {
  west: number
  south: number
  east: number
  north: number
}

function canvasSize(zoom: number): number {
  if (zoom < 4) return 256
  if (zoom < 6) return 384
  if (zoom < 8) return 512
  return 768
}

const WS: [number, [number, number, number, number]][] = [
  [0, [40, 20, 80, 160]], [2, [30, 50, 170, 180]],
  [3, [20, 90, 200, 190]], [4, [15, 140, 210, 200]],
  [5, [10, 175, 190, 210]], [6, [20, 190, 140, 215]],
  [7, [60, 200, 100, 220]], [8, [130, 210, 60, 225]],
  [9, [200, 210, 40, 230]], [10, [240, 190, 30, 235]],
  [11, [250, 140, 25, 240]], [12, [245, 90, 20, 240]],
  [14, [220, 40, 25, 245]], [16, [180, 20, 30, 250]],
]

const PD: [number, [number, number, number, number]][] = [
  [0, [40, 20, 80, 160]], [100, [20, 90, 200, 190]],
  [200, [10, 175, 190, 210]], [400, [60, 200, 100, 220]],
  [600, [200, 210, 40, 230]], [800, [250, 140, 25, 240]],
  [1200, [245, 90, 20, 240]], [2000, [180, 20, 30, 250]],
]

function lerpColor(value: number, stops: [number, [number, number, number, number]][]): [number, number, number, number] {
  if (value <= stops[0][0]) return stops[0][1]
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i]
    const [v1, c1] = stops[i + 1]
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
        Math.round(c0[3] + (c1[3] - c0[3]) * t),
      ]
    }
  }
  return stops[stops.length - 1][1]
}

export async function renderCog(
  url: string,
  bounds: RasterBounds,
  zoom: number,
  variable: 'ws' | 'wpd',
  signal?: AbortSignal,
): Promise<{ dataUrl: string; coords: [number, number, number, number] } | null> {
  try {
    if (signal?.aborted) return null
    const tiff = await fromUrl(url)
    const img = await tiff.getImage()
    const [w, s, e, n] = img.getBoundingBox()
    const iw = img.getWidth()
    const ih = img.getHeight()

    const nw = Math.max(w, bounds.west)
    const ne = Math.min(e, bounds.east)
    const ns = Math.max(s, bounds.south)
    const nn = Math.min(n, bounds.north)
    if (ne <= nw || nn <= ns) return null

    const pxW = (e - w) / iw
    const pxH = (n - s) / ih

    const x0 = Math.round((nw - w) / pxW)
    const x1 = Math.round((ne - w) / pxW)
    const y0 = Math.round((n - nn) / pxH)
    const y1 = Math.round((n - ns) / pxH)

    const sw = Math.max(1, x1 - x0)
    const sh = Math.max(1, y1 - y0)

    const cw = Math.min(canvasSize(zoom), sw)
    const ch = Math.max(1, Math.round(cw * (sh / sw)))

    const [raster] = await img.readRasters({
      window: [x0, y0, x1, y1],
      width: cw,
      height: ch,
      interleave: false,
    })
    const band = raster as Float32Array
    const stops = variable === 'ws' ? WS : PD

    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')!
    const id = ctx.createImageData(cw, ch)
    const pix = id.data

    for (let r = 0; r < ch; r++) {
      for (let c = 0; c < cw; c++) {
        const i = r * cw + c
        const off = i * 4
        const v = band[i]
        if (v === -9999 || isNaN(v)) {
          pix[off + 3] = 0
          continue
        }
        const rgba = lerpColor(v, stops)
        pix[off] = rgba[0]
        pix[off + 1] = rgba[1]
        pix[off + 2] = rgba[2]
        pix[off + 3] = rgba[3]
      }
    }
    ctx.putImageData(id, 0, 0)

    const lonW = w + x0 * pxW
    const lonE = w + x1 * pxW
    const latN = n - y0 * pxH
    const latS = n - y1 * pxH

    return {
      dataUrl: canvas.toDataURL('image/png'),
      coords: [lonW, latS, lonE, latN],
    }
  } catch (err) {
    console.error('COG:', err)
    return null
  }
}
