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

        // getFinancials handles cache checking automatically
        const data = await getFinancials(upperSymbol);

        if (!data) {
            return res.status(500).json({
                error: 'Failed to fetch financial data. Please check the symbol and try again.'
            });
        }

        // Send data as JSON
        res.setHeader('Content-Type', 'application/json');
        res.json(data);

        console.log(`✅ Successfully sent data for ${upperSymbol}\n`);

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
    console.log(`✨  Cached data (less than 24 hours old) will be served instantly\n`);
});

