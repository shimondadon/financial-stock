import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CACHE_TYPE = process.env.CACHE_TYPE || 'file';

let cacheModule;

// Dynamically import the correct cache module based on CACHE_TYPE
if (CACHE_TYPE === 'mongodb') {
    console.log('📊 Cache Type: MongoDB Cloud');
    cacheModule = await import('./mongoCache.js');
} else {
    console.log('📁 Cache Type: Local Files');
    cacheModule = await import('./fileCache.js');
}

// Export all cache functions
export const connectDB = cacheModule.connectDB;
export const saveToCache = cacheModule.saveToCache;
export const getFromCache = cacheModule.getFromCache;
export const isCacheValid = cacheModule.isCacheValid;
export const deleteCachedData = cacheModule.deleteCachedData;
export const getCachedSymbols = cacheModule.getCachedSymbols;
export const getCacheStats = cacheModule.getCacheStats;

export { CACHE_TYPE };

