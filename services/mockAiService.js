/**
 * Mock AI Service
 * Simulates an AI song generation service for development and testing
 */

class MockAiService {
  constructor(options = {}) {
    this.options = {
      port: 3000,
      delay: 2000, // Simulate processing time
      failureRate: 0.1, // 10% failure rate to test error handling
      ...options
    };
    
    this.server = null;
    this.routes = {
      '/generate-song': this.handleGenerateSong.bind(this),
      '/generate-song/status': this.handleStatus.bind(this)
    };
  }
  
  start() {
    if (typeof window !== 'undefined') {
      console.log('Mock server can only be started in Node.js environment');
      return false;
    }
    
    try {
      const http = require('http');
      const url = require('url');
      
      this.server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;
        
        // Route the request
        const routeHandler = this.routes[path];
        if (routeHandler) {
          routeHandler(req, res);
        } else {
          // Not found
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });
      
      this.server.listen(this.options.port, () => {
        console.log(`Mock AI service running at http://localhost:${this.options.port}/`);
      });
      
      return true;
    } catch (err) {
      console.error('Failed to start mock server:', err);
      return false;
    }
  }
  
  stop() {
    if (this.server) {
      this.server.close();
      console.log('Mock AI service stopped');
    }
  }
  
  handleGenerateSong(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    
    // Simulate random failures
    if (Math.random() < this.options.failureRate) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'AI processing failed' }));
      return;
    }
    
    // Simulate processing delay
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // Generate a mock response with a data URI audio
      const mockSongUrl = this._generateMockAudioDataUri();
      res.end(JSON.stringify({ 
        songUrl: mockSongUrl,
        metadata: {
          duration: Math.floor(Math.random() * 180) + 30, // 30-210 seconds
          format: 'mp3',
          created: new Date().toISOString()
        }
      }));
    }, this.options.delay);
  }
  
  handleStatus(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'online',
      version: '1.0.0',
      uptime: process.uptime()
    }));
  }
  
  _generateMockAudioDataUri() {
    // In a real implementation, this would create or return a real audio file
    // For now, we'll return a placeholder URL
    return `https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3?${Date.now()}`;
  }
}

// Only export in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockAiService;
}
