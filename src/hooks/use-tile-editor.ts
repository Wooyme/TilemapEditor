"use client"

import { useState, useCallback, useEffect, useRef } from 'react'

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
  comment?: string
  commentColor?: string
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

export type Tool = 'paint' | 'eraser' | 'select' | 'scale' | 'comment'

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
  const [splitLayerId, setSplitLayerId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<Tool>('paint')
  const [scaleDirection, setScaleDirection] = useState<ScaleDirection>('up')

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5)

  // Undo/Redo State
  const [history, setHistory] = useState<Layer[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isInternalUpdate = useRef(false)

  // Push to history
  const pushHistory = useCallback((newLayers: Layer[]) => {
    const layersCopy = JSON.parse(JSON.stringify(newLayers))
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      if (newHistory.length >= 50) newHistory.shift()
      return [...newHistory, layersCopy]
    })
    setHistoryIndex(prev => {
      const nextIndex = prev + 1
      return Math.min(nextIndex, 49)
    })
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isInternalUpdate.current = true
      const prevState = history[historyIndex - 1]
      setLayers(JSON.parse(JSON.stringify(prevState)))
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isInternalUpdate.current = true
      const nextState = history[historyIndex + 1]
      setLayers(JSON.parse(JSON.stringify(nextState)))
      setHistoryIndex(prev => prev + 1)
    }
  }, [history, historyIndex])

  useEffect(() => {
    if (history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(layers))])
      setHistoryIndex(0)
    }
  }, [])

  useEffect(() => {
    setLayers(prev => {
      let changed = false
      const next = prev.map(layer => {
        if (layer.mode !== 'tilemap') return layer
        if (layer.tileData.length === canvasSize.height && 
            layer.tileData[0]?.length === canvasSize.width) return layer

        changed = true
        const newData = Array(canvasSize.height).fill(null).map((_, y) => 
          Array(canvasSize.width).fill(null).map((_, x) => (layer.tileData[y] && layer.tileData[y][x]) || null)
        )
        return { ...layer, tileData: newData }
      })
      if (changed) return next
      return prev
    })
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
        } else if (activeTool === 'paint' && selection) {
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

  const setTileComment = useCallback((x: number, y: number, w: number, h: number, comment: string, color?: string) => {
    setLayers(prev => {
      const next = prev.map(layer => {
        if (layer.id !== activeLayerId || layer.mode !== 'tilemap') return layer
        const nextData = [...layer.tileData]
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            const ty = y + dy
            const tx = x + dx
            if (nextData[ty] && nextData[ty][tx]) {
              nextData[ty] = [...nextData[ty]]
              nextData[ty][tx] = { 
                ...nextData[ty][tx]!, 
                comment: comment || undefined,
                commentColor: color || undefined
              }
            }
          }
        }
        return { ...layer, tileData: nextData }
      })
      pushHistory(next)
      return next
    })
  }, [activeLayerId, pushHistory])

  const addLayer = useCallback(() => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      mode: 'tilemap',
      tileData: Array(canvasSize.height).fill(null).map(() => Array(canvasSize.width).fill(null)),
      objects: []
    }
    const nextLayers = [newLayer, ...layers]
    setLayers(nextLayers)
    setActiveLayerId(newLayer.id)
    pushHistory(nextLayers)
  }, [layers, canvasSize, pushHistory])

  const deleteLayer = useCallback((id: string) => {
    setLayers(prev => {
      if (prev.length <= 1) return prev
      const nextLayers = prev.filter(l => l.id !== id)
      if (id === activeLayerId) {
        setActiveLayerId(nextLayers[0].id)
      }
      if (id === splitLayerId) {
        setSplitLayerId(null)
      }
      pushHistory(nextLayers)
      return nextLayers
    })
  }, [activeLayerId, splitLayerId, pushHistory])

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [])

  const toggleLayerMode = useCallback((id: string) => {
    setLayers(prev => {
      const next = prev.map(l => l.id === id ? { ...l, mode: l.mode === 'tilemap' ? 'object' : 'tilemap' } : l)
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  const renameLayer = useCallback((id: string, name: string) => {
    setLayers(prev => {
      const next = prev.map(l => l.id === id ? { ...l, name } : l)
      pushHistory(next)
      return next
    })
  }, [pushHistory])

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
      pushHistory(newLayers)
      return newLayers
    })
  }, [pushHistory])

  const importProject = useCallback((project: any) => {
    if (project.tilesets) setTilesets(project.tilesets)
    if (project.components) setComponents(project.components)
    if (project.layers) setLayers(project.layers)
    if (project.tileSize) setTileSize(project.tileSize)
    if (project.canvasSize) setCanvasSize(project.canvasSize)
    if (project.activeLayerId) setActiveLayerId(project.activeLayerId)
    if (project.splitLayerId) setSplitLayerId(project.splitLayerId)
    if (project.backgroundImage) setBackgroundImage(project.backgroundImage)
    if (project.backgroundOpacity) setBackgroundOpacity(project.backgroundOpacity)
    if (project.layers) pushHistory(project.layers)
  }, [pushHistory])

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
    splitLayerId, setSplitLayerId,
    addLayer, deleteLayer, toggleLayerVisibility, toggleLayerMode, renameLayer, reorderLayer,
    paintTile, setTileComment, activeTool, setActiveTool,
    scaleDirection, setScaleDirection,
    backgroundImage, setBackgroundImage, backgroundOpacity, setBackgroundOpacity,
    importProject,
    undo, redo, pushHistory,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  }
}
