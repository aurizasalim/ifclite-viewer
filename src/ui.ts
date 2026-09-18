// src/ui.ts
export function updateStatus(message: string): void {
  const status = document.getElementById('status');
  if (status) status.textContent = message;
}

export function updateProgress(percent: number): void {
  updateStatus(`Loading: ${percent.toFixed(0)}%`);
}

export function renderProperties(
  container: HTMLElement,
  expressId: number,
  entity: any,
  propertySets: Array<{ name: string; properties: Array<{ name: string; value: any }> }>
): void {
  container.innerHTML = '';

  // Entity info
  const header = document.createElement('div');
  header.className = 'prop-section';
  header.innerHTML = `
    <h3>Entity #${expressId}</h3>
    <p><strong>Type:</strong> ${entity.type}</p>
    <p><strong>Name:</strong> ${entity.name || 'N/A'}</p>
    <p><strong>GlobalId:</strong> ${entity.globalId}</p>
  `;
  container.appendChild(header);

  // Property sets
  for (const pset of propertySets) {
    const section = document.createElement('div');
    section.className = 'prop-section';

    const title = document.createElement('h4');
    title.textContent = pset.name;
    section.appendChild(title);

    const table = document.createElement('table');
    for (const prop of pset.properties) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${prop.name}</td>
        <td>${formatValue(prop.value)}</td>
      `;
      table.appendChild(row);
    }
    section.appendChild(table);
    container.appendChild(section);
  }
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toFixed(2);
  return String(value);
}

