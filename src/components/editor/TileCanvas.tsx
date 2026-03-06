"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Layer, Tileset, TileSelection } from '@/hooks/use-tile-editor'
import { cn } from '@/lib/utils'

interface TileCanvasProps {
  layers: Layer[]
  activeLayerId: string
  tilesets: Tileset[]
  canvasSize: { width: number; height: number }
  tileSize: { width: number; height: number }
  zoom: number
  onPaint: (x: number, y: number) => void
  activeTool: 'paint' | 'eraser'
  selection: TileSelection | null
  backgroundImage?: string | null
  backgroundOpacity?: number
}

export function TileCanvas({ 
  layers,
  activeLayerId,
  tilesets, 
  canvasSize, 
  tileSize, 
  zoom,
  onPaint, 
  activeTool, 
  selection,
  backgroundImage,
  backgroundOpacity = 0.5
}: TileCanvasProps) {
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (x: number, y: number) => {
    setHoverPos({ x, y })
    if (isMouseDown) {
      onPaint(x, y)
    }
  }

  const handleMouseDown = (x: number, y: number) => {
    setIsMouseDown(true)
    onPaint(x, y)
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsMouseDown(false)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const baseWidth = canvasSize.width * tileSize.width
  const baseHeight = canvasSize.height * tileSize.height

  return (
    <div className="flex-1 flex items-center justify-center bg-secondary overflow-auto p-8 border-l border-r">
      <div 
        className="relative"
        style={{
          width: baseWidth * zoom,
          height: baseHeight * zoom,
        }}
      >
        <div 
          ref={canvasRef}
          className="relative bg-white shadow-xl select-none"
          style={{
            width: baseWidth,
            height: baseHeight,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }}
          onMouseLeave={() => setHoverPos(null)}
        >
          {/* Background Image Layer */}
          {backgroundImage && (
            <div 
              className="absolute inset-0 pointer-events-none bg-cover bg-center"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                opacity: backgroundOpacity,
              }}
            />
          )}

          {/* Grid Background */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px)`,
              backgroundSize: `${tileSize.width}px ${tileSize.height}px`
            }}
          />

          {/* Layers Rendering - Render in reverse because layers[0] is top */}
          <div className="absolute inset-0 pointer-events-none">
            {[...layers].reverse().map((layer) => {
              if (!layer.visible) return null
              return (
                <div 
                  key={layer.id} 
                  className={cn(
                    "absolute inset-0",
                    layer.id !== activeLayerId && "opacity-80"
                  )}
                >
                  {layer.data.map((row, y) => 
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
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: `${ts.width}px ${ts.height}px`
                          }}
                        />
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>

          {/* Preview Ghost Layer */}
          {hoverPos && selection && activeTool === 'paint' && (
            <div className="absolute inset-0 pointer-events-none opacity-50 z-50">
               {Array.from({ length: selection.h }).map((_, i) => (
                  Array.from({ length: selection.w }).map((_, j) => {
                    const x = hoverPos.x + j
                    const y = hoverPos.y + i
                    if (x >= canvasSize.width || y >= canvasSize.height) return null
                    const ts = tilesets.find(t => t.id === selection.tilesetId)
                    if (!ts) return null
                    return (
                      <div
                        key={`preview-${i}-${j}`}
                        className="absolute"
                        style={{
                          left: x * tileSize.width,
                          top: y * tileSize.height,
                          width: tileSize.width,
                          height: tileSize.height,
                          backgroundImage: `url(${ts.url})`,
                          backgroundPosition: `-${(selection.tx + j) * tileSize.width}px -${(selection.ty + i) * tileSize.height}px`,
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: `${ts.width}px ${ts.height}px`
                        }}
                      />
                    )
                  })
               ))}
            </div>
          )}

          {/* Interaction Layer */}
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
              return (
                <div
                  key={i}
                  onMouseDown={() => handleMouseDown(x, y)}
                  onMouseEnter={() => handleMouseMove(x, y)}
                  className={cn(
                    "border border-transparent hover:border-accent/50 hover:bg-accent/10 transition-colors cursor-crosshair",
                  )}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
