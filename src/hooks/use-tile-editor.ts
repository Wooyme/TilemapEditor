"use client"

import { useState, useCallback, useEffect } from 'react'

export type Tileset = {
  id: string
  name: string
  url: string
  width: number
  height: number
}

export type TilePosition = {
  tx: number
  ty: number
  tilesetId: string
}

export type TileSelection = {
  tx: number
  ty: number
  w: number
  h: number
  tilesetId: string
}

export type GridCell = TilePosition | null

export type Tool = 'paint' | 'eraser'
export type SelectionMode = 'single' | 'multi'

export function useTileEditor() {
  const [tilesets, setTilesets] = useState<Tileset[]>([])
  const [selectedTilesetId, setSelectedTilesetId] = useState<string | null>(null)
  const [selection, setSelection] = useState<TileSelection | null>(null)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  
  const [tileSize, setTileSize] = useState({ width: 32, height: 32 })
  const [canvasSize, setCanvasSize] = useState({ width: 20, height: 15 })
  const [grid, setGrid] = useState<GridCell[][]>([])
  const [activeTool, setActiveTool] = useState<Tool>('paint')

  // Background Image State
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5)

  // Initialize/Update grid on size change
  useEffect(() => {
    setGrid(prev => {
      const newGrid: GridCell[][] = Array(canvasSize.height)
        .fill(null)
        .map((_, y) => 
          Array(canvasSize.width)
            .fill(null)
            .map((_, x) => (prev[y] && prev[y][x]) || null)
        )
      return newGrid
    })
  }, [canvasSize.width, canvasSize.height])

  const addTileset = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const newTileset: Tileset = {
        id: crypto.randomUUID(),
        name: file.name,
        url,
        width: img.width,
        height: img.height,
      }
      setTilesets(prev => [...prev, newTileset])
      if (!selectedTilesetId) {
        setSelectedTilesetId(newTileset.id)
      }
    }
    img.src = url
  }, [selectedTilesetId])

  const handleSetBackgroundImage = useCallback((file: File) => {
    if (backgroundImage) {
      URL.revokeObjectURL(backgroundImage)
    }
    const url = URL.createObjectURL(file)
    setBackgroundImage(url)
  }, [backgroundImage])

  const removeBackgroundImage = useCallback(() => {
    if (backgroundImage) {
      URL.revokeObjectURL(backgroundImage)
    }
    setBackgroundImage(null)
  }, [backgroundImage])

  const selectTile = useCallback((tilesetId: string, tx: number, ty: number, w: number = 1, h: number = 1) => {
    setSelection({ tilesetId, tx, ty, w, h })
    setActiveTool('paint')
  }, [])

  const paintTile = useCallback((x: number, y: number) => {
    if (activeTool === 'eraser') {
      setGrid(prev => {
        const next = [...prev]
        if (next[y]) {
          next[y] = [...next[y]]
          next[y][x] = null
        }
        return next
      })
    } else if (selection) {
      setGrid(prev => {
        const next = [...prev]
        // Iterate through the selection width and height to stamp the block
        for (let i = 0; i < selection.h; i++) {
          const targetY = y + i
          if (targetY >= canvasSize.height) continue
          
          next[targetY] = [...(next[targetY] || [])]
          
          for (let j = 0; j < selection.w; j++) {
            const targetX = x + j
            if (targetX >= canvasSize.width) continue
            
            next[targetY][targetX] = {
              tilesetId: selection.tilesetId,
              tx: selection.tx + j,
              ty: selection.ty + i
            }
          }
        }
        return next
      })
    }
  }, [selection, activeTool, canvasSize.width, canvasSize.height])

  const clearCanvas = useCallback(() => {
    setGrid(Array(canvasSize.height).fill(null).map(() => Array(canvasSize.width).fill(null)))
  }, [canvasSize])

  const exportJson = useCallback(() => {
    const data = {
      name: "TileForge Project",
      tileSize,
      canvasSize,
      tilesets: tilesets.map(t => ({ name: t.name, id: t.id })),
      layers: [grid],
      background: backgroundImage ? { opacity: backgroundOpacity } : null
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tilemap.json'
    a.click()
  }, [grid, tileSize, canvasSize, tilesets, backgroundImage, backgroundOpacity])

  const exportPng = useCallback(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvasSize.width * tileSize.width
    canvas.height = canvasSize.height * tileSize.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw background if exists
    if (backgroundImage) {
      const bgImg = new Image()
      bgImg.src = backgroundImage
      await new Promise(resolve => { bgImg.onload = resolve })
      ctx.globalAlpha = backgroundOpacity
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1.0
    }

    // Preload tileset images
    const images: Record<string, HTMLImageElement> = {}
    for (const ts of tilesets) {
      const img = new Image()
      img.src = ts.url
      await new Promise(resolve => { img.onload = resolve })
      images[ts.id] = img
    }

    // Draw tiles
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const img = images[cell.tilesetId]
          if (img) {
            ctx.drawImage(
              img,
              cell.tx * tileSize.width, cell.ty * tileSize.height, tileSize.width, tileSize.height,
              x * tileSize.width, y * tileSize.height, tileSize.width, tileSize.height
            )
          }
        }
      })
    })

    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'tilemap.png'
    a.click()
  }, [grid, canvasSize, tileSize, tilesets, backgroundImage, backgroundOpacity])

  return {
    tilesets,
    addTileset,
    selectedTilesetId,
    setSelectedTilesetId,
    selection,
    selectionMode,
    setSelectionMode,
    selectTile,
    tileSize,
    setTileSize,
    canvasSize,
    setCanvasSize,
    grid,
    paintTile,
    activeTool,
    setActiveTool,
    clearCanvas,
    exportJson,
    exportPng,
    backgroundImage,
    setBackgroundImage: handleSetBackgroundImage,
    removeBackgroundImage,
    backgroundOpacity,
    setBackgroundOpacity
  }
}
