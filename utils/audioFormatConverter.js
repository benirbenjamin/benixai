/**
 * Audio Format Converter
 * This utility works with audio data without requiring FFmpeg
 * Using pure JavaScript solutions for production hosting
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { WaveFile } = require('wavefile');

/**
 * Ensure audio file is a valid WAV file
 * @param {string} inputPath - Path to input audio file
 * @returns {Promise<string>} - Path to valid WAV file
 */
function ensureValidWavFile(inputPath) {
    return new Promise((resolve, reject) => {
        try {
            // Create unique output filename
            const fileName = path.basename(inputPath, path.extname(inputPath));
            const outputPath = path.join(
                path.dirname(inputPath),
                `${fileName}_fixed.wav`
            );
            
            // Read the file
            const fileBuffer = fs.readFileSync(inputPath);
            
            // Check if it's already a WAV file
            if (path.extname(inputPath).toLowerCase() === '.wav') {
                try {
                    // Try to parse it as a WAV file to ensure it's valid
                    const wav = new WaveFile(fileBuffer);
                    
                    // If it's valid, just copy it
                    fs.writeFileSync(outputPath, fileBuffer);
                    console.log('Valid WAV file detected, copied to new location');
                    return resolve(outputPath);
                } catch (wavError) {
                    console.log('Invalid WAV file detected, will try to fix');
                    // Continue with fixing process below
                }
            }
            
            // At this point, either it's not a WAV file or it's invalid
            // Create a new WAV file from scratch with standard parameters
            const newWav = new WaveFile();
            
            // Create a new WAV file with standard parameters (44.1kHz, 16-bit, stereo)
            newWav.fromScratch(2, 44100, '16', fileBuffer);
            
            // Export the WAV file
            fs.writeFileSync(outputPath, Buffer.from(newWav.toBuffer()));
            
            console.log(`Audio file fixed and saved as WAV`);
            resolve(outputPath);
        } catch (err) {
            console.error('Audio conversion error:', err);
            reject(err);
        }
    });
}

/**
 * Fix audio file format issues and convert to a playable format
 * @param {string} inputPath - Path to input audio file
 * @returns {Promise<string>} - Path to fixed audio file
 */
async function fixAudioFile(inputPath) {
    try {
        // Always ensure it's a valid WAV for maximum compatibility
        const outputPath = await ensureValidWavFile(inputPath);
        return outputPath;
    } catch (error) {
        console.error('Error fixing audio file:', error);
        throw error;
    }
}

/**
 * Process base64 audio data and save to a file
 * @param {string} base64Data - Base64 encoded audio data
 * @param {string} outputFormat - Output format extension
 * @param {string} [outputDir] - Output directory
 * @returns {Promise<{path: string, buffer: Buffer}>} - Path to saved file and buffer
 */
async function processBase64Audio(base64Data, outputFormat, outputDir = 'uploads') {
    return new Promise((resolve, reject) => {
        try {
            // Ensure directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // Extract base64 data if it includes the data URL prefix
            let rawData = base64Data;
            if (base64Data.includes('base64,')) {
                rawData = base64Data.split('base64,')[1];
            }
            
            // Convert to buffer
            const buffer = Buffer.from(rawData, 'base64');
            
            // Generate filename
            const fileName = `${uuidv4()}.${outputFormat}`;
            const outputPath = path.join(outputDir, fileName);
            
            // Write to file
            fs.writeFileSync(outputPath, buffer);
            
            resolve({ path: outputPath, buffer });
        } catch (error) {
            console.error('Error processing base64 audio:', error);
            reject(error);
        }
    });
}

/**
 * Create a proper WAV file from raw PCM audio data
 * @param {Buffer} audioData - Raw audio data
 * @param {Object} options - Audio options
 * @param {number} options.sampleRate - Sample rate in Hz (e.g., 44100)
 * @param {number} options.channels - Number of channels (1=mono, 2=stereo)
 * @param {string} options.bitDepth - Bit depth ('8', '16', '24', '32', 'float')
 * @returns {Buffer} - WAV file buffer
 */
function createWavFromPCM(audioData, options = {}) {
    const { sampleRate = 44100, channels = 2, bitDepth = '16' } = options;
    
    // Create a new WAV file
    const wav = new WaveFile();
    
    // Set the WAV file parameters
    wav.fromScratch(channels, sampleRate, bitDepth, audioData);
    
    // Return the WAV file as a Buffer
    return Buffer.from(wav.toBuffer());
}

module.exports = {
    ensureValidWavFile,
    fixAudioFile,
    processBase64Audio,
    createWavFromPCM
};
