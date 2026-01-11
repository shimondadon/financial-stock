import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getFinancials } from './alphavantage_enhanced.js';
import { connectDB, getFromCache, getCacheStats, CACHE_TYPE } from './cacheManager.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;


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

// API endpoint to download individual cache files
app.get('/api/cache/:symbol/:reportType', async (req, res) => {
    try {
        const { symbol, reportType } = req.params;
        const upperSymbol = symbol.toUpperCase();

        // Get data from cache (MongoDB or file)
        const data = await getFromCache(upperSymbol, reportType);

        if (!data) {
            return res.status(404).json({
                error: `Cache data not found for ${reportType} report of ${upperSymbol}`,
                cacheType: CACHE_TYPE
            });
        }

        // Send as downloadable JSON
        const filename = `${reportType}_${upperSymbol}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(data);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log('\n🚀 Alpha Vantage Financial Data Server');
    console.log('=====================================');
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📁 Open your browser and navigate to the URL above`);
    console.log(`💾 Cache Type: ${CACHE_TYPE === 'mongodb' ? 'MongoDB Cloud' : 'Local Files'}`);

    // Connect to cache (MongoDB or file system)
    try {
        await connectDB();

        // Get and display cache stats
        const stats = await getCacheStats();
        if (stats) {
            console.log(`\n📊 Cache Statistics:`);
            console.log(`   Total entries: ${stats.totalEntries}`);
            console.log(`   Unique symbols: ${stats.uniqueSymbols}`);
            if (stats.symbols.length > 0) {
                console.log(`   Cached symbols: ${stats.symbols.join(', ')}`);
            }
        }
    } catch (error) {
        if (CACHE_TYPE === 'mongodb') {
            console.error('\n⚠️  Warning: MongoDB connection failed');
            console.error('   Server will run but caching will not work');
            console.error('   Please check your .env file and MongoDB connection string');
            console.error('   Or change CACHE_TYPE to "file" in .env to use local file cache');
        } else {
            console.error('\n⚠️  Warning: Cache initialization failed:', error.message);
        }
    }

    console.log(`\n⚠️  Note: Free API key allows 5 requests per minute`);
    console.log(`    Each request takes ~60-90 seconds due to API rate limits`);
    console.log(`✨  Cached data (less than 24 hours old) will be served instantly\n`);
});

