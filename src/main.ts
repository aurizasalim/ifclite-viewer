// src/main.ts
import { IfcViewer } from './viewer';
import { updateStatus, renderProperties } from './ui';
import './style.css';

const SAMPLE_IFC_URL = 'https://raw.githubusercontent.com/ThatOpen/engine_web-ifc/main/tests/ifcfiles/public/AC20-FZK-Haus.ifc';

async function loadSampleFile(viewer: IfcViewer): Promise<{ entityCount: number }> {
  const response = await fetch(SAMPLE_IFC_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch sample IFC: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const file = new File([blob], 'AC20-FZK-Haus.ifc', { type: 'application/octet-stream' });
  return viewer.loadFile(file);
}

async function main() {
  // Get elements
  const canvas = document.getElementById('viewer') as HTMLCanvasElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const propertiesPanel = document.getElementById('properties') as HTMLElement;

  // Create viewer
  const viewer = new IfcViewer(canvas);

  // Add toolbar buttons
  /*
  const presets = ['front', 'back', 'left', 'right', 'top'] as const;
  presets.forEach((preset) => {
    const button = document.createElement('button');
    button.textContent = preset;
    button.onclick = () => {
      const camera = viewer.getRenderer().getCamera();
      camera.setPresetView(preset, viewer.getModelBounds() ?? undefined);
    };
    toolbar.appendChild(button);
  });
  */

  // Set up callbacks
  viewer.onProgress = updateStatus; // onProgress delivers a "phase: percent%" string
  viewer.onSelect = (expressId) => {
    if (expressId) {
      const entity = viewer.getEntity(expressId);
      const props = viewer.getProperties(expressId);
      if (entity) {
        renderProperties(propertiesPanel, expressId, entity, props || []);
      }
    } else {
      propertiesPanel.innerHTML = '<p>Click an element to view properties</p>';
    }
  };

  // Initialize
  try {
    await viewer.init();
    updateStatus('Loading sample IFC...');

    try {
      const result = await loadSampleFile(viewer);
      updateStatus(`Loaded sample IFC: ${result.entityCount} entities`);
    } catch (error) {
      updateStatus('Failed to load sample IFC');
      console.error(error);
    }
  } catch (error) {
    updateStatus('WebGPU not supported');
    console.error(error);
    return;
  }

  // File input handler
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    updateStatus(`Loading ${file.name}...`);

    try {
      const result = await viewer.loadFile(file);
      updateStatus(`Loaded ${result.entityCount} entities`);
    } catch (error) {
      updateStatus('Error loading file');
      console.error(error);
    }
  });
}

main();