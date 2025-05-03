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
  let convertedFiles = [];

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
      await convertSingleFile(file);
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
      await convertMultipleFiles(files);
    } catch (error) {
      alert('Error converting files: ' + error.message);
      console.error('Error:', error);
    }
  });

  // Download all converted files
  downloadAllBtn.addEventListener('click', () => {
    if (convertedFiles.length === 0) {
      alert('No converted files to download');
      return;
    }

    convertedFiles.forEach(file => {
      window.open(`/download/${getFilenameFromPath(file.convertedPath)}`, '_blank');
    });
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
  async function convertSingleFile(file) {
    const formData = new FormData();
    formData.append('svgFile', file);

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
  async function convertMultipleFiles(files) {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      if (file.name.toLowerCase().endsWith('.svg')) {
        formData.append('svgFiles', file);
      }
    });

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
        window.open(`/download/${getFilenameFromPath(filePath)}`, '_blank');
      });
    });
    
    resultsContainer.style.display = 'block';
  }

  // Extract filename from path
  function getFilenameFromPath(path) {
    return path.split('/').pop();
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