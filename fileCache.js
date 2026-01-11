import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('📁 Created cache directory');
}

/**
 * Save financial data to local file cache
 */
export async function saveToCache(symbol, reportType, data) {
    try {
        const filename = `${reportType}_${symbol.toUpperCase()}.json`;
        const filepath = path.join(CACHE_DIR, filename);

        const dataToSave = {
            symbol: symbol.toUpperCase(),
            reportType,
            fetchedAt: new Date().toISOString(),
            data: data
        };

        fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2), 'utf8');
        const fileSize = fs.statSync(filepath).size;
        console.log(`💾 Saved ${reportType} data for ${symbol} to file (${(fileSize / 1024).toFixed(2)} KB)`);

        return dataToSave;
    } catch (error) {
        console.error(`❌ Error saving ${reportType} to file cache:`, error.message);
        throw error;
    }
}

/**
 * Get financial data from local file cache
 */
export async function getFromCache(symbol, reportType) {
    try {
        const filename = `${reportType}_${symbol.toUpperCase()}.json`;
        const filepath = path.join(CACHE_DIR, filename);

        if (!fs.existsSync(filepath)) {
            console.log(`📭 No cached ${reportType} file found for ${symbol}`);
            return null;
        }

        const stats = fs.statSync(filepath);
        const fileAge = Date.now() - stats.mtimeMs;
        const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 24);
        const expirationTime = expirationHours * 60 * 60 * 1000;

        if (fileAge > expirationTime) {
            const ageInHours = Math.round(fileAge / 3600000);
            console.log(`⏰ Cache expired for ${reportType} ${symbol} (age: ${ageInHours}h)`);
            // Delete expired cache
            fs.unlinkSync(filepath);
            return null;
        }

        const fileContent = fs.readFileSync(filepath, 'utf8');
        const cachedData = JSON.parse(fileContent);

        const ageInHours = Math.round(fileAge / 3600000);
        console.log(`✅ Found ${reportType} data for ${symbol} in file cache (age: ${ageInHours}h)`);

        return cachedData.data;
    } catch (error) {
        console.error(`❌ Error getting ${reportType} from file cache:`, error.message);
        return null;
    }
}

/**
 * Check if cache exists and is valid
 */
export async function isCacheValid(symbol, reportType) {
    try {
        const filename = `${reportType}_${symbol.toUpperCase()}.json`;
        const filepath = path.join(CACHE_DIR, filename);

        if (!fs.existsSync(filepath)) return false;

        const stats = fs.statSync(filepath);
        const fileAge = Date.now() - stats.mtimeMs;
        const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 24);
        const expirationTime = expirationHours * 60 * 60 * 1000;

        return fileAge <= expirationTime;
    } catch (error) {
        console.error(`❌ Error checking cache validity:`, error.message);
        return false;
    }
}

/**
 * Delete cached data for a symbol
 */
export async function deleteCachedData(symbol, reportType = null) {
    try {
        if (reportType) {
            // Delete specific report type
            const filename = `${reportType}_${symbol.toUpperCase()}.json`;
            const filepath = path.join(CACHE_DIR, filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`🗑️ Deleted ${reportType} cache for ${symbol}`);
                return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
        } else {
            // Delete all report types for symbol
            const files = fs.readdirSync(CACHE_DIR);
            const symbolFiles = files.filter(f => f.includes(`_${symbol.toUpperCase()}.json`));

            symbolFiles.forEach(file => {
                fs.unlinkSync(path.join(CACHE_DIR, file));
            });

            console.log(`🗑️ Deleted ${symbolFiles.length} cached files for ${symbol}`);
            return { deletedCount: symbolFiles.length };
        }
    } catch (error) {
        console.error(`❌ Error deleting cached data:`, error.message);
        throw error;
    }
}

/**
 * Get all cached symbols
 */
export async function getCachedSymbols() {
    try {
        const files = fs.readdirSync(CACHE_DIR);
        const symbols = new Set();

        files.forEach(file => {
            if (file.endsWith('.json')) {
                // Extract symbol from filename (format: reportType_SYMBOL.json)
                const parts = file.split('_');
                if (parts.length >= 2) {
                    const symbol = parts[parts.length - 1].replace('.json', '');
                    symbols.add(symbol);
                }
            }
        });

        return Array.from(symbols);
    } catch (error) {
        console.error(`❌ Error getting cached symbols:`, error.message);
        return [];
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
    try {
        const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
        const symbols = await getCachedSymbols();

        return {
            totalEntries: files.length,
            uniqueSymbols: symbols.length,
            symbols: symbols
        };
    } catch (error) {
        console.error(`❌ Error getting cache stats:`, error.message);
        return null;
    }
}

/**
 * Dummy connect function for compatibility
 */
export async function connectDB() {
    console.log('✅ Using local file-based cache');
    return true;
}

