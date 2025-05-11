// Group JSON Exporter for SVG Color Converter
// This script adds UI and logic to export all converted SVGs as a JSON group

document.addEventListener('DOMContentLoaded', () => {
  // Add UI for group JSON export
  const resultsContainer = document.getElementById('results-container');
  if (!resultsContainer) return;

  // Create group JSON UI
  const groupDiv = document.createElement('div');
  groupDiv.className = 'group-json-container';
  groupDiv.style.marginTop = '2rem';

  const groupLabel = document.createElement('label');
  groupLabel.textContent = 'Group Name:';
  groupLabel.setAttribute('for', 'group-name-input');
  groupLabel.style.marginRight = '0.5rem';

  const groupInput = document.createElement('input');
  groupInput.type = 'text';
  groupInput.id = 'group-name-input';
  groupInput.placeholder = 'Enter group name';
  groupInput.style.marginRight = '0.5rem';
  groupInput.style.padding = '0.25rem 0.5rem';

  const generateBtn = document.createElement('button');
  generateBtn.id = 'generate-group-json';
  generateBtn.className = 'download-all-btn';
  generateBtn.textContent = 'Generate JSON';

  groupDiv.appendChild(groupLabel);
  groupDiv.appendChild(groupInput);
  groupDiv.appendChild(generateBtn);
  resultsContainer.appendChild(groupDiv);

  // Listen for click on Generate JSON
  generateBtn.addEventListener('click', () => {
    // Get group name
    const groupName = groupInput.value.trim() || 'My Icons Group';
    // Use the global convertedFiles array from script.js
    if (!window.convertedFiles || window.convertedFiles.length === 0) {
      alert('No converted SVGs to export.');
      return;
    }
    // Build assets array
    const assets = window.convertedFiles.map(file => ({
      id: file.convertedPath.replace(/\.svg$/i, ''),
      name: file.originalName.replace(/\.svg$/i, ''),
      icon: file.svgDataUrl
        ? atob(file.svgDataUrl.split(',')[1]) // If using data URL, decode
        : file.svgContent || '', // If available, use raw SVG content
    }));
    // If no icon content, fetch from server (sync XHR for simplicity)
    assets.forEach(asset => {
      if (!asset.icon) {
        const req = new XMLHttpRequest();
        req.open('GET', `/download/${asset.id}.svg`, false);
        req.send();
        if (req.status === 200) {
          asset.icon = req.responseText;
        }
      }
    });
    // Build final JSON
    const groupJson = {
      type: 'icons',
      group: groupName,
      assets,
    };
    // Download JSON
    const blob = new Blob([JSON.stringify(groupJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${groupName.replace(/\s+/g, '_')}_icons.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
});
