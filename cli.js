#!/usr/bin/env node
/**
 * Command-line interface for SVG Color Converter
 */
const { convertSvgFile, convertSvgDirectory } = require('./src/svgColorConverter');
const path = require('path');
const fs = require('fs-extra');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  printUsage();
  process.exit(1);
}

// Handle arguments
async function main() {
  try {
    const command = args[0];

    switch (command) {
      case '--file':
      case '-f':
        if (args.length < 2) {
          console.error('Error: Missing input file path');
          printUsage();
          process.exit(1);
        }
        const inputFile = args[1];
        const outputFile = args[2] || generateOutputPath(inputFile);
        
        console.log(`Converting file: ${inputFile}`);
        await convertSvgFile(inputFile, outputFile);
        console.log(`Converted file saved to: ${outputFile}`);
        break;

      case '--directory':
      case '-d':
        if (args.length < 2) {
          console.error('Error: Missing input directory path');
          printUsage();
          process.exit(1);
        }
        const inputDir = args[1];
        const outputDir = args[2] || generateOutputDirPath(inputDir);
        
        console.log(`Converting SVGs in directory: ${inputDir}`);
        const results = await convertSvgDirectory(inputDir, outputDir);
        console.log(`Converted ${results.length} SVG files to: ${outputDir}`);
        break;

      case '--help':
      case '-h':
        printUsage();
        break;

      default:
        console.error(`Error: Unknown command '${command}'`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function generateOutputPath(inputPath) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const basename = path.basename(inputPath, ext);
  return path.join(dir, `${basename}-converted${ext}`);
}

function generateOutputDirPath(inputDir) {
  return path.join(path.dirname(inputDir), `${path.basename(inputDir)}-converted`);
}

function printUsage() {
  console.log(`
SVG Color Converter - Convert hex colors in SVGs to currentColor

Usage:
  svgconvert -f|--file <input-file> [output-file]
  svgconvert -d|--directory <input-directory> [output-directory]
  svgconvert -h|--help

Options:
  -f, --file       Convert a single SVG file
  -d, --directory  Convert all SVG files in a directory
  -h, --help       Show this help message
  
Examples:
  svgconvert --file icon.svg
  svgconvert --file icon.svg icon-current.svg
  svgconvert --directory ./icons
  svgconvert --directory ./icons ./icons-current
`);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});