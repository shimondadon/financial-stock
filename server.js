import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getFinancials } from './alphavantage_enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_DIR = path.join(__dirname, 'cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('📁 Created cache directory');
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * Check if cached file exists for symbol from today
 */
function getCachedFileForToday(symbol) {
    const todayDate = getTodayDate();
    const files = fs.readdirSync(CACHE_DIR);

    // Look for files matching pattern: financial_enhanced_SYMBOL_YYYY-MM-DD*.json
    const pattern = `financial_enhanced_${symbol}_${todayDate}`;
    const matchingFile = files.find(file => file.startsWith(pattern) && file.endsWith('.json'));

    if (matchingFile) {
        return path.join(CACHE_DIR, matchingFile);
    }

    return null;
}

/**
 * Save data to cache
 */
function saveToCache(symbol, data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `financial_enhanced_${symbol}_${timestamp}.json`;
    const filepath = path.join(CACHE_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Cached data to: ${filename}`);

    return { filename, filepath };
}

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to fetch financial data
app.post('/api/financials', async (req, res) => {
    try {
        const { symbol } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        // Validate symbol format
        if (!/^[A-Z]{1,10}$/i.test(symbol)) {
            return res.status(400).json({ error: 'Invalid symbol format' });
        }

        const upperSymbol = symbol.toUpperCase();
        console.log(`\n📊 Processing request for symbol: ${upperSymbol}`);

        // Check if cached file exists from today
        const cachedFilePath = getCachedFileForToday(upperSymbol);

        if (cachedFilePath) {
            console.log(`✨ Found cached data from today, serving cached file`);

            const cachedData = JSON.parse(fs.readFileSync(cachedFilePath, 'utf8'));
            const filename = path.basename(cachedFilePath);

            // Send cached file as download
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(JSON.stringify(cachedData, null, 2));

            console.log(`✅ Successfully sent cached file: ${filename}\n`);
            return;
        }

        // No cache found, fetch fresh data from API
        console.log(`🔄 No cached data found, fetching from API...`);
        const data = await getFinancials(upperSymbol);

        if (!data) {
            return res.status(500).json({
                error: 'Failed to fetch financial data. Please check the symbol and try again.'
            });
        }

        // Save to cache
        const { filename } = saveToCache(upperSymbol, data);

        // Send file as download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(data, null, 2));

        console.log(`✅ Successfully sent ${filename} to client\n`);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 Alpha Vantage Financial Data Server');
    console.log('=====================================');
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📁 Open your browser and navigate to the URL above`);
    console.log(`💾 Cache directory: ${CACHE_DIR}`);
    console.log(`\n⚠️  Note: Free API key allows 5 requests per minute`);
    console.log(`    Each request takes ~60-90 seconds due to API rate limits`);
    console.log(`✨  Cached data from today will be served instantly\n`);
});

