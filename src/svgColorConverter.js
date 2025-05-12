/**
 * SVG Color Converter
 * Converts hex color codes in SVG files to currentColor
 */
const { parse, stringify } = require('svgson');
const { cropSvgToBBox } = require('./svgCrop');
const fs = require('fs-extra');
const path = require('path');

// List of standard CSS/SVG color names
const COLOR_NAMES = [
  'aliceblue','antiquewhite','aqua','aquamarine','azure','beige','bisque','black','blanchedalmond','blue','blueviolet','brown','burlywood','cadetblue','chartreuse','chocolate','coral','cornflowerblue','cornsilk','crimson','cyan','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen','darkgrey','darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue','darkslategray','darkslategrey','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dimgrey','dodgerblue','firebrick','floralwhite','forestgreen','fuchsia','gainsboro','ghostwhite','gold','goldenrod','gray','green','greenyellow','grey','honeydew','hotpink','indianred','indigo','ivory','khaki','lavender','lavenderblush','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgreen','lightgrey','lightpink','lightsalmon','lightseagreen','lightskyblue','lightslategray','lightslategrey','lightsteelblue','lightyellow','lime','limegreen','linen','magenta','maroon','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise','mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','navy','oldlace','olive','olivedrab','orange','orangered','orchid','palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','peru','pink','plum','powderblue','purple','rebeccapurple','red','rosybrown','royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell','sienna','silver','skyblue','slateblue','slategray','slategrey','snow','springgreen','steelblue','tan','teal','thistle','tomato','turquoise','violet','wheat','white','whitesmoke','yellow','yellowgreen'
];

/**
 * Check if a string is a valid hex color
 * @param {string} str - String to check
 * @returns {boolean} - True if string is a valid hex color
 */
function isHexColor(str) {
  return /^#([0-9A-F]{3}){1,2}$/i.test(str);
}

function isRgbColor(str) {
  // Matches rgb(…), rgba(…), hsl(…), hsla(…) with numeric values
  return /^(rgb|rgba|hsl|hsla)\s*\(([^)]+)\)$/i.test(str.trim());
}

/**
 * Check if a string is a valid named color
 * @param {string} str - String to check
 * @returns {boolean} - True if string is a valid named color
 */
function isNamedColor(str) {
  if (typeof str !== 'string') return false;
  return COLOR_NAMES.includes(str.trim().toLowerCase());
}

/**
 * Check if a string is a color to replace
 * @param {string} str - String to check
 * @returns {boolean} - True if string is a color to replace
 */
function isColorToReplace(str) {
  return isHexColor(str) || isNamedColor(str) || isRgbColor(str);
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
    if (node.attributes.fill && isColorToReplace(node.attributes.fill)) {
      node.attributes.fill = 'currentColor';
    }
    // Check for stroke attribute
    if (node.attributes.stroke && isColorToReplace(node.attributes.stroke)) {
      node.attributes.stroke = 'currentColor';
    }
    
    // Check for style attribute containing fill or stroke
    if (node.attributes.style) {
      node.attributes.style = node.attributes.style
        // Replace hex, named, and rgb/hsl colors for fill
        .replace(/fill:\s*([^;]+);/gi, (match, color) => {
          return isColorToReplace(color) ? 'fill: currentColor;' : match;
        })
        // Replace hex, named, and rgb/hsl colors for stroke
        .replace(/stroke:\s*([^;]+);/gi, (match, color) => {
          return isColorToReplace(color) ? 'stroke: currentColor;' : match;
        });
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
/**
 * Convert a single SVG file (optionally crop canvas)
 * @param {string} svgContent - Content of the SVG file
 * @param {boolean} [crop=false] - Whether to crop canvas to content
 * @returns {Promise<string>} - Modified SVG content
 */
/**
 * Convert a single SVG file (optionally crop canvas, handle base64)
 * @param {string} svgContent - Content of the SVG file (plain XML or base64 data URI)
 * @param {boolean} [crop=false] - Whether to crop canvas to content
 * @returns {Promise<string>} - Modified SVG content (same format as input)
 */
async function convertSvg(svgContent, crop = false) {
  try {
    // --- Handle base64 data URI ---
    let wasBase64 = false;
    let prefix = '';
    const base64Match = /^data:image\/svg\+xml(;charset=[^;,]+)?;base64,(.*)$/i.exec(svgContent.trim());
    if (base64Match) {
      wasBase64 = true;
      prefix = base64Match[0].slice(0, base64Match[0].indexOf(',') + 1); // preserve any charset
      svgContent = Buffer.from(base64Match[2], 'base64').toString('utf8');
    }

    // Preprocess <style> blocks to replace fill/stroke color names and hex codes with currentColor
    const styleRegex = /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi;
    svgContent = svgContent.replace(styleRegex, (match, startTag, cssContent, endTag) => {
      // Replace fill and stroke declarations with hex, named, and rgb/hsl colors
      const replacedCss = cssContent
        .replace(/(fill:)\s*([^;]+);/gi, (m, prop, color) => {
          return isColorToReplace(color) ? `${prop} currentColor;` : m;
        })
        .replace(/(stroke:)\s*([^;]+);/gi, (m, prop, color) => {
          return isColorToReplace(color) ? `${prop} currentColor;` : m;
        });
      return startTag + replacedCss + endTag;
    });

    // Parse SVG to object
    const svgObj = await parse(svgContent);
    
    // Replace colors with currentColor (inline and style attributes)
    let modifiedSvgObj = replaceColorsWithCurrentColor(svgObj);
    // Optionally crop canvas
    if (crop) {
      modifiedSvgObj = cropSvgToBBox(modifiedSvgObj);
    }
    // Convert back to SVG string
    let result = stringify(modifiedSvgObj);
    // If input was base64, re-encode as data URI
    if (wasBase64) {
      const b64 = Buffer.from(result, 'utf8').toString('base64');
      // Use the same prefix as input, or a standard one
      result = prefix ? prefix + b64 : 'data:image/svg+xml;base64,' + b64;
    }
    return result;
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