/**
 * Web server for SVG Color Converter
 * Provides a web interface for converting SVG files
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { convertSvg } = require('./src/svgColorConverter');

// Configure app
const app = express();
const port = process.env.PORT || 3000;

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

// Create upload middleware
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only SVG files
    if (path.extname(file.originalname).toLowerCase() !== '.svg') {
      return cb(new Error('Only SVG files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Single file upload route
app.post('/convert/single', upload.single('svgFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded SVG file
    const svgContent = await fs.readFile(req.file.path, 'utf8');
    
    // Convert the SVG content
    const convertedSvg = await convertSvg(svgContent);
    
    // Save the converted SVG
    const outputPath = path.join('uploads', `converted-${path.basename(req.file.path)}`);
    await fs.writeFile(outputPath, convertedSvg);
    
    // Return the converted SVG file path
    res.json({
      originalName: req.file.originalname,
      convertedPath: outputPath
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multiple files upload route
app.post('/convert/multiple', upload.array('svgFiles', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process each uploaded file
    const results = await Promise.all(
      req.files.map(async (file) => {
        const svgContent = await fs.readFile(file.path, 'utf8');
        const convertedSvg = await convertSvg(svgContent);
        const outputPath = path.join('uploads', `converted-${path.basename(file.path)}`);
        await fs.writeFile(outputPath, convertedSvg);
        
        return {
          originalName: file.originalname,
          convertedPath: outputPath
        };
      })
    );
    
    res.json({ results });
  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to download a converted file
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  res.download(filePath, `converted-${filename}`, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(404).send('File not found');
    }
  });
});

// Clean up uploads periodically (files older than 1 hour)
const cleanupUploads = async () => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = await fs.readdir(uploadsDir);
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtimeMs < oneHourAgo) {
        await fs.unlink(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up uploads:', error);
  }
};

// Clean up uploads every hour
setInterval(cleanupUploads, 60 * 60 * 1000);

// Start the server
app.listen(port, () => {
  console.log(`SVG Color Converter server running at http://localhost:${port}`);
});