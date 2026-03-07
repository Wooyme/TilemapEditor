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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Upload, 
  Paintbrush, 
  Eraser, 
  Grid3X3, 
  ImageIcon,
  Maximize,
  Layers,
  Eye,
  EyeOff,
  Plus,
  Box,
  Image as LucideImage,
  Sparkles,
  Settings2,
  MousePointer2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

export default function TileForge() {
  const {
    tilesets, addTileset,
    components, addComponentSource,
    selectedTilesetId, setSelectedTilesetId,
    selectedComponentId, setSelectedComponentId,
    selection, setSelection,
    selectionMode, setSelectionMode,
    tileSize, setTileSize,
    canvasSize, setCanvasSize,
    zoom, setZoom,
    layers, activeLayerId, setActiveLayerId,
    addLayer, toggleLayerMode, reorderLayer,
    paintTile, activeTool, setActiveTool,
    backgroundImage, setBackgroundImage,
    backgroundOpacity, setBackgroundOpacity
  } = useTileEditor()

  const currentTileset = tilesets.find(t => t.id === selectedTilesetId)
  const activeLayer = layers.find(l => l.id === activeLayerId)

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body text-foreground">
      {/* Left Sidebar */}
      <aside className="w-80 shrink-0 flex flex-col border-r bg-white shadow-sm overflow-y-auto">
        <header className="p-4 border-b flex items-center gap-2">
          <div className="p-2 bg-primary rounded-lg text-white">
            <Maximize size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">TileForge</h1>
        </header>

        <div className="p-4 space-y-6">
          {/* Tools */}
          <section>
            <Label className="text-xs uppercase text-muted-foreground font-semibold mb-2 block">Toolbar</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={activeTool === 'paint' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTool('paint')}
              >
                <Paintbrush size={14} className="mr-2" /> Paint
              </Button>
              <Button 
                variant={activeTool === 'eraser' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTool('eraser')}
              >
                <Eraser size={14} className="mr-2" /> Eraser
              </Button>
            </div>
          </section>

          <Separator />

          {/* Layer Management */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">Layers</Label>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={addLayer}>
                <Plus size={14} />
              </Button>
            </div>
            
            <div className="space-y-1">
              {layers.map((layer, index) => (
                <div 
                  key={layer.id}
                  className={cn(
                    "group flex flex-col gap-1 p-2 rounded-md transition-colors cursor-pointer",
                    activeLayerId === layer.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-secondary/50"
                  )}
                  onClick={() => setActiveLayerId(layer.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</span>
                    <span className={cn("flex-1 text-xs truncate", activeLayerId === layer.id ? "font-semibold text-primary" : "text-muted-foreground")}>
                      {layer.name}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        disabled={index === 0}
                        onClick={(e) => { e.stopPropagation(); reorderLayer(layer.id, 'up'); }}
                      >
                        <ChevronUp size={12} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        disabled={index === layers.length - 1}
                        onClick={(e) => { e.stopPropagation(); reorderLayer(layer.id, 'down'); }}
                      >
                        <ChevronDown size={12} />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-1 text-[10px]"
                      onClick={(e) => { e.stopPropagation(); toggleLayerMode(layer.id); }}
                    >
                      {layer.mode === 'tilemap' ? <Grid3X3 size={10} className="mr-1" /> : <Box size={10} className="mr-1" />}
                      {layer.mode.toUpperCase()}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Asset Library */}
          <Tabs defaultValue="tilesets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tilesets" className="text-xs">Tilesets</TabsTrigger>
              <TabsTrigger value="components" className="text-xs">Objects</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tilesets" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Selection Mode</Label>
                <RadioGroup 
                  defaultValue={selectionMode} 
                  onValueChange={(v) => setSelectionMode(v as any)}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="mode-single" />
                    <Label htmlFor="mode-single" className="text-[10px]">Single</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="block" id="mode-block" />
                    <Label htmlFor="mode-block" className="text-[10px]">Block</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Loaded Tilesets</Label>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                  <label className="cursor-pointer">
                    <Upload size={12} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && addTileset(e.target.files[0])} />
                  </label>
                </Button>
              </div>
              <select 
                className="w-full p-2 text-xs rounded-md border bg-background"
                value={selectedTilesetId || ''}
                onChange={(e) => setSelectedTilesetId(e.target.value)}
              >
                {tilesets.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
              </select>
              {currentTileset && (
                <TilesetViewer 
                  tileset={currentTileset}
                  tileSize={tileSize}
                  selection={selection}
                  selectionMode={selectionMode}
                  onSelectTile={(tx, ty, w = 1, h = 1) => setSelection({ tx, ty, w, h, tilesetId: currentTileset.id })}
                />
              )}
            </TabsContent>

            <TabsContent value="components" className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase text-muted-foreground font-semibold">Component Library</Label>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild title="Import & Auto-split by Transparency">
                  <label className="cursor-pointer">
                    <Sparkles size={12} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && addComponentSource(e.target.files[0])} />
                  </label>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                {components.map(comp => (
                  <div 
                    key={comp.id}
                    className={cn(
                      "aspect-square rounded border p-1 cursor-pointer transition-all bg-white",
                      selectedComponentId === comp.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedComponentId(comp.id)}
                  >
                    <img src={comp.url} alt={comp.name} className="w-full h-full object-contain" />
                  </div>
                ))}
                {components.length === 0 && (
                  <div className="col-span-3 py-8 text-center text-[10px] text-muted-foreground italic">
                    Click Sparkles to import & auto-split objects
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-4 shrink-0">
             {/* Workspace Settings */}
             <div className="flex items-center gap-3 bg-secondary/30 p-1 px-2 rounded-lg border">
                <div className="flex items-center gap-2 border-r pr-3">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Settings2 size={10} /> Tile
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number" 
                      className="w-12 h-7 text-[10px] px-1 bg-white" 
                      value={tileSize.width} 
                      onChange={(e) => setTileSize(prev => ({ ...prev, width: parseInt(e.target.value) || 1 }))} 
                      title="Tile Width (px)"
                    />
                    <span className="text-[10px] text-muted-foreground">x</span>
                    <Input 
                      type="number" 
                      className="w-12 h-7 text-[10px] px-1 bg-white" 
                      value={tileSize.height} 
                      onChange={(e) => setTileSize(prev => ({ ...prev, height: parseInt(e.target.value) || 1 }))} 
                      title="Tile Height (px)"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Grid3X3 size={10} /> Grid
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number" 
                      className="w-12 h-7 text-[10px] px-1 bg-white" 
                      value={canvasSize.width} 
                      onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) || 1 }))} 
                      title="Grid Columns"
                    />
                    <span className="text-[10px] text-muted-foreground">x</span>
                    <Input 
                      type="number" 
                      className="w-12 h-7 text-[10px] px-1 bg-white" 
                      value={canvasSize.height} 
                      onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) || 1 }))} 
                      title="Grid Rows"
                    />
                  </div>
                </div>
             </div>

             <Separator orientation="vertical" className="h-6" />

             <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><Box size={14} /> <span>Mode: {activeLayer?.mode?.toUpperCase() || 'N/A'}</span></div>
             </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 ml-4">
             <div className="flex items-center gap-2">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Zoom</Label>
                <div className="flex items-center gap-2 bg-secondary/20 p-1 px-2 rounded-md border">
                  <Slider className="w-20" value={[zoom]} min={0.25} max={4} step={0.1} onValueChange={([v]) => setZoom(v)} />
                  <span className="text-[10px] font-mono min-w-[30px]">{Math.round(zoom * 100)}%</span>
                </div>
             </div>
             <Button size="sm" className="h-8 shadow-sm">Export PNG</Button>
          </div>
        </header>

        <TileCanvas 
          layers={layers}
          activeLayerId={activeLayerId}
          tilesets={tilesets}
          components={components}
          canvasSize={canvasSize}
          tileSize={tileSize}
          zoom={zoom}
          onPaint={paintTile}
          activeTool={activeTool}
          selection={selection}
          selectedComponentId={selectedComponentId}
        />
      </main>
      <Toaster />
    </div>
  )
}
