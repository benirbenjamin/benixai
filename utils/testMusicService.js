/**
 * Music Service Test Script
 * 
 * This script tests the music service manager and its integrated services.
 * Run it with: node utils/testMusicService.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const musicServiceManager = require('./musicServiceManager');

// Ensure test output directory exists
const testOutputDir = path.join(__dirname, '..', 'public', 'test-outputs');
if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
}

// Test parameters
const testParams = {
    genre: 'electronic',
    tempo: 120,
    mood: 'energetic',
    duration: 10,
    structure: 'verse-chorus'
};

async function runTests() {
    console.log('Starting music service tests...');
    console.log('---------------------------------------');
    
    // Test 1: Test the music service manager's service selection
    console.log('TEST 1: Music service manager selection');
    try {
        const result = await musicServiceManager.generateMusic(testParams);
        console.log('✓ Music generation successful!');
        console.log(`  Service used: ${result.serviceUsed}`);
        console.log(`  Beat path: ${result.beatPath}`);
        console.log(`  Final path: ${result.finalPath}`);
    } catch (error) {
        console.error('✗ Music generation failed:', error.message);
    }
    console.log('---------------------------------------');
    
    // Test 2: Try to use specific services if available
    const services = ['stability', 'tuneFlow', 'openai'];
    
    for (const service of services) {
        console.log(`TEST 2.${services.indexOf(service) + 1}: Testing ${service} service specifically`);
        try {
            const result = await musicServiceManager.generateMusic(testParams, null, service);
            console.log(`✓ ${service} generation successful!`);
            console.log(`  Beat path: ${result.beatPath}`);
        } catch (error) {
            console.error(`✗ ${service} generation failed:`, error.message);
        }
        console.log('---------------------------------------');
    }
    
    // Test 3: Test vocal generation if OpenAI is available
    console.log('TEST 3: Vocal generation test');
    try {
        // Use a sample beat for vocal generation
        const sampleBeatPath = '/assets/sample-beat.mp3';
        
        const vocalsPath = await musicServiceManager.generateVocals(sampleBeatPath, {
            genre: 'electronic',
            mood: 'energetic',
            voiceType: 'nova',
            verses: 1,
            choruses: 1
        });
        
        console.log('✓ Vocal generation successful!');
        console.log(`  Vocals path: ${vocalsPath}`);
    } catch (error) {
        console.error('✗ Vocal generation failed:', error.message);
    }
    
    console.log('All tests completed!');
}

// Run the tests
runTests().catch(console.error);
