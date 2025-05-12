/**
 * SVG Color Converter - Frontend Scripts
 */
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const singleForm = document.getElementById('single-form');
  const multipleForm = document.getElementById('multiple-form');
  const singleDropzone = document.getElementById('single-dropzone');
  const multipleDropzone = document.getElementById('multiple-dropzone');
  const singleFileInput = document.getElementById('single-file-input');
  const multipleFileInput = document.getElementById('multiple-file-input');
  const singleBrowseBtn = document.getElementById('single-browse');
  const multipleBrowseBtn = document.getElementById('multiple-browse');
  const singleSelectedFile = document.getElementById('single-selected-file');
  const multipleSelectedFiles = document.getElementById('multiple-selected-files');
  const resultsContainer = document.getElementById('results-container');
  const resultsList = document.getElementById('results-list');
  const downloadAllBtn = document.getElementById('download-all');

  // Global variables
  window.convertedFiles = [];

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all tabs
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
      
      // Clear results
      resultsContainer.style.display = 'none';
      resultsList.innerHTML = '';
      convertedFiles = [];
    });
  });

  // File selection via browse buttons
  singleBrowseBtn.addEventListener('click', () => {
    singleFileInput.click();
  });

  multipleBrowseBtn.addEventListener('click', () => {
    multipleFileInput.click();
  });

  // Single file selection
  singleFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      displaySelectedFile(file);
    }
  });

  // Multiple files selection
  multipleFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 100) {
      alert('You can upload a maximum of 100 SVG files at once.');
      multipleFileInput.value = '';
      multipleSelectedFiles.innerHTML = '';
      return;
    }
    const files = e.target.files;
    if (files.length > 0) {
      displaySelectedFiles(files);
    }
  });

  // Drag and drop for single file
  setupDropzone(singleDropzone, singleFileInput, true);

  // Drag and drop for multiple files
  setupDropzone(multipleDropzone, multipleFileInput, false);

  // Single file form submission
  singleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!singleFileInput.files.length) {
      alert('Please select an SVG file to convert');
      return;
    }
    try {
      const file = singleFileInput.files[0];
      const crop = document.getElementById('single-crop-checkbox').checked;
      await convertSingleFile(file, crop);
    } catch (error) {
      alert('Error converting file: ' + error.message);
      console.error('Error:', error);
    }
  });

  // Multiple files form submission
  multipleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!multipleFileInput.files.length) {
      alert('Please select at least one SVG file to convert');
      return;
    }
    try {
      const files = multipleFileInput.files;
      const crop = document.getElementById('multiple-crop-checkbox').checked;
      await convertMultipleFiles(files, crop);
    } catch (error) {
      alert('Error converting files: ' + error.message);
      console.error('Error:', error);
    }
  });

  // Download all converted files as a ZIP
  downloadAllBtn.addEventListener('click', async () => {
    if (convertedFiles.length === 0) {
      alert('No converted files to download');
      return;
    }

    // Show loading state
    downloadAllBtn.disabled = true;
    downloadAllBtn.innerHTML = '<span class="loading"></span> Creating ZIP...';

    try {
      // Track both original and converted file IDs for cleanup
      const rawFileIds = [];
      const fileIds = [];
      
      // Get file IDs for the ZIP and cleanup
      convertedFiles.forEach(file => {
        const filePath = file.convertedPath;
        const fileName = getFilenameFromPath(filePath);
        
        // Store the actual filename (with converted- prefix)
        fileIds.push(fileName);
        
        // Also store the original filename (without converted- prefix)
        if (fileName.startsWith('converted-')) {
          rawFileIds.push(fileName.substring(10)); // Remove 'converted-' prefix
        }
      });
      
      // Create query parameters with file IDs
      let params = new URLSearchParams();
      params.append('files', fileIds.join(','));
      
      // Add original filenames as parameters for better naming in the ZIP
      convertedFiles.forEach(file => {
        const fileId = getFilenameFromPath(file.convertedPath);
        params.append(fileId, file.originalName);
      });
      
      console.log('File IDs for ZIP:', fileIds);
      
      // Create the ZIP download URL
      const downloadUrl = `/download-zip?${params.toString()}`;
      console.log('Download URL:', downloadUrl);
      
      // Use fetch to initiate download
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Convert the response to a blob
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link to download the blob
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted-svgs.zip';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      // Wait a bit to ensure download starts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Combine both raw and converted IDs for complete cleanup
      const allFileIds = [...rawFileIds, ...fileIds];
      console.log('All file IDs for cleanup:', allFileIds);
      
      // Trigger cleanup endpoint with all file IDs
      const cleanupResponse = await fetch('/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: allFileIds })
      });
      
      const cleanupResult = await cleanupResponse.json();
      console.log('Cleanup result:', cleanupResult);
      
      // Clear results after download
      convertedFiles = [];
      resultsContainer.style.display = 'none';
      resultsList.innerHTML = '';
    } catch (error) {
      console.error('Download error:', error);
      alert(`Error downloading files: ${error.message}`);
    } finally {
      // Reset button state
      downloadAllBtn.disabled = false;
      downloadAllBtn.textContent = 'Download All as ZIP';
    }
  });

  // Helper function to set up dropzones
  function setupDropzone(dropzone, fileInput, isSingle) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight dropzone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => {
        dropzone.classList.add('highlight');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => {
        dropzone.classList.remove('highlight');
      }, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (isSingle) {
        if (files.length > 0) {
          fileInput.files = dt.files;
          displaySelectedFile(files[0]);
        }
      } else {
        if (files.length > 0) {
          fileInput.files = dt.files;
          displaySelectedFiles(files);
        }
      }
    }, false);
  }

  // Helper function to prevent default events
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Display selected single file
  function displaySelectedFile(file) {
    if (!file.name.toLowerCase().endsWith('.svg')) {
      alert('Please select an SVG file');
      return;
    }
    
    singleSelectedFile.innerHTML = `
      <div class="file-item">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M12 18v-6"></path>
          <path d="M8 15h8"></path>
        </svg>
        <span class="file-name">${file.name}</span>
        <button type="button" class="file-remove">&times;</button>
      </div>
    `;

    // Remove file button
    singleSelectedFile.querySelector('.file-remove').addEventListener('click', () => {
      singleFileInput.value = '';
      singleSelectedFile.innerHTML = '';
    });
  }

  // Display selected multiple files
  function displaySelectedFiles(files) {
    multipleSelectedFiles.innerHTML = '';
    let validFiles = false;
    
    Array.from(files).forEach(file => {
      if (file.name.toLowerCase().endsWith('.svg')) {
        validFiles = true;
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M12 18v-6"></path>
            <path d="M8 15h8"></path>
          </svg>
          <span class="file-name">${file.name}</span>
        `;
        multipleSelectedFiles.appendChild(fileItem);
      }
    });

    if (!validFiles) {
      alert('Please select at least one SVG file');
      multipleFileInput.value = '';
      multipleSelectedFiles.innerHTML = '';
    } else {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'convert-btn';
      clearBtn.style.marginTop = '10px';
      clearBtn.style.backgroundColor = '#ef4444';
      clearBtn.textContent = 'Clear All Files';
      clearBtn.addEventListener('click', () => {
        multipleFileInput.value = '';
        multipleSelectedFiles.innerHTML = '';
      });
      
      multipleSelectedFiles.appendChild(clearBtn);
    }
  }

  // Convert a single SVG file
  async function convertSingleFile(file, crop) {
    const formData = new FormData();
    formData.append('svgFile', file);
    if (crop) formData.append('crop', '1');

    showLoading();

    try {
      const response = await fetch('/convert/single', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Server error: ' + response.statusText);
      }

      const data = await response.json();
      convertedFiles = [data];
      displayResults([data]);
    } catch (error) {
      throw error;
    } finally {
      hideLoading();
    }
  }

  // Convert multiple SVG files
  async function convertMultipleFiles(files, crop) {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      if (file.name.toLowerCase().endsWith('.svg')) {
        formData.append('svgFiles', file);
      }
    });
    if (crop) formData.append('crop', '1');

    showLoading();

    try {
      const response = await fetch('/convert/multiple', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Server error: ' + response.statusText);
      }

      const data = await response.json();
      convertedFiles = data.results;
      displayResults(data.results);
    } catch (error) {
      throw error;
    } finally {
      hideLoading();
    }
  }

  // Extract filename from path
  function getFilenameFromPath(path) {
    // Handle both slash and backslash paths and get the last part
    return path.split(/[/\\]/).pop();
  }

  // Download a file safely
  function downloadFile(filepath, originalName) {
    const filename = getFilenameFromPath(filepath);
    const downloadUrl = `/download/${filename}`;
    
    console.log(`Attempting to download file: ${filename} from ${downloadUrl}`);
    
    // For Vercel, check if we have a data URL for this file
    const fileData = convertedFiles.find(f => f.convertedPath === filepath);
    if (fileData && fileData.svgDataUrl) {
      console.log('Using data URL for direct download');
      // Create object URL for the data
      const link = document.createElement('a');
      link.href = fileData.svgDataUrl;
      link.download = originalName.replace('.svg', '-converted.svg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    // Fall back to traditional download if no data URL
    fetch(downloadUrl)
      .then(response => {
        if (response.ok) {
          return response.blob();
        } else {
          throw new Error('File download failed');
        }
      })
      .then(blob => {
        // Create object URL for the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = originalName.replace('.svg', '-converted.svg');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Error downloading file:', error);
        alert('Could not download the file. It may have been removed or expired.');
      });
  }

  // Display the conversion results
  function displayResults(results) {
    resultsList.innerHTML = '';
    
    results.forEach(result => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      
      resultItem.innerHTML = `
        <span class="result-name">${result.originalName}</span>
        <div class="result-actions">
          <button class="download-btn" data-path="${result.convertedPath}">Download</button>
        </div>
      `;
      
      resultsList.appendChild(resultItem);
    });
    
    // Add event listeners to download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filePath = btn.getAttribute('data-path');
        const originalName = btn.closest('.result-item').querySelector('.result-name').textContent;
        downloadFile(filePath, originalName);
      });
    });
    
    resultsContainer.style.display = 'block';
  }

  // Show loading indicator
  function showLoading() {
    const convertBtns = document.querySelectorAll('.convert-btn');
    convertBtns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading"></span> Converting...';
    });
  }

  // Hide loading indicator
  function hideLoading() {
    const convertBtns = document.querySelectorAll('.convert-btn');
    convertBtns.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Convert SVG';
    });
  }
});