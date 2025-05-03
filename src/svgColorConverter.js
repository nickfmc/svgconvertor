/**
 * SVG Color Converter
 * Converts hex color codes in SVG files to currentColor
 */
const { parse, stringify } = require('svgson');
const fs = require('fs-extra');
const path = require('path');

/**
 * Check if a string is a valid hex color
 * @param {string} str - String to check
 * @returns {boolean} - True if string is a valid hex color
 */
function isHexColor(str) {
  return /^#([0-9A-F]{3}){1,2}$/i.test(str);
}

/**
 * Replace hex colors with currentColor in SVG elements
 * @param {Object} node - SVG node object
 * @returns {Object} - Modified SVG node object
 */
function replaceColorsWithCurrentColor(node) {
  // Check if node has attributes
  if (node.attributes) {
    // Check for fill attribute
    if (node.attributes.fill && isHexColor(node.attributes.fill)) {
      node.attributes.fill = 'currentColor';
    }
    
    // Check for stroke attribute
    if (node.attributes.stroke && isHexColor(node.attributes.stroke)) {
      node.attributes.stroke = 'currentColor';
    }
    
    // Check for style attribute containing fill or stroke
    if (node.attributes.style) {
      node.attributes.style = node.attributes.style
        .replace(/fill:\s*#([0-9A-F]{3,6})/gi, 'fill: currentColor')
        .replace(/stroke:\s*#([0-9A-F]{3,6})/gi, 'stroke: currentColor');
    }
  }
  
  // Process child nodes recursively
  if (node.children && node.children.length > 0) {
    node.children = node.children.map(replaceColorsWithCurrentColor);
  }
  
  return node;
}

/**
 * Convert a single SVG file
 * @param {string} svgContent - Content of the SVG file
 * @returns {Promise<string>} - Modified SVG content
 */
async function convertSvg(svgContent) {
  try {
    // Parse SVG to object
    const svgObj = await parse(svgContent);
    
    // Replace colors with currentColor
    const modifiedSvgObj = replaceColorsWithCurrentColor(svgObj);
    
    // Convert back to SVG string
    return stringify(modifiedSvgObj);
  } catch (error) {
    console.error('Error converting SVG:', error);
    throw error;
  }
}

/**
 * Process a single SVG file and save the converted output
 * @param {string} inputPath - Path to input SVG file
 * @param {string} outputPath - Path to save converted SVG file
 * @returns {Promise<void>}
 */
async function convertSvgFile(inputPath, outputPath) {
  try {
    const svgContent = await fs.readFile(inputPath, 'utf8');
    const convertedSvg = await convertSvg(svgContent);
    await fs.outputFile(outputPath, convertedSvg);
    return outputPath;
  } catch (error) {
    console.error(`Error processing file ${inputPath}:`, error);
    throw error;
  }
}

/**
 * Process a directory of SVG files
 * @param {string} inputDir - Directory containing SVG files
 * @param {string} outputDir - Directory to save converted SVG files
 * @returns {Promise<string[]>} - List of processed files
 */
async function convertSvgDirectory(inputDir, outputDir) {
  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    // Get all SVG files in the input directory
    const files = await fs.readdir(inputDir);
    const svgFiles = files.filter(file => path.extname(file).toLowerCase() === '.svg');
    
    // Process each SVG file
    const results = await Promise.all(
      svgFiles.map(async (file) => {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file);
        return await convertSvgFile(inputPath, outputPath);
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error processing directory:', error);
    throw error;
  }
}

module.exports = {
  convertSvg,
  convertSvgFile,
  convertSvgDirectory
};