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

export type PlacedObject = {
  id: string
  componentId: string
  x: number // pixel position
  y: number
  width: number
  height: number
  zIndex: number
}

export type ComponentAsset = {
  id: string
  sourceId: string
  url: string // data URL of the cropped piece
  width: number
  height: number
  name: string
}

export type GridCell = TilePosition | null

export type LayerMode = 'tilemap' | 'object'

export type Layer = {
  id: string
  name: string
  visible: boolean
  mode: LayerMode
  tileData: GridCell[][] // For tilemap mode
  objects: PlacedObject[] // For object mode
}

export type Tool = 'paint' | 'eraser' | 'select' | 'scale'

export type ScaleDirection = 'up' | 'down'

export type SelectionMode = 'single' | 'block'

export type TileSelection = { 
  tx: number
  ty: number
  w: number
  h: number
  tilesetId: string 
}

export function useTileEditor() {
  const [tilesets, setTilesets] = useState<Tileset[]>([])
  const [components, setComponents] = useState<ComponentAsset[]>([])
  const [selectedTilesetId, setSelectedTilesetId] = useState<string | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selection, setSelection] = useState<TileSelection | null>(null)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  
  const [tileSize, setTileSize] = useState({ width: 32, height: 32 })
  const [canvasSize, setCanvasSize] = useState({ width: 20, height: 15 })
  const [zoom, setZoom] = useState(1)
  
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-1', name: 'Background', visible: true, mode: 'tilemap', tileData: [], objects: [] }
  ])
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-1')
  const [activeTool, setActiveTool] = useState<Tool>('paint')
  const [scaleDirection, setScaleDirection] = useState<ScaleDirection>('up')

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5)

  // Sync grid data dimensions
  useEffect(() => {
    setLayers(prev => prev.map(layer => {
      if (layer.mode !== 'tilemap') return layer
      const newData = Array(canvasSize.height).fill(null).map((_, y) => 
        Array(canvasSize.width).fill(null).map((_, x) => (layer.tileData[y] && layer.tileData[y][x]) || null)
      )
      return { ...layer, tileData: newData }
    }))
  }, [canvasSize.width, canvasSize.height])

  const addTileset = useCallback((file: File | string, name?: string) => {
    const url = typeof file === 'string' ? file : URL.createObjectURL(file)
    const fileName = typeof file === 'string' ? (name || 'Imported Tileset') : file.name
    const img = new Image()
    img.onload = () => {
      const newTileset: Tileset = {
        id: crypto.randomUUID(),
        name: fileName,
        url,
        width: img.width,
        height: img.height,
      }
      setTilesets(prev => [...prev, newTileset])
      if (!selectedTilesetId) setSelectedTilesetId(newTileset.id)
    }
    img.src = url
  }, [selectedTilesetId])

  const addComponentSource = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    
    await new Promise((resolve) => {
      img.onload = resolve
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, img.width, img.height)
    const data = imageData.data

    const visited = new Uint8Array(img.width * img.height)
    const newComponents: ComponentAsset[] = []
    const sourceId = crypto.randomUUID()

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x)
        if (data[idx * 4 + 3] > 10 && !visited[idx]) {
          let minX = x, maxX = x, minY = y, maxY = y
          const queue = [[x, y]]
          visited[idx] = 1

          while (queue.length > 0) {
            const [cx, cy] = queue.shift()!
            minX = Math.min(minX, cx)
            maxX = Math.max(maxX, cx)
            minY = Math.min(minY, cy)
            maxY = Math.max(maxY, cy)

            const neighbors = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]]
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
                const nIdx = ny * img.width + nx
                if (data[nIdx * 4 + 3] > 10 && !visited[nIdx]) {
                  visited[nIdx] = 1
                  queue.push([nx, ny])
                }
              }
            }
          }

          const w = maxX - minX + 1
          const h = maxY - minY + 1
          const cropCanvas = document.createElement('canvas')
          cropCanvas.width = w
          cropCanvas.height = h
          const cropCtx = cropCanvas.getContext('2d')
          cropCtx?.drawImage(img, minX, minY, w, h, 0, 0, w, h)
          
          newComponents.push({
            id: crypto.randomUUID(),
            sourceId,
            url: cropCanvas.toDataURL(),
            width: w,
            height: h,
            name: `${file.name} - Part ${newComponents.length + 1}`
          })
        }
      }
    }

    setComponents(prev => [...prev, ...newComponents])
    if (newComponents.length > 0) setSelectedComponentId(newComponents[0].id)
  }, [])

  const paintTile = useCallback((x: number, y: number) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id !== activeLayerId) return layer

      if (layer.mode === 'tilemap') {
        const nextData = [...layer.tileData]
        if (activeTool === 'eraser') {
          if (nextData[y]) {
            nextData[y] = [...nextData[y]]
            nextData[y][x] = null
          }
        } else if (selection) {
          // Multi-tile stamp
          for (let sy = 0; sy < selection.h; sy++) {
            for (let sx = 0; sx < selection.w; sx++) {
              const targetY = y + sy
              const targetX = x + sx
              if (nextData[targetY] && targetX < canvasSize.width) {
                nextData[targetY] = [...nextData[targetY]]
                nextData[targetY][targetX] = {
                  tilesetId: selection.tilesetId,
                  tx: selection.tx + sx,
                  ty: selection.ty + sy
                }
              }
            }
          }
        }
        return { ...layer, tileData: nextData }
      } else if (layer.mode === 'object') {
        if (activeTool === 'paint' && selectedComponentId) {
          const comp = components.find(c => c.id === selectedComponentId)
          if (!comp) return layer
          const newObj: PlacedObject = {
            id: crypto.randomUUID(),
            componentId: selectedComponentId,
            x: x * tileSize.width,
            y: y * tileSize.height,
            width: comp.width,
            height: comp.height,
            zIndex: layer.objects.length
          }
          return { ...layer, objects: [...layer.objects, newObj] }
        } else if (activeTool === 'eraser') {
          const pxX = x * tileSize.width
          const pxY = y * tileSize.height
          return {
            ...layer,
            objects: layer.objects.filter(obj => 
              !(pxX >= obj.x && pxX < obj.x + obj.width && pxY >= obj.y && pxY < obj.y + obj.height)
            )
          }
        } else if (activeTool === 'scale') {
          const pxX = x * tileSize.width
          const pxY = y * tileSize.height
          const factor = scaleDirection === 'up' ? 1.1 : 0.9
          // Scale the first object hit at this position
          return {
            ...layer,
            objects: layer.objects.map(obj => {
              if (pxX >= obj.x && pxX < obj.x + obj.width && pxY >= obj.y && pxY < obj.y + obj.height) {
                return { 
                  ...obj, 
                  width: Math.max(5, Math.round(obj.width * factor)), 
                  height: Math.max(5, Math.round(obj.height * factor)) 
                }
              }
              return obj
            })
          }
        }
      }
      return layer
    }))
  }, [selection, activeTool, activeLayerId, selectedComponentId, components, tileSize, canvasSize, scaleDirection])

  const addLayer = useCallback(() => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      mode: 'tilemap',
      tileData: Array(canvasSize.height).fill(null).map(() => Array(canvasSize.width).fill(null)),
      objects: []
    }
    setLayers(prev => [newLayer, ...prev])
    setActiveLayerId(newLayer.id)
  }, [layers.length, canvasSize])

  const toggleLayerMode = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, mode: l.mode === 'tilemap' ? 'object' : 'tilemap' } : l))
  }, [])

  const renameLayer = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))
  }, [])

  const reorderLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id)
      if (index === -1) return prev
      const newLayers = [...prev]
      if (direction === 'up' && index > 0) {
        [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]]
      } else if (direction === 'down' && index < prev.length - 1) {
        [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]]
      }
      return newLayers
    })
  }, [])

  const importProject = useCallback((project: any) => {
    if (project.tilesets) setTilesets(project.tilesets)
    if (project.components) setComponents(project.components)
    if (project.layers) setLayers(project.layers)
    if (project.tileSize) setTileSize(project.tileSize)
    if (project.canvasSize) setCanvasSize(project.canvasSize)
    if (project.activeLayerId) setActiveLayerId(project.activeLayerId)
    if (project.backgroundImage) setBackgroundImage(project.backgroundImage)
    if (project.backgroundOpacity) setBackgroundOpacity(project.backgroundOpacity)
  }, [])

  return {
    tilesets, setTilesets, addTileset,
    components, setComponents, addComponentSource,
    selectedTilesetId, setSelectedTilesetId,
    selectedComponentId, setSelectedComponentId,
    selection, setSelection,
    selectionMode, setSelectionMode,
    tileSize, setTileSize,
    canvasSize, setCanvasSize,
    zoom, setZoom,
    layers, setLayers, activeLayerId, setActiveLayerId,
    addLayer, toggleLayerMode, renameLayer, reorderLayer,
    paintTile, activeTool, setActiveTool,
    scaleDirection, setScaleDirection,
    backgroundImage, setBackgroundImage, backgroundOpacity, setBackgroundOpacity,
    importProject
  }
}
