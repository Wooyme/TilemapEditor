"use client"

import React from 'react'
import { useTileEditor } from '@/hooks/use-tile-editor'
import { TilesetViewer } from '@/components/editor/TilesetViewer'
import { TileCanvas } from '@/components/editor/TileCanvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { 
  Upload, 
  Download, 
  Paintbrush, 
  Eraser, 
  Grid3X3, 
  ImageIcon,
  Save,
  Trash2,
  Maximize,
  Image as LucideImage,
  X,
  Square
} from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'

export default function TileForge() {
  const {
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
    setBackgroundImage,
    removeBackgroundImage,
    backgroundOpacity,
    setBackgroundOpacity
  } = useTileEditor()

  const currentTileset = tilesets.find(t => t.id === selectedTilesetId)

  const handleTilesetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      addTileset(file)
    }
  }

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBackgroundImage(file)
    }
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body text-foreground">
      {/* Left Sidebar - Tools & Tilesets */}
      <aside className="w-80 shrink-0 flex flex-col border-r bg-white shadow-sm overflow-y-auto">
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

          {/* Selection Mode Toggle */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">Selection Mode</Label>
              <div className="flex bg-secondary/50 p-1 rounded-md">
                <Button 
                  variant={selectionMode === 'single' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setSelectionMode('single')}
                >
                  Single
                </Button>
                <Button 
                  variant={selectionMode === 'multi' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setSelectionMode('multi')}
                >
                  Block
                </Button>
              </div>
            </div>
            {selection && (
              <p className="text-[10px] text-muted-foreground">
                Current: {selection.w}x{selection.h} block
              </p>
            )}
          </section>

          <Separator />

          {/* Background Image Settings */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">Background Image</Label>
              {!backgroundImage ? (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <label className="cursor-pointer">
                    <Upload size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                  </label>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={removeBackgroundImage}>
                  <X size={14} />
                </Button>
              )}
            </div>

            {backgroundImage ? (
              <div className="space-y-3 p-3 border rounded-md bg-secondary/20">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                    <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-medium truncate">Reference Image</p>
                    <p className="text-[10px] text-muted-foreground">Adjust transparency below</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-[10px]">Opacity</Label>
                    <span className="text-[10px] font-mono">{Math.round(backgroundOpacity * 100)}%</span>
                  </div>
                  <Slider 
                    value={[backgroundOpacity]} 
                    min={0} 
                    max={1} 
                    step={0.01} 
                    onValueChange={([val]) => setBackgroundOpacity(val)} 
                  />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-4 text-center text-[10px] text-muted-foreground">
                <LucideImage className="mx-auto mb-1 opacity-20" size={24} />
                Upload a reference image
              </div>
            )}
          </section>

          <Separator />

          {/* Tileset Management */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">Tilesets</Label>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                <label className="cursor-pointer">
                  <Upload size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleTilesetUpload} />
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
                      selection={selection}
                      selectionMode={selectionMode}
                      onSelectTile={(tx, ty, w, h) => selectTile(currentTileset.id, tx, ty, w, h)}
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
      <main className="flex-1 min-w-0 flex flex-col relative">
        <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
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
          selection={selection}
          backgroundImage={backgroundImage}
          backgroundOpacity={backgroundOpacity}
        />
      </main>
      <Toaster />
    </div>
  )
}
