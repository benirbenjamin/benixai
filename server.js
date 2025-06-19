/**
 * Development Server
 * Serves the application and provides a mock AI service
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const MockAiService = require('./services/mockAiService');

// Configuration
const PORT = process.env.PORT || 8080;
const MOCK_AI_PORT = 3000;

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

// Start the mock AI service
const mockAiService = new MockAiService({
  port: MOCK_AI_PORT,
  delay: 2000
});
mockAiService.start();

// Create the web server
const server = http.createServer((req, res) => {
  // Parse the URL
  const parsedUrl = url.parse(req.url);
  
  // Extract the pathname and normalize it
  // (e.g., '/path/to/file' -> 'path/to/file')
  let pathname = path.normalize(parsedUrl.pathname);
  
  // If the pathname is '/', serve 'index.html'
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Create the file path
  const filePath = path.join(__dirname, pathname);
  
  // Get the file extension
  const extname = path.extname(filePath);
  
  // Set the content type based on the file extension
  const contentType = MIME_TYPES[extname] || 'text/plain';
  
  // Read the file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If the file is not found
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, '404.html'), (err, data) => {
          if (err) {
            // If 404.html is not found, send a simple error message
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            // Send the 404.html file
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(data);
          }
        });
      } else {
        // For other errors, send a 500 error
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // If the file is found, serve it with the appropriate content type
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Mock AI service running at http://localhost:${MOCK_AI_PORT}/`);
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  mockAiService.stop();
  server.close(() => {
    console.log('Server shut down.');
    process.exit(0);
  });
});
