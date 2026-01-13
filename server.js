import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';
import XLSX from 'xlsx';
import { getFinancials, getApiLockStatus, getApiKeySetStatus } from './alphavantage_enhanced.js';
import { connectDB, getFromCache, getCacheStats, CACHE_TYPE } from './cacheManager.js';
import FinancialData from './models/FinancialData.js';

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

// API endpoint to export all database data to Excel
app.get('/api/export/excel', async (req, res) => {
    try {
        console.log('📊 Starting Excel export of all database data...');

        // Check if using MongoDB (file cache doesn't support this feature)
        if (CACHE_TYPE !== 'mongodb') {
            return res.status(400).json({
                success: false,
                error: 'Excel export is only available when using MongoDB cache',
                cacheType: CACHE_TYPE,
                hint: 'Set CACHE_TYPE=mongodb in .env file'
            });
        }

        // Get all financial data from MongoDB
        const allData = await FinancialData.find({}).sort({ symbol: 1, reportType: 1 }).lean();

        if (!allData || allData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No data found in database',
                totalEntries: 0
            });
        }

        console.log(`📋 Found ${allData.length} entries in database`);

        // Create a new workbook
        const workbook = XLSX.utils.book_new();

        // Group data by symbol
        const dataBySymbol = {};
        allData.forEach(entry => {
            if (!dataBySymbol[entry.symbol]) {
                dataBySymbol[entry.symbol] = {};
            }
            dataBySymbol[entry.symbol][entry.reportType] = entry.data;
        });

        console.log(`📊 Processing ${Object.keys(dataBySymbol).length} unique symbols...`);

        // Create consolidated data rows (one row per symbol)
        const consolidatedRows = [];

        Object.keys(dataBySymbol).sort().forEach(symbol => {
            const symbolData = dataBySymbol[symbol];
            console.log(`  📝 Processing symbol: ${symbol}...`);

            // Extract data from different report types
            const incomeData = symbolData.income || {};
            const balanceData = symbolData.balance || {};
            const cashflowData = symbolData.cashflow || {};
            const earningsData = symbolData.earnings || {};
            const overviewData = symbolData.overview || {};

            // Get the most recent annual report data
            const latestIncome = getLatestAnnualReport(incomeData);
            const latestBalance = getLatestAnnualReport(balanceData);
            const latestCashflow = getLatestAnnualReport(cashflowData);

            // Build row with all metrics
            const row = {
                // Symbol
                'Symbol': symbol,
                'Year': latestIncome?.fiscalDateEnding?.substring(0, 4) || '',

                // Income Statement
                'Total_Revenue': parseFloat(latestIncome?.totalRevenue) || 0,
                'Gross_Profit': parseFloat(latestIncome?.grossProfit) || 0,
                'Operating_Income': parseFloat(latestIncome?.operatingIncome) || 0,
                'Net_Income': parseFloat(latestIncome?.netIncome) || 0,
                'EBITDA': parseFloat(latestIncome?.ebitda) || 0,
                'EPS': parseFloat(earningsData?.annualEarnings?.[0]?.reportedEPS) || 0,

                // Balance Sheet
                'Total_Assets': parseFloat(latestBalance?.totalAssets) || 0,
                'Current_Assets': parseFloat(latestBalance?.totalCurrentAssets) || 0,
                'Total_Liabilities': parseFloat(latestBalance?.totalLiabilities) || 0,
                'Current_Liabilities': parseFloat(latestBalance?.totalCurrentLiabilities) || 0,
                'Long_Term_Debt': parseFloat(latestBalance?.longTermDebt) || 0,
                'Shareholder_Equity': parseFloat(latestBalance?.totalShareholderEquity) || 0,

                // Cash Flow
                'Cash_Equivalents': parseFloat(latestBalance?.cashAndCashEquivalentsAtCarryingValue) || 0,
                'Operating_Cash_Flow': parseFloat(latestCashflow?.operatingCashflow) || 0,
                'Capital_Expenditures': parseFloat(latestCashflow?.capitalExpenditures) || 0,
                'Free_Cash_Flow': (parseFloat(latestCashflow?.operatingCashflow) || 0) - Math.abs(parseFloat(latestCashflow?.capitalExpenditures) || 0),
                'Investing_Cash_Flow': parseFloat(latestCashflow?.cashflowFromInvestment) || 0,
                'Financing_Cash_Flow': parseFloat(latestCashflow?.cashflowFromFinancing) || 0,

                // Calculated Metrics
                'Gross_Profit_Margin': calculateMetric(latestIncome?.grossProfit, latestIncome?.totalRevenue),
                'Operating_Margin': calculateMetric(latestIncome?.operatingIncome, latestIncome?.totalRevenue),
                'Net_Profit_Margin': calculateMetric(latestIncome?.netIncome, latestIncome?.totalRevenue),
                'ROA': calculateMetric(latestIncome?.netIncome, latestBalance?.totalAssets),
                'ROE': calculateMetric(latestIncome?.netIncome, latestBalance?.totalShareholderEquity),
                'EBITDA_Margin': calculateMetric(latestIncome?.ebitda, latestIncome?.totalRevenue),
                'Current_Ratio': calculateMetric(latestBalance?.totalCurrentAssets, latestBalance?.totalCurrentLiabilities),
                'Quick_Ratio': calculateQuickRatio(latestBalance),
                'Debt_to_Equity': calculateMetric(latestBalance?.longTermDebt, latestBalance?.totalShareholderEquity),
                'Debt_to_Assets': calculateMetric(latestBalance?.totalLiabilities, latestBalance?.totalAssets),
                'Asset_Turnover': calculateMetric(latestIncome?.totalRevenue, latestBalance?.totalAssets),

                // Growth Metrics (YoY)
                'Revenue_Growth_YoY': calculateGrowth(incomeData, 'totalRevenue'),
                'Net_Income_Growth_YoY': calculateGrowth(incomeData, 'netIncome'),
                'EPS_Growth_YoY': calculateEPSGrowth(earningsData),

                // Company Info
                'Company_Name': overviewData?.Name || '',
                'Sector': overviewData?.Sector || '',
                'Industry': overviewData?.Industry || '',
                'Market_Cap': parseFloat(overviewData?.MarketCapitalization) || 0,
                'PE_Ratio': parseFloat(overviewData?.PERatio) || 0,
                'Dividend_Yield': parseFloat(overviewData?.DividendYield) || 0
            };

            consolidatedRows.push(row);
            console.log(`  ✓ Processed: ${symbol}`);
        });

        // Create the consolidated sheet
        const consolidatedSheet = XLSX.utils.json_to_sheet(consolidatedRows);

        // Insert grouped headers at the top
        XLSX.utils.sheet_add_aoa(consolidatedSheet, [[
            '', '', // Empty for Symbol, Year columns
            'Income Statement', '', '', '', '', '', // Spans 6 columns (C-H)
            'Balance Sheet', '', '', '', '', '', // Spans 6 columns (I-N)
            'Cash Flow', '', '', '', '', '', // Spans 6 columns (O-T)
            'Metrics', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // Spans 15 columns (U-AI)
            'Company Info', '', '', '', '', '' // Spans 6 columns (AJ-AO)
        ]], { origin: 'A1' });

        // Define merge ranges for grouped headers
        const merges = [
            // Income Statement: C1:H1
            { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },
            // Balance Sheet: I1:N1
            { s: { r: 0, c: 8 }, e: { r: 0, c: 13 } },
            // Cash Flow: O1:T1
            { s: { r: 0, c: 14 }, e: { r: 0, c: 19 } },
            // Metrics: U1:AI1
            { s: { r: 0, c: 20 }, e: { r: 0, c: 34 } },
            // Company Info: AJ1:AO1
            { s: { r: 0, c: 35 }, e: { r: 0, c: 40 } }
        ];

        consolidatedSheet['!merges'] = merges;

        // Set column widths
        const colWidths = [];
        for (let i = 0; i < 41; i++) {
            colWidths.push({ wch: 18 }); // Width for all columns
        }
        consolidatedSheet['!cols'] = colWidths;

        // Fix number formatting - prevent scientific notation
        const range = XLSX.utils.decode_range(consolidatedSheet['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!consolidatedSheet[cellAddress]) continue;

                const cell = consolidatedSheet[cellAddress];
                // Large numbers (revenue, assets, etc.) - show as integers
                if (typeof cell.v === 'number' && cell.v > 1000000) {
                    cell.z = '#,##0'; // Format with commas, no decimals
                    cell.t = 'n';
                }
                // Small numbers (ratios) - show with 4 decimal places
                else if (typeof cell.v === 'number' && cell.v < 100 && cell.v > -100 && R > 1) {
                    cell.z = '0.0000';
                    cell.t = 'n';
                }
            }
        }

        XLSX.utils.book_append_sheet(workbook, consolidatedSheet, 'Financial_Data');

        // Generate Excel file buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers for file download
        const filename = `financial_data_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Length', excelBuffer.length);

        // Send the file
        res.send(excelBuffer);

        console.log(`✅ Successfully exported ${allData.length} entries to Excel file: ${filename}\n`);

    } catch (error) {
        console.error('❌ Excel export error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export data to Excel'
        });
    }
});

// Helper functions for Excel export

// Get latest annual report from financial data
function getLatestAnnualReport(data) {
    if (!data) return null;

    // Check if data has annualReports array
    if (data.annualReports && Array.isArray(data.annualReports) && data.annualReports.length > 0) {
        return data.annualReports[0]; // Most recent is first
    }

    return null;
}

// Calculate a metric (division with safety)
function calculateMetric(numerator, denominator) {
    const num = parseFloat(numerator) || 0;
    const den = parseFloat(denominator) || 0;

    if (den === 0) return 0;
    return num / den;
}

// Calculate quick ratio
function calculateQuickRatio(balanceData) {
    if (!balanceData) return 0;

    const currentAssets = parseFloat(balanceData.totalCurrentAssets) || 0;
    const inventory = parseFloat(balanceData.inventory) || 0;
    const currentLiabilities = parseFloat(balanceData.totalCurrentLiabilities) || 0;

    if (currentLiabilities === 0) return 0;
    return (currentAssets - inventory) / currentLiabilities;
}

// Calculate year-over-year growth
function calculateGrowth(data, field) {
    if (!data || !data.annualReports || data.annualReports.length < 2) {
        return 0;
    }

    const current = parseFloat(data.annualReports[0]?.[field]) || 0;
    const previous = parseFloat(data.annualReports[1]?.[field]) || 0;

    if (previous === 0) return 0;
    return (current - previous) / previous;
}

// Calculate EPS growth
function calculateEPSGrowth(earningsData) {
    if (!earningsData || !earningsData.annualEarnings || earningsData.annualEarnings.length < 2) {
        return 0;
    }

    const current = parseFloat(earningsData.annualEarnings[0]?.reportedEPS) || 0;
    const previous = parseFloat(earningsData.annualEarnings[1]?.reportedEPS) || 0;

    if (previous === 0) return 0;
    return (current - previous) / previous;
}

// API endpoint to check API lock status
app.get('/api/status', (req, res) => {
    try {
        const status = getApiLockStatus();
        const keySetStatus = getApiKeySetStatus();

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
            apiKeys: {
                currentSet: keySetStatus.currentSet,
                setAKeys: keySetStatus.setAKeys,
                setBKeys: keySetStatus.setBKeys,
                switchCount: keySetStatus.switchCount,
                totalKeys: keySetStatus.totalKeysAvailable
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

