import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CACHE_TYPE = process.env.CACHE_TYPE || 'file';

console.log('\n🔧 Cache Manager Initialization');
console.log('================================');
console.log(`📌 CACHE_TYPE from .env: "${CACHE_TYPE}"`);
console.log(`📌 Will load: ${CACHE_TYPE === 'mongodb' ? 'mongoCache.js' : 'fileCache.js'}`);

let cacheModule;

// Dynamically import the correct cache module based on CACHE_TYPE
if (CACHE_TYPE === 'mongodb') {
    console.log('📊 Loading MongoDB cache module...');
    cacheModule = await import('./mongoCache.js');
    console.log('✅ MongoDB cache module loaded');
} else {
    console.log('📁 Loading File cache module...');
    cacheModule = await import('./fileCache.js');
    console.log('✅ File cache module loaded');
}

console.log('================================\n');

// Export all cache functions
export const connectDB = cacheModule.connectDB;
export const saveToCache = cacheModule.saveToCache;
export const getFromCache = cacheModule.getFromCache;
export const isCacheValid = cacheModule.isCacheValid;
export const deleteCachedData = cacheModule.deleteCachedData;
export const getCachedSymbols = cacheModule.getCachedSymbols;
export const getCacheStats = cacheModule.getCacheStats;

export { CACHE_TYPE };

