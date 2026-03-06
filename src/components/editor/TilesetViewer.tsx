"use client"

import React, { useMemo } from 'react'
import { Tileset, TilePosition } from '@/hooks/use-tile-editor'
import { cn } from '@/lib/utils'

interface TilesetViewerProps {
  tileset: Tileset
  tileSize: { width: number; height: number }
  selectedTile: TilePosition | null
  onSelectTile: (tx: number, ty: number) => void
}

export function TilesetViewer({ tileset, tileSize, selectedTile, onSelectTile }: TilesetViewerProps) {
  const cols = Math.floor(tileset.width / tileSize.width)
  const rows = Math.floor(tileset.height / tileSize.height)

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
    <div className="relative overflow-auto border rounded-md bg-white p-2 max-h-[400px]">
      <div 
        className="relative" 
        style={{ 
          width: tileset.width, 
          height: tileset.height,
          backgroundImage: `url(${tileset.url})`,
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Hover/Selection Layer */}
        {tiles.map(({ tx, ty }) => {
          const isSelected = selectedTile?.tilesetId === tileset.id && selectedTile?.tx === tx && selectedTile?.ty === ty
          return (
            <div
              key={`${tx}-${ty}`}
              onClick={() => onSelectTile(tx, ty)}
              className={cn(
                "absolute cursor-pointer border border-transparent hover:border-accent hover:bg-accent/20 transition-all",
                isSelected && "border-primary bg-primary/20 ring-2 ring-primary ring-inset"
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
