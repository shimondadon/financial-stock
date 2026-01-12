import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';
import { getFinancials, getApiLockStatus } from './alphavantage_enhanced.js';
import { connectDB, getFromCache, getCacheStats, CACHE_TYPE } from './cacheManager.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Get all network IP addresses of the server
 */
function getServerIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({
                    name: name,
                    address: iface.address
                });
            }
        }
    }

    return addresses;
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
        const { symbol, useDbOnly = false, forceApiRefresh = false } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        // Validate symbol format
        if (!/^[A-Z]{1,10}$/i.test(symbol)) {
            return res.status(400).json({ error: 'Invalid symbol format' });
        }

        const upperSymbol = symbol.toUpperCase();
        console.log(`\n📊 Processing request for symbol: ${upperSymbol}`);
        console.log(`📂 Use DB Only mode: ${useDbOnly}`);
        console.log(`🔄 Force API Refresh mode: ${forceApiRefresh}`);

        // getFinancials handles cache checking automatically
        // If useDbOnly is true, it will skip API call if cache not found
        // If forceApiRefresh is true, it will always fetch from API and update cache
        const data = await getFinancials(upperSymbol, useDbOnly, forceApiRefresh);

        if (!data) {
            if (useDbOnly) {
                return res.status(404).json({
                    error: `No cached data found for ${upperSymbol}. Please uncheck "Use cached data from DB only" to fetch from API.`
                });
            } else {
                return res.status(500).json({
                    error: 'Failed to fetch financial data. Please check the symbol and try again.'
                });
            }
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

// API endpoint to check API lock status
app.get('/api/status', (req, res) => {
    try {
        const status = getApiLockStatus();
        res.json({
            success: true,
            api: {
                isLocked: status.isLocked,
                currentSymbol: status.currentSymbol,
                queueLength: status.queueLength,
                queuedSymbols: status.queuedSymbols,
                cooldownRemaining: Math.ceil(status.cooldownRemaining / 1000), // seconds
                available: !status.isLocked && status.cooldownRemaining === 0
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting API status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get API status'
        });
    }
});

// Start server
app.listen(PORT, async () => {
    console.log('\n🚀 Alpha Vantage Financial Data Server');
    console.log('=====================================');

    // Display server URLs
    console.log(`🌐 Server Access URLs:`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Local:    http://127.0.0.1:${PORT}`);

    // Get and display network IPs
    const serverIPs = getServerIPs();
    if (serverIPs.length > 0) {
        serverIPs.forEach(iface => {
            console.log(`   Network:  http://${iface.address}:${PORT} (${iface.name})`);
        });
    } else {
        console.log(`   Network:  No external network interfaces found`);
    }

    console.log(`\n💾 Cache Type: ${CACHE_TYPE === 'mongodb' ? 'MongoDB Cloud' : 'Local Files'}`);

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
    console.log(`✨  Cached data (less than 1 mount old) will be served instantly\n`);
});

