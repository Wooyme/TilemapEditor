"use client"

import React, { useMemo, useState, useEffect } from 'react'
import { Tileset, TileSelection, SelectionMode } from '@/hooks/use-tile-editor'
import { cn } from '@/lib/utils'

interface TilesetViewerProps {
  tileset: Tileset
  tileSize: { width: number; height: number }
  selection: TileSelection | null
  selectionMode: SelectionMode
  onSelectTile: (tx: number, ty: number, w?: number, h?: number) => void
}

export function TilesetViewer({ tileset, tileSize, selection, selectionMode, onSelectTile }: TilesetViewerProps) {
  const cols = Math.floor(tileset.width / tileSize.width)
  const rows = Math.floor(tileset.height / tileSize.height)
  
  const [dragStart, setDragStart] = useState<{ tx: number, ty: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ tx: number, ty: number } | null>(null)

  const handleMouseDown = (tx: number, ty: number) => {
    if (selectionMode === 'single') {
      onSelectTile(tx, ty, 1, 1)
      return
    }
    setDragStart({ tx, ty })
    setDragEnd({ tx, ty })
  }

  const handleMouseEnter = (tx: number, ty: number) => {
    if (dragStart) {
      setDragEnd({ tx, ty })
    }
  }

  const handleMouseUp = () => {
    if (dragStart && dragEnd) {
      const tx = Math.min(dragStart.tx, dragEnd.tx)
      const ty = Math.min(dragStart.ty, dragEnd.ty)
      const w = Math.abs(dragStart.tx - dragEnd.tx) + 1
      const h = Math.abs(dragStart.ty - dragEnd.ty) + 1
      onSelectTile(tx, ty, w, h)
    }
    setDragStart(null)
    setDragEnd(null)
  }

  useEffect(() => {
    const globalMouseUp = () => {
      if (dragStart) handleMouseUp()
    }
    window.addEventListener('mouseup', globalMouseUp)
    return () => window.removeEventListener('mouseup', globalMouseUp)
  }, [dragStart, dragEnd])

  const tiles = useMemo(() => {
    const arr = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        arr.push({ tx: x, ty: y })
      }
    }
    return arr
  }, [cols, rows])

  return (
    <div className="relative overflow-auto border rounded-md bg-white p-2 max-h-[400px] select-none">
      <div 
        className="relative" 
        style={{ 
          width: tileset.width, 
          height: tileset.height,
          backgroundImage: `url(${tileset.url})`,
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Interaction/Selection Layer */}
        {tiles.map(({ tx, ty }) => {
          const isInSelection = selection?.tilesetId === tileset.id && 
                               tx >= selection.tx && tx < selection.tx + selection.w &&
                               ty >= selection.ty && ty < selection.ty + selection.h

          let isInDrag = false
          if (dragStart && dragEnd) {
            const minX = Math.min(dragStart.tx, dragEnd.tx)
            const maxX = Math.max(dragStart.tx, dragEnd.tx)
            const minY = Math.min(dragStart.ty, dragEnd.ty)
            const maxY = Math.max(dragStart.ty, dragEnd.ty)
            isInDrag = tx >= minX && tx <= maxX && ty >= minY && ty <= maxY
          }

          return (
            <div
              key={`${tx}-${ty}`}
              onMouseDown={() => handleMouseDown(tx, ty)}
              onMouseEnter={() => handleMouseEnter(tx, ty)}
              className={cn(
                "absolute cursor-pointer border border-transparent hover:border-accent hover:bg-accent/20 transition-all",
                isInSelection && "border-primary bg-primary/20 ring-1 ring-primary ring-inset",
                isInDrag && "border-accent bg-accent/30 ring-1 ring-accent ring-inset"
              )}
              style={{
                left: tx * tileSize.width,
                top: ty * tileSize.height,
                width: tileSize.width,
                height: tileSize.height,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
