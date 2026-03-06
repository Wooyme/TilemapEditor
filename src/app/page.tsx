"use client"

import React from 'react'
import { useTileEditor } from '@/hooks/use-tile-editor'
import { TilesetViewer } from '@/components/editor/TilesetViewer'
import { TileCanvas } from '@/components/editor/TileCanvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Upload, 
  Download, 
  Paintbrush, 
  Eraser, 
  Grid3X3, 
  Image as ImageIcon,
  Save,
  Trash2,
  Maximize
} from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'

export default function TileForge() {
  const {
    tilesets,
    addTileset,
    selectedTilesetId,
    setSelectedTilesetId,
    selectedTile,
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
    exportPng
  } = useTileEditor()

  const currentTileset = tilesets.find(t => t.id === selectedTilesetId)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      addTileset(file)
    }
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body text-foreground">
      {/* Left Sidebar - Tools & Tilesets */}
      <aside className="w-80 flex flex-col border-r bg-white shadow-sm overflow-y-auto">
        <header className="p-4 border-b flex items-center gap-2">
          <div className="p-2 bg-primary rounded-lg text-white">
            <Maximize size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight font-headline">TileForge</h1>
        </header>

        <div className="p-4 space-y-6">
          {/* Tool Selection */}
          <section>
            <Label className="text-xs uppercase text-muted-foreground font-semibold mb-2 block">Toolbar</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={activeTool === 'paint' ? 'default' : 'outline'} 
                className="w-full justify-start gap-2"
                onClick={() => setActiveTool('paint')}
              >
                <Paintbrush size={16} /> Paint
              </Button>
              <Button 
                variant={activeTool === 'eraser' ? 'default' : 'outline'} 
                className="w-full justify-start gap-2"
                onClick={() => setActiveTool('eraser')}
              >
                <Eraser size={16} /> Eraser
              </Button>
            </div>
          </section>

          <Separator />

          {/* Tileset Management */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">Tilesets</Label>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                <label className="cursor-pointer">
                  <Upload size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </Button>
            </div>

            {tilesets.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                <ImageIcon className="mx-auto mb-2 opacity-20" size={32} />
                Upload a tileset to start
              </div>
            ) : (
              <div className="space-y-3">
                <select 
                  className="w-full p-2 text-sm rounded-md border bg-background"
                  value={selectedTilesetId || ''}
                  onChange={(e) => setSelectedTilesetId(e.target.value)}
                >
                  {tilesets.map(ts => (
                    <option key={ts.id} value={ts.id}>{ts.name}</option>
                  ))}
                </select>

                {currentTileset && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Selection</Label>
                    <TilesetViewer 
                      tileset={currentTileset}
                      tileSize={tileSize}
                      selectedTile={selectedTile}
                      onSelectTile={(tx, ty) => selectTile(currentTileset.id, tx, ty)}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          <Separator />

          {/* Tile Settings */}
          <section className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground font-semibold">Configuration</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Tile Width (px)</Label>
                <Input 
                  type="number" 
                  value={tileSize.width} 
                  onChange={(e) => setTileSize(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Tile Height (px)</Label>
                <Input 
                  type="number" 
                  value={tileSize.height} 
                  onChange={(e) => setTileSize(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Map Width (tiles)</Label>
                <Input 
                  type="number" 
                  value={canvasSize.width} 
                  onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Map Height (tiles)</Label>
                <Input 
                  type="number" 
                  value={canvasSize.height} 
                  onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))} 
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-auto p-4 border-t space-y-2">
           <Button variant="outline" className="w-full text-destructive border-destructive/20 hover:bg-destructive/10" onClick={clearCanvas}>
            <Trash2 size={16} className="mr-2" /> Clear Canvas
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-14 border-b bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <div className="flex items-center gap-1">
               <Grid3X3 size={16} /> 
               <span>{canvasSize.width}x{canvasSize.height} Tiles</span>
             </div>
             <div className="flex items-center gap-1">
               <Maximize size={16} />
               <span>{tileSize.width}x{tileSize.height}px</span>
             </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportJson}>
              <Download size={16} className="mr-2" /> Export JSON
            </Button>
            <Button size="sm" onClick={exportPng}>
              <Save size={16} className="mr-2" /> Export PNG
            </Button>
          </div>
        </header>

        <TileCanvas 
          grid={grid}
          tilesets={tilesets}
          canvasSize={canvasSize}
          tileSize={tileSize}
          onPaint={paintTile}
          activeTool={activeTool}
          selectedTile={selectedTile}
        />
      </main>
      <Toaster />
    </div>
  )
}
