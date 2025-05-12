// svgCrop.js
// Utility to crop SVG canvas to the bounding box of visible elements
const { parse, stringify } = require('svgson');

/**
 * Calculate the bounding box of all elements with geometry in an SVG JSON object.
 * Only supports <rect>, <circle>, <ellipse>, <line>, <polygon>, <polyline>, <path>.
 * @param {Object} svgObj - Parsed SVG JSON object
 * @returns {Object} - { minX, minY, maxX, maxY } or null if no geometry
 */
function getBoundingBox(svgObj) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;

  function updateBBox(x, y, x2, y2) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
    found = true;
  }

  function traverse(node) {
    if (!node) return;
    const { name, attributes } = node;
    if (!attributes) return;
    switch (name) {
      case 'rect': {
        const x = parseFloat(attributes.x || 0);
        const y = parseFloat(attributes.y || 0);
        const w = parseFloat(attributes.width || 0);
        const h = parseFloat(attributes.height || 0);
        if (w > 0 && h > 0) updateBBox(x, y, x + w, y + h);
        break;
      }
      case 'circle': {
        const cx = parseFloat(attributes.cx || 0);
        const cy = parseFloat(attributes.cy || 0);
        const r = parseFloat(attributes.r || 0);
        if (r > 0) updateBBox(cx - r, cy - r, cx + r, cy + r);
        break;
      }
      case 'ellipse': {
        const cx = parseFloat(attributes.cx || 0);
        const cy = parseFloat(attributes.cy || 0);
        const rx = parseFloat(attributes.rx || 0);
        const ry = parseFloat(attributes.ry || 0);
        if (rx > 0 && ry > 0) updateBBox(cx - rx, cy - ry, cx + rx, cy + ry);
        break;
      }
      case 'line': {
        const x1 = parseFloat(attributes.x1 || 0);
        const y1 = parseFloat(attributes.y1 || 0);
        const x2 = parseFloat(attributes.x2 || 0);
        const y2 = parseFloat(attributes.y2 || 0);
        updateBBox(x1, y1, x2, y2);
        break;
      }
      case 'polygon':
      case 'polyline': {
        const points = (attributes.points || '').trim().split(/\s+/).map(pt => pt.split(',').map(Number));
        points.forEach(([x, y]) => {
          if (!isNaN(x) && !isNaN(y)) updateBBox(x, y, x, y);
        });
        break;
      }
      case 'path': {
        // Use a simple path bbox estimator for M/m/L/l/H/h/V/v/Z/z only
        // For production, use a path bbox library
        const d = attributes.d || '';
        let x = 0, y = 0;
        let startX = 0, startY = 0;
        const cmds = d.match(/[a-zA-Z][^a-zA-Z]*/g) || [];
        cmds.forEach(cmd => {
          const type = cmd[0];
          const nums = cmd.slice(1).trim().split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
          switch (type) {
            case 'M':
            case 'L':
              for (let i = 0; i < nums.length; i += 2) {
                x = nums[i];
                y = nums[i + 1];
                updateBBox(x, y, x, y);
                if (type === 'M' && i === 0) {
                  startX = x;
                  startY = y;
                }
              }
              break;
            case 'm':
            case 'l':
              for (let i = 0; i < nums.length; i += 2) {
                x += nums[i];
                y += nums[i + 1];
                updateBBox(x, y, x, y);
                if (type === 'm' && i === 0) {
                  startX = x;
                  startY = y;
                }
              }
              break;
            case 'H':
              nums.forEach(val => {
                x = val;
                updateBBox(x, y, x, y);
              });
              break;
            case 'h':
              nums.forEach(val => {
                x += val;
                updateBBox(x, y, x, y);
              });
              break;
            case 'V':
              nums.forEach(val => {
                y = val;
                updateBBox(x, y, x, y);
              });
              break;
            case 'v':
              nums.forEach(val => {
                y += val;
                updateBBox(x, y, x, y);
              });
              break;
            case 'Z':
            case 'z':
              x = startX;
              y = startY;
              updateBBox(x, y, x, y);
              break;
            default:
              break;
          }
        });
        break;
      }
      default:
        break;
    }
    if (node.children) node.children.forEach(traverse);
  }
  traverse(svgObj);
  return found ? { minX, minY, maxX, maxY } : null;
}

/**
 * Crop SVG JSON object to its bounding box by updating viewBox and optionally width/height.
 * @param {Object} svgObj - Parsed SVG JSON object
 * @returns {Object} - Cropped SVG JSON object
 */
function cropSvgToBBox(svgObj) {
  if (!svgObj || svgObj.name !== 'svg') return svgObj;
  const bbox = getBoundingBox(svgObj);
  if (!bbox) return svgObj;
  const { minX, minY, maxX, maxY } = bbox;
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return svgObj;
  svgObj.attributes.viewBox = `${minX} ${minY} ${w} ${h}`;
  // Optionally, set width/height to match cropped size
  if (svgObj.attributes.width) svgObj.attributes.width = w;
  if (svgObj.attributes.height) svgObj.attributes.height = h;
  return svgObj;
}

module.exports = { cropSvgToBBox };
