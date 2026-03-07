"use client"

import React, { useState, useEffect } from 'react'
import { useTileEditor, Layer } from '@/hooks/use-tile-editor'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
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
  ChevronDown,
  Scaling,
  Download,
  Loader2,
  PlusCircle,
  MinusCircle,
  FileJson,
  FolderOpen,
  Rocket,
  Eye as ViewIcon
} from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
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
    addLayer, toggleLayerMode, renameLayer, reorderLayer,
    paintTile, activeTool, setActiveTool,
    scaleDirection, setScaleDirection,
    backgroundImage, setBackgroundImage,
    backgroundOpacity, setBackgroundOpacity,
    importProject
  } = useTileEditor()

  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isProjectLoading, setIsProjectLoading] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const currentTileset = tilesets.find(t => t.id === selectedTilesetId)
  const activeLayer = layers.find(l => l.id === activeLayerId)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasTiles = layers.some(l => l.tileData?.some(row => row.some(cell => cell !== null)))
      const hasObjects = layers.some(l => l.objects?.length > 0)
      const hasAssets = tilesets.length > 0 || components.length > 0
      
      if (hasTiles || hasObjects || hasAssets) {
        e.preventDefault()
        e.returnValue = '' 
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [tilesets.length, components.length, layers])

  const generateCompositedCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas')
    canvas.width = canvasSize.width * tileSize.width
    canvas.height = canvasSize.height * tileSize.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("Could not initialize canvas context")

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = url
      })
    }

    const tilesetCache = new Map<string, HTMLImageElement>()
    for (const ts of tilesets) {
      tilesetCache.set(ts.id, await loadImage(ts.url))
    }

    const componentCache = new Map<string, HTMLImageElement>()
    for (const comp of components) {
      componentCache.set(comp.id, await loadImage(comp.url))
    }

    const renderLayers = [...layers].reverse()
    for (const layer of renderLayers) {
      if (!layer.visible) continue

      if (layer.mode === 'tilemap') {
        layer.tileData.forEach((row, y) => {
          row.forEach((cell, x) => {
            if (!cell) return
            const img = tilesetCache.get(cell.tilesetId)
            if (!img) return
            
            ctx.drawImage(
              img,
              cell.tx * tileSize.width, cell.ty * tileSize.height, tileSize.width, tileSize.height,
              x * tileSize.width, y * tileSize.height, tileSize.width, tileSize.height
            )
          })
        })
      } else {
        layer.objects.forEach((obj) => {
          const img = componentCache.get(obj.componentId)
          if (!img) return
          ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height)
        })
      }
    }
    return canvas
  }

  const handlePreview = async () => {
    setIsPreviewLoading(true)
    try {
      const canvas = await generateCompositedCanvas()
      setPreviewUrl(canvas.toDataURL('image/png'))
      setIsPreviewOpen(true)
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Preview Failed",
        description: "There was an error generating the preview image.",
      })
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleExportPNG = async () => {
    setIsExporting(true)
    try {
      const canvas = await generateCompositedCanvas()
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = 'tileforge-map.png'
      link.href = dataUrl
      link.click()

      toast({
        title: "Export Successful",
        description: "Your map has been downloaded as a PNG.",
      })
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "There was an error generating the image.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportRelease = async () => {
    if (!('showDirectoryPicker' in window)) {
      toast({
        variant: "destructive",
        title: "Browser Incompatible",
        description: "Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.",
      })
      return
    }

    setIsReleasing(true)
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const mapWidth = canvasSize.width * tileSize.width
      const mapHeight = canvasSize.height * tileSize.height

      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = url
        })
      }

      // 1. Export Tilesets as PNG files
      const tilesetExportData = await Promise.all(tilesets.map(async (ts) => {
        const response = await fetch(ts.url)
        const blob = await response.blob()
        const fileName = `tileset-${ts.id}.png`
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
        return {
          id: ts.id,
          name: ts.name,
          imagePath: fileName
        }
      }))

      // 2. Export Layers
      const componentCache = new Map<string, HTMLImageElement>()
      for (const comp of components) {
        componentCache.set(comp.id, await loadImage(comp.url))
      }

      const releaseLayers = await Promise.all(layers.map(async (layer) => {
        if (layer.mode === 'tilemap') {
          return {
            id: layer.id,
            name: layer.name,
            type: 'tilemap',
            visible: layer.visible,
            data: layer.tileData
          }
        } else {
          // Bake object layer to a single picture cropped to canvas size
          const canvas = document.createElement('canvas')
          canvas.width = mapWidth
          canvas.height = mapHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error("Canvas context failed")

          layer.objects.forEach(obj => {
            const img = componentCache.get(obj.componentId)
            if (!img) return
            ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height)
          })

          const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
          const fileName = `layer-${layer.id}.png`
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(blob)
          await writable.close()

          return {
            id: layer.id,
            name: layer.name,
            type: 'baked_objects',
            visible: layer.visible,
            imagePath: fileName
          }
        }
      }))

      // 3. Export release.json
      const releasePackage = {
        version: "1.0-release",
        name: "TileForge Project Release",
        canvasSize,
        tileSize,
        tilesets: tilesetExportData,
        layers: releaseLayers
      }

      const jsonFileHandle = await dirHandle.getFileHandle('release.json', { create: true })
      const jsonWritable = await jsonFileHandle.createWritable()
      await jsonWritable.write(JSON.stringify(releasePackage, null, 2))
      await jsonWritable.close()

      toast({
        title: "Release Successful",
        description: "All files have been written to the selected directory.",
      })
    } catch (error: any) {
      if (error.name === 'AbortError') return // User cancelled
      console.error(error)
      toast({
        variant: "destructive",
        title: "Release Failed",
        description: error.message || "Could not write files to directory.",
      })
    } finally {
      setIsReleasing(false)
    }
  }

  const handleExportProject = async () => {
    setIsProjectLoading(true)
    try {
      const urlToBase64 = async (url: string): Promise<string> => {
        if (url.startsWith('data:')) return url
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          return url
        }
      }

      const serializedTilesets = await Promise.all(tilesets.map(async (ts) => ({
        ...ts,
        url: await urlToBase64(ts.url)
      })))

      const projectData = {
        version: "1.0",
        tilesets: serializedTilesets,
        components,
        layers,
        tileSize,
        canvasSize,
        activeLayerId,
        backgroundImage: backgroundImage ? await urlToBase64(backgroundImage) : null,
        backgroundOpacity
      }

      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `project-${new Date().toISOString().slice(0,10)}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Project Exported",
        description: "Workspace configuration has been saved.",
      })
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Project Export Failed",
        description: "Could not serialize workspace data.",
      })
    } finally {
      setIsProjectLoading(false)
    }
  }

  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        importProject(data)
        toast({
          title: "Project Imported",
          description: "Workspace has been restored.",
        })
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "Invalid project file format.",
        })
      }
    }
    reader.readAsText(file)
  }

  const handleFinishEditingLayerName = () => {
    if (editingLayerId && editName.trim()) {
      renameLayer(editingLayerId, editName.trim())
    }
    setEditingLayerId(null)
  }

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
          {/* Project Management */}
          <section>
            <Label className="text-xs uppercase text-muted-foreground font-semibold mb-2 block">Project</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleExportProject} disabled={isProjectLoading}>
                {isProjectLoading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <FileJson size={14} className="mr-2" />} Export
              </Button>
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <FolderOpen size={14} className="mr-2" /> Import
                  <input type="file" className="hidden" accept=".json" onChange={handleImportProject} />
                </label>
              </Button>
            </div>
          </section>

          <Separator />

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
              <Button 
                variant={activeTool === 'scale' ? 'default' : 'outline'} 
                size="sm"
                className="col-span-2"
                onClick={() => setActiveTool('scale')}
                disabled={activeLayer?.mode !== 'object'}
                title={activeLayer?.mode !== 'object' ? "Scale only available for Object layers" : "Scale Object"}
              >
                <Scaling size={14} className="mr-2" /> Scale Tool
              </Button>
            </div>
            
            {activeTool === 'scale' && activeLayer?.mode === 'object' && (
              <div className="mt-3 p-2 bg-secondary/30 rounded-md border border-dashed animate-in fade-in slide-in-from-top-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold mb-2 block">Scale Direction</Label>
                <div className="flex gap-2">
                  <Button 
                    variant={scaleDirection === 'up' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={() => setScaleDirection('up')}
                  >
                    <PlusCircle size={12} className="mr-1" /> Up
                  </Button>
                  <Button 
                    variant={scaleDirection === 'down' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={() => setScaleDirection('down')}
                  >
                    <MinusCircle size={12} className="mr-1" /> Down
                  </Button>
                </div>
              </div>
            )}
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
                    <div className="flex-1 min-w-0">
                      {editingLayerId === layer.id ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={handleFinishEditingLayerName}
                          onKeyDown={(e) => e.key === 'Enter' && handleFinishEditingLayerName()}
                          autoFocus
                          className="h-6 text-[10px] px-1 py-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span 
                          className={cn("block text-xs truncate", activeLayerId === layer.id ? "font-semibold text-primary" : "text-muted-foreground")}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingLayerId(layer.id);
                            setEditName(layer.name);
                          }}
                          title="Double-click to rename"
                        >
                          {layer.name}
                        </span>
                      )}
                    </div>
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

          <div className="flex items-center gap-3 shrink-0 ml-4">
             <div className="flex items-center gap-2 border-r pr-3">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Zoom</Label>
                <div className="flex items-center gap-2 bg-secondary/20 p-1 px-2 rounded-md border">
                  <Slider className="w-20" value={[zoom]} min={0.25} max={4} step={0.1} onValueChange={([v]) => setZoom(v)} />
                  <span className="text-[10px] font-mono min-w-[30px]">{Math.round(zoom * 100)}%</span>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
               <Button 
                variant="outline"
                size="sm" 
                className="h-8 shadow-sm" 
                onClick={handlePreview}
                disabled={isPreviewLoading}
               >
                  {isPreviewLoading ? <Loader2 className="mr-2 animate-spin" /> : <ViewIcon className="mr-2" />}
                  Preview
               </Button>
               <Button 
                variant="outline"
                size="sm" 
                className="h-8 shadow-sm" 
                onClick={handleExportRelease}
                disabled={isReleasing}
               >
                  {isReleasing ? <Loader2 className="mr-2 animate-spin" /> : <Rocket className="mr-2" />}
                  Release
               </Button>
               <Button 
                size="sm" 
                className="h-8 shadow-sm" 
                onClick={handleExportPNG}
                disabled={isExporting}
               >
                  {isExporting ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                  Export PNG
               </Button>
             </div>
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Map Preview</DialogTitle>
            <DialogDescription>
              This is a composite of all visible layers. What you see is what will be exported.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-secondary/20 p-4 rounded-md flex items-center justify-center">
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Map Preview" 
                className="max-w-full h-auto shadow-lg border bg-white" 
                style={{ imageRendering: 'pixelated' }}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
            <Button onClick={handleExportPNG}>Download PNG</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
