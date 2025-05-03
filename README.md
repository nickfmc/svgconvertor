# SVG Color Converter

A tool to convert hex color codes in SVG files to `currentColor`, making SVGs more flexible for styling with CSS.

## Features

- Convert hex colors in SVG files to `currentColor`
- Process individual SVG files or entire directories
- Command-line interface for batch processing
- Web interface for easy online conversion
- Drag & drop support for file uploads
- Support for multiple file processing
- Preserves original SVG structure

## Installation

### Local Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/svg-color-converter.git
cd svg-color-converter

# Install dependencies
npm install

# Make the CLI globally available (optional)
npm link
```

## Usage

### Command-Line Interface

The command-line interface allows you to process SVG files directly from your terminal:

```bash
# Convert a single SVG file
svgconvert --file path/to/icon.svg

# Specify an output file
svgconvert --file path/to/icon.svg path/to/output.svg

# Convert all SVGs in a directory
svgconvert --directory path/to/icons/

# Specify an output directory
svgconvert --directory path/to/icons/ path/to/output/

# Get help
svgconvert --help
```

You can also use shorthand commands:

```bash
svgconvert -f icon.svg
svgconvert -d ./icons
```

### Web Interface

The web interface provides a user-friendly way to convert SVG files:

```bash
# Start the server
npm start

# Or, for development with auto-restart on file changes
npm run dev
```

Then open your browser and navigate to `http://localhost:3000` to access the web interface.

## How It Works

The application parses SVG files and replaces all hex color values (`#RRGGBB` or `#RGB`) in the following attributes:

- `fill` attributes
- `stroke` attributes
- CSS `fill` and `stroke` properties in `style` attributes

All hex colors are replaced with the `currentColor` keyword, which makes the SVG inherit its color from the CSS `color` property of its parent element.

## Deployment

To deploy the web service to a hosting platform:

1. Set up a Node.js environment on your hosting provider
2. Upload the project files
3. Install dependencies with `npm install`
4. Start the server with `npm start`
5. Configure the hosting environment to set PORT if needed

## License

ISC