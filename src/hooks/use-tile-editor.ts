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

export type Layer = {
  id: string
  name: string
  visible: boolean
  data: GridCell[][]
}

export type Tool = 'paint' | 'eraser'
export type SelectionMode = 'single' | 'multi'

export function useTileEditor() {
  const [tilesets, setTilesets] = useState<Tileset[]>([])
  const [selectedTilesetId, setSelectedTilesetId] = useState<string | null>(null)
  const [selection, setSelection] = useState<TileSelection | null>(null)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  
  const [tileSize, setTileSize] = useState({ width: 32, height: 32 })
  const [canvasSize, setCanvasSize] = useState({ width: 20, height: 15 })
  const [zoom, setZoom] = useState(1)
  
  // Multi-layer state
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-1', name: 'Layer 1', visible: true, data: [] }
  ])
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-1')

  const [activeTool, setActiveTool] = useState<Tool>('paint')

  // Background Image State
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5)

  // Sync layer data with canvas size
  useEffect(() => {
    setLayers(prev => {
      return prev.map(layer => {
        const newData = Array(canvasSize.height)
          .fill(null)
          .map((_, y) => 
            Array(canvasSize.width)
              .fill(null)
              .map((_, x) => (layer.data[y] && layer.data[y][x]) || null)
          )
        return { ...layer, data: newData }
      })
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
    setLayers(prev => {
      return prev.map(layer => {
        if (layer.id !== activeLayerId) return layer
        
        const nextData = [...layer.data]
        if (activeTool === 'eraser') {
          if (nextData[y]) {
            nextData[y] = [...nextData[y]]
            nextData[y][x] = null
          }
        } else if (selection) {
          for (let i = 0; i < selection.h; i++) {
            const targetY = y + i
            if (targetY >= canvasSize.height) continue
            
            nextData[targetY] = [...(nextData[targetY] || [])]
            
            for (let j = 0; j < selection.w; j++) {
              const targetX = x + j
              if (targetX >= canvasSize.width) continue
              
              nextData[targetY][targetX] = {
                tilesetId: selection.tilesetId,
                tx: selection.tx + j,
                ty: selection.ty + i
              }
            }
          }
        }
        return { ...layer, data: nextData }
      })
    })
  }, [selection, activeTool, activeLayerId, canvasSize.width, canvasSize.height])

  const addLayer = useCallback(() => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      data: Array(canvasSize.height).fill(null).map(() => Array(canvasSize.width).fill(null))
    }
    setLayers(prev => [newLayer, ...prev])
    setActiveLayerId(newLayer.id)
  }, [layers.length, canvasSize])

  const removeLayer = useCallback((id: string) => {
    if (layers.length <= 1) return
    setLayers(prev => prev.filter(l => l.id !== id))
    if (activeLayerId === id) {
      setActiveLayerId(layers.find(l => l.id !== id)?.id || '')
    }
  }, [layers, activeLayerId])

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [])

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id)
      if (index === -1) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.length - 1) return prev
      
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }, [])

  const clearCanvas = useCallback(() => {
    setLayers(prev => prev.map(layer => ({
      ...layer,
      data: Array(canvasSize.height).fill(null).map(() => Array(canvasSize.width).fill(null))
    })))
  }, [canvasSize])

  const exportJson = useCallback(() => {
    const data = {
      name: "TileForge Project",
      tileSize,
      canvasSize,
      tilesets: tilesets.map(t => ({ name: t.name, id: t.id })),
      layers: layers.map(l => ({ name: l.name, data: l.data })),
      background: backgroundImage ? { opacity: backgroundOpacity } : null
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tilemap.json'
    a.click()
  }, [layers, tileSize, canvasSize, tilesets, backgroundImage, backgroundOpacity])

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

    // Draw tiles (reverse order because layers[0] is top)
    [...layers].reverse().forEach(layer => {
      if (!layer.visible) return
      layer.data.forEach((row, y) => {
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
    })

    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'tilemap.png'
    a.click()
  }, [layers, canvasSize, tileSize, tilesets, backgroundImage, backgroundOpacity])

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
    zoom,
    setZoom,
    layers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    removeLayer,
    toggleLayerVisibility,
    moveLayer,
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
