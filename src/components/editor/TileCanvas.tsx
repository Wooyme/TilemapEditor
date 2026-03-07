"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Layer, Tileset, ComponentAsset, TileSelection } from '@/hooks/use-tile-editor'
import { cn } from '@/lib/utils'

interface TileCanvasProps {
  layers: Layer[]
  activeLayerId: string
  tilesets: Tileset[]
  components: ComponentAsset[]
  canvasSize: { width: number; height: number }
  tileSize: { width: number; height: number }
  zoom: number
  onPaint: (x: number, y: number) => void
  activeTool: 'paint' | 'eraser' | 'select'
  selection: TileSelection | null
  selectedComponentId: string | null
}

export function TileCanvas({ 
  layers,
  activeLayerId,
  tilesets, 
  components,
  canvasSize, 
  tileSize, 
  zoom,
  onPaint, 
  activeTool, 
  selection,
  selectedComponentId
}: TileCanvasProps) {
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null)
  
  const handleMouseMove = (x: number, y: number) => {
    setHoverPos({ x, y })
    if (isMouseDown) onPaint(x, y)
  }

  const handleMouseDown = (x: number, y: number) => {
    setIsMouseDown(true)
    onPaint(x, y)
  }

  useEffect(() => {
    const up = () => setIsMouseDown(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const activeLayer = layers.find(l => l.id === activeLayerId)
  const baseWidth = canvasSize.width * tileSize.width
  const baseHeight = canvasSize.height * tileSize.height

  return (
    <div className="flex-1 flex items-center justify-center bg-secondary/50 overflow-auto p-8">
      <div 
        className="relative"
        style={{ width: baseWidth * zoom, height: baseHeight * zoom }}
      >
        <div 
          className="relative bg-white shadow-2xl select-none"
          style={{ width: baseWidth, height: baseHeight, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          onMouseLeave={() => setHoverPos(null)}
        >
          {/* Grid Layout Line */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
              backgroundSize: `${tileSize.width}px ${tileSize.height}px`
            }}
          />

          {/* Render Layers */}
          <div className="absolute inset-0 pointer-events-none">
            {[...layers].reverse().map((layer) => {
              if (!layer.visible) return null
              return (
                <div key={layer.id} className={cn("absolute inset-0", layer.id !== activeLayerId && "opacity-60")}>
                  {layer.mode === 'tilemap' ? (
                    layer.tileData.map((row, y) => 
                      row.map((cell, x) => {
                        if (!cell) return null
                        const ts = tilesets.find(t => t.id === cell.tilesetId)
                        if (!ts) return null
                        return (
                          <div
                            key={`${layer.id}-${x}-${y}`}
                            className="absolute"
                            style={{
                              left: x * tileSize.width,
                              top: y * tileSize.height,
                              width: tileSize.width,
                              height: tileSize.height,
                              backgroundImage: `url(${ts.url})`,
                              backgroundPosition: `-${cell.tx * tileSize.width}px -${cell.ty * tileSize.height}px`,
                              backgroundSize: `${ts.width}px ${ts.height}px`,
                              imageRendering: 'pixelated'
                            }}
                          />
                        )
                      })
                    )
                  ) : (
                    layer.objects.map((obj) => {
                      const comp = components.find(c => c.id === obj.componentId)
                      if (!comp) return null
                      return (
                        <img
                          key={obj.id}
                          src={comp.url}
                          className="absolute pointer-events-none"
                          style={{
                            left: obj.x,
                            top: obj.y,
                            width: obj.width,
                            height: obj.height,
                            zIndex: obj.zIndex,
                            imageRendering: 'pixelated'
                          }}
                        />
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>

          {/* Interaction Overlay */}
          <div 
            className="absolute inset-0 grid z-[60]"
            style={{
              gridTemplateColumns: `repeat(${canvasSize.width}, ${tileSize.width}px)`,
              gridTemplateRows: `repeat(${canvasSize.height}, ${tileSize.height}px)`,
            }}
          >
            {Array.from({ length: canvasSize.width * canvasSize.height }).map((_, i) => {
              const x = i % canvasSize.width
              const y = Math.floor(i / canvasSize.width)
              
              const isHovered = hoverPos?.x === x && hoverPos?.y === y
              const showTileGhost = isHovered && activeTool === 'paint' && activeLayer?.mode === 'tilemap' && selection
              const showObjGhost = isHovered && activeTool === 'paint' && activeLayer?.mode === 'object' && selectedComponentId

              return (
                <div
                  key={i}
                  onMouseDown={() => handleMouseDown(x, y)}
                  onMouseEnter={() => handleMouseMove(x, y)}
                  className="relative group border border-transparent hover:border-accent/30 hover:bg-accent/5 cursor-crosshair"
                >
                  {showTileGhost && selection && (
                    <div 
                      className="absolute pointer-events-none opacity-50 z-[70]"
                      style={{
                        left: 0,
                        top: 0,
                        width: selection.w * tileSize.width,
                        height: selection.h * tileSize.height,
                        backgroundImage: `url(${tilesets.find(t => t.id === selection.tilesetId)?.url})`,
                        backgroundPosition: `-${selection.tx * tileSize.width}px -${selection.ty * tileSize.height}px`,
                        backgroundSize: `${tilesets.find(t => t.id === selection.tilesetId)?.width}px ${tilesets.find(t => t.id === selection.tilesetId)?.height}px`,
                        imageRendering: 'pixelated'
                      }}
                    />
                  )}
                  {showObjGhost && selectedComponentId && (
                    <img 
                      src={components.find(c => c.id === selectedComponentId)?.url}
                      className="absolute top-0 left-0 opacity-40 pointer-events-none"
                      style={{ 
                        width: components.find(c => c.id === selectedComponentId)?.width,
                        height: components.find(c => c.id === selectedComponentId)?.height,
                        imageRendering: 'pixelated'
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
