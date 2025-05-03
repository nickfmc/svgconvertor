/**
 * Web server for SVG Color Converter
 * Provides a web interface for converting SVG files
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const { convertSvg } = require('./src/svgColorConverter');
const os = require('os');

// Configure app
const app = express();
const port = process.env.PORT || 3000;

// Set up the uploads directory - use /tmp for Vercel serverless functions
const UPLOAD_DIR = process.env.VERCEL ? path.join('/tmp') : path.join(__dirname, 'uploads');

// Set path for public directory
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure upload directory exists
fs.ensureDirSync(UPLOAD_DIR);

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
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
app.use(express.static(PUBLIC_DIR));

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
    const outputPath = path.join(UPLOAD_DIR, `converted-${path.basename(req.file.path)}`);
    await fs.writeFile(outputPath, convertedSvg);
    
    // Return the converted SVG file path
    res.json({
      originalName: req.file.originalname,
      convertedPath: path.basename(outputPath)
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
        const outputPath = path.join(UPLOAD_DIR, `converted-${path.basename(file.path)}`);
        await fs.writeFile(outputPath, convertedSvg);
        
        return {
          originalName: file.originalname,
          convertedPath: path.basename(outputPath)
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
  const filePath = path.join(UPLOAD_DIR, filename);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Error accessing file:', err);
      return res.status(404).send('File not found');
    }
    
    // Set proper headers for SVG download
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="converted-${filename}"`);
    
    // Stream the file instead of using res.download
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).send('Error downloading file');
      }
    });
  });
});

// Route to download all converted files as ZIP
app.get('/download-zip', async (req, res) => {
  try {
    const fileIds = req.query.files ? req.query.files.split(',') : [];
    
    if (!fileIds.length) {
      return res.status(400).send('No files specified');
    }
    
    console.log(`Creating ZIP for files: ${fileIds.join(', ')}`);
    
    // Create a unique ID for the zip file
    const zipId = uuidv4();
    const zipFilename = `svg-converted-${zipId}.zip`;
    const zipPath = path.join(UPLOAD_DIR, zipFilename);
    
    console.log(`ZIP will be created at: ${zipPath}`);
    
    // Create a write stream for the zip file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle errors on output stream
    output.on('error', err => {
      console.error('Error creating zip output stream:', err);
      if (!res.headersSent) {
        res.status(500).send('Error creating zip file');
      }
    });
    
    // Listen for all archive data to be written
    output.on('close', () => {
      console.log(`Created ZIP: ${zipFilename} (${archive.pointer()} bytes)`);
      
      // Verify the file exists before sending
      if (fs.existsSync(zipPath)) {
        console.log('ZIP file exists, sending to client');
        
        // The archive is fully written, now send it to the client
        if (!res.headersSent) {
          // Set explicit headers for ZIP download
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', 'attachment; filename="converted-svgs.zip"');
          
          // Stream the file to the client
          const fileStream = fs.createReadStream(zipPath);
          fileStream.pipe(res);
          
          fileStream.on('error', (error) => {
            console.error('Error streaming ZIP file:', error);
            if (!res.headersSent) {
              res.status(500).send('Error downloading ZIP file');
            }
          });
          
          fileStream.on('end', () => {
            console.log('Finished sending ZIP to client');
            
            // Delete the temporary zip file after sending
            setTimeout(() => {
              fs.unlink(zipPath, unlinkErr => {
                if (unlinkErr) {
                  console.error('Error deleting zip file:', unlinkErr);
                } else {
                  console.log(`Deleted temporary zip file: ${zipFilename}`);
                }
              });
            }, 1000);
          });
        }
      } else {
        console.error(`ZIP file not found at path: ${zipPath}`);
        if (!res.headersSent) {
          res.status(500).send('ZIP file not found after creation');
        }
      }
    });
    
    // Handle errors from archiver
    archive.on('error', err => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).send('Error creating zip file');
      }
    });
    
    // Pipe archive data to the output file
    archive.pipe(output);
    
    // Add converted files to the archive
    let filesAdded = 0;
    
    for (const fileId of fileIds) {
      // Options for where the file might be located
      const possiblePaths = [
        // Option 1: As is (already contains the full path with 'converted-' prefix)
        path.join(UPLOAD_DIR, fileId),
        
        // Option 2: Just the ID portion without 'converted-' prefix
        path.join(UPLOAD_DIR, `converted-${fileId.replace(/^converted-/, '')}`),
        
        // Option 3: Just as a raw ID
        path.join(UPLOAD_DIR, `converted-${fileId}`)
      ];
      
      // Find the first path that exists
      let filePath = null;
      let originalName = null;
      
      for (const possiblePath of possiblePaths) {
        console.log(`Checking if exists: ${possiblePath}`);
        if (fs.existsSync(possiblePath)) {
          filePath = possiblePath;
          
          // Extract filename for the ZIP
          const rawName = path.basename(fileId).replace(/^converted-/, '');
          originalName = req.query[fileId] || req.query[rawName] || `converted-${rawName}`;
          
          console.log(`File found at: ${filePath}, will be named: ${originalName}`);
          break;
        }
      }
      
      if (filePath) {
        console.log(`Adding to ZIP: ${originalName} from ${filePath}`);
        archive.file(filePath, { name: originalName });
        filesAdded++;
      } else {
        console.warn(`File not found for ID: ${fileId}`);
      }
    }
    
    if (filesAdded === 0) {
      console.error('No files were added to the ZIP archive');
      if (!res.headersSent) {
        res.status(400).send('No valid files found to add to ZIP');
        return;
      }
    }
    
    console.log(`Finalizing ZIP with ${filesAdded} files`);
    
    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Error creating zip file:', error);
    if (!res.headersSent) {
      res.status(500).send('Error creating zip file');
    }
  }
});

// Dedicated endpoint for cleaning up files after download
app.post('/cleanup', express.json(), async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'No files specified for cleanup' });
    }
    
    console.log(`Cleaning up ${files.length} files...`);
    
    const deletedFiles = [];
    const failedFiles = [];
    
    // Delete each file with more flexible path handling
    for (const fileId of files) {
      try {
        // Skip any paths that might be ZIP files
        if (fileId.includes('svg-converted-') || fileId.endsWith('.zip')) {
          console.log(`Skipping ZIP file: ${fileId}`);
          continue;
        }
        
        // Generate potential file paths to check and delete
        const potentialPaths = [
          // Original file as-is
          path.join(UPLOAD_DIR, fileId),
          
          // With 'converted-' prefix if not already present
          fileId.startsWith('converted-') 
            ? null 
            : path.join(UPLOAD_DIR, `converted-${fileId}`),
            
          // Without 'converted-' prefix if present
          fileId.startsWith('converted-') 
            ? path.join(UPLOAD_DIR, fileId.substring(10)) 
            : null
        ].filter(Boolean); // Remove null entries
        
        // Try to delete each potential path
        for (const pathToCheck of potentialPaths) {
          try {
            if (await fs.pathExists(pathToCheck)) {
              await fs.unlink(pathToCheck);
              deletedFiles.push(path.basename(pathToCheck));
              console.log(`Deleted file: ${path.basename(pathToCheck)}`);
            }
          } catch (err) {
            console.error(`Error deleting ${pathToCheck}: ${err.message}`);
          }
        }
      } catch (error) {
        console.error(`Error handling cleanup for ${fileId}:`, error);
        failedFiles.push(fileId);
      }
    }
    
    // Also clean up any ZIP files older than 10 minutes
    if (!process.env.VERCEL) { // Skip this cleanup on Vercel as files are already temporary
      try {
        const files = await fs.readdir(UPLOAD_DIR);
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        for (const file of files) {
          if (file.startsWith('svg-converted-') && file.endsWith('.zip')) {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtimeMs < tenMinutesAgo) {
              await fs.unlink(filePath);
              deletedFiles.push(file);
              console.log(`Deleted old ZIP file: ${file}`);
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning up old ZIP files:', error);
      }
    }
    
    res.json({
      message: `Cleanup complete. Deleted ${deletedFiles.length} files.`,
      deleted: deletedFiles,
      failed: failedFiles
    });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    res.status(500).json({ message: 'Error during cleanup process', error: error.message });
  }
});

// Clean up uploads periodically (files older than 1 hour)
// Skip periodic cleanup on Vercel - /tmp is automatically cleaned
if (!process.env.VERCEL) {
  const cleanupUploads = async () => {
    try {
      const files = await fs.readdir(UPLOAD_DIR);
      
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(UPLOAD_DIR, file);
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
}

// Start the server
app.listen(port, () => {
  console.log(`SVG Color Converter server running at http://localhost:${port}`);
  console.log(`Using upload directory: ${UPLOAD_DIR}`);
});