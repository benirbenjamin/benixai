require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const methodOverride = require('method-override');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const recordRoutes = require('./routes/record');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const musicLibraryRoutes = require('./routes/music-library');
const subscriptionRoutes = require('./routes/subscription');
const pagesRoutes = require('./routes/pages'); // Add this line

// Import middleware
const { checkAuth } = require('./middleware/auth');

// Import database config and initialization
const { testConnection } = require('./config/database');
const { initializeDatabase } = require('./utils/initDb');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`Created uploads directory at ${uploadsDir}`);
    } catch (error) {
        console.error(`Failed to create uploads directory: ${error.message}`);
    }
}

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Global middleware to pass user data to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Multer configuration for audio file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        cb(null, `audio-${timestamp}.wav`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept all audio types including blobs
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio files are allowed.'));
        }
    }
});

// Routes
app.use('/', authRoutes);
app.use('/dashboard', checkAuth, dashboardRoutes);
app.use('/record', checkAuth, recordRoutes);
app.use('/admin', checkAuth, adminRoutes);
app.use('/api', apiRoutes);
app.use('/music-library', checkAuth, musicLibraryRoutes);
app.use('/subscription', checkAuth, subscriptionRoutes);
app.use('/', pagesRoutes); // Add this line

// Home route
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('home');
});

// Update audio upload route
app.post('/upload-audio', checkAuth, upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No audio file uploaded or invalid file type'
            });
        }

        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        
        res.status(200).json({ 
            success: true, 
            message: 'Audio uploaded successfully',
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    } catch (error) {
        console.error('Audio upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process audio upload',
            details: error.message
        });
    }
});

// Add error handling middleware specifically for multer errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: 'File upload error',
            details: error.message
        });
    }
    next(error);
});

// 404 Handler
app.use((req, res) => {
    res.status(404).render('404');
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
});

// Test database connection and initialize database before starting server
testConnection().then(async isConnected => {
    if (!isConnected) {
        console.error('Database connection failed! Please check your database configuration.');
        process.exit(1);
    }
    
    try {
        // Initialize database tables if they don't exist
        console.log('Initializing database tables...');
        await initializeDatabase();
        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database tables:', error);
        process.exit(1);
    }
    
    // Start server
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
