// src/viewer.ts
import { IfcParser, type IfcDataStore, extractPropertiesOnDemand } from '@ifc-lite/parser';
import { GeometryProcessor } from '@ifc-lite/geometry';
import { Renderer } from '@ifc-lite/renderer';
import { setupCameraControls } from './controls';

export class IfcViewer {
  private canvas: HTMLCanvasElement;
  private parser: IfcParser;
  private geometry: GeometryProcessor;
  private renderer: Renderer;
  private dataStore: IfcDataStore | null = null;
  private buffer: Uint8Array | null = null;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.parser = new IfcParser();
    this.geometry = new GeometryProcessor();
    this.renderer = new Renderer(canvas);
  }

  async init(): Promise<void> {
    await this.renderer.init();
    await this.geometry.init();
    this.setupControls();
    setupCameraControls(this.canvas, this.renderer);
  }

  async loadFile(file: File): Promise<{ entityCount: number }> {
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = new Uint8Array(arrayBuffer);

    // Parse data model (entities, properties, relationships)
    this.dataStore = await this.parser.parseColumnar(arrayBuffer, {
      onProgress: ({ phase, percent }) => {
        this.onProgress?.(`${phase}: ${percent}%`);
      }
    });

    // Process geometry. process() returns everything at once; for large
    // files, iterate this.geometry.processAdaptive(this.buffer) instead and
    // call this.renderer.addMeshes(event.meshes, true) per 'batch' event for
    // progressive display. When hand-rolling that loop, construct the
    // processor with new GeometryProcessor({ enableInstancing: false }) so
    // repeated elements stay in event.meshes on the parallel path.
    const geometryResult = await this.geometry.process(this.buffer);

    // Load into renderer
    this.renderer.loadGeometry(geometryResult);
    this.renderer.fitToView();

    // Start render loop
    this.startRenderLoop();

    return { entityCount: this.dataStore.entityCount };
  }

  private startRenderLoop(): void {
    let previousTime = performance.now();
    const animate = (time: number) => {
      const deltaTime = Math.min((time - previousTime) / 1000, 0.1);
      previousTime = time;
      this.renderer.getCamera().update(deltaTime);
      this.renderer.render();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private setupControls(): void {
    // Click to select
    this.canvas.addEventListener('click', async (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // pick() resolves to a PickResult or null. Besides `expressId` (the
      // product), a hit may carry `geometryItemId`, the representation item
      // the clicked surface was built from. See the rendering guide.
      const hit = await this.renderer.pick(x, y);
      if (hit) {
        this.onSelect?.(hit.expressId);
      } else {
        this.onSelect?.(null);
      }
    });
  }

  // Callbacks
  onProgress?: (message: string) => void;
  onSelect?: (expressId: number | null) => void;

  // Public methods
  getDataStore(): IfcDataStore | null {
    return this.dataStore;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  getEntity(expressId: number): any | null {
    if (!this.dataStore) return null;
    const ref = this.dataStore.entityIndex.byId.get(expressId);
    if (!ref) return null;
    // EntityRef only carries {expressId,type,byteOffset,byteLength,lineNumber}.
    // Name and GlobalId come from the store accessors, as QueryResultEntity does.
    return {
      ...ref,
      name: this.dataStore.entities.getName(expressId),
      globalId: this.dataStore.entities.getGlobalId(expressId),
    };
  }

  getProperties(expressId: number) {
    if (!this.dataStore) return null;
    return extractPropertiesOnDemand(this.dataStore, expressId);
  }

  getModelBounds(): { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null {
    // Get bounds from renderer's scene
    const scene = this.renderer.getScene();
    return scene.getBounds();
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
  }
}