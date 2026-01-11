import mongoose from 'mongoose';
import FinancialData from './models/FinancialData.js';

let isConnected = false;

/**
 * Connect to MongoDB
 */
export async function connectDB() {
    if (isConnected) {
        console.log('✅ Using existing MongoDB connection');
        return;
    }

    console.log('🔌 Attempting to connect to MongoDB...');

    try {
        const mongoUri = process.env.MONGODB_URI;

        console.log(`📋 MongoDB URI exists: ${!!mongoUri}`);
        console.log(`📋 MongoDB URI length: ${mongoUri ? mongoUri.length : 0} characters`);

        if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('<password>') || mongoUri.includes('<cluster-url>')) {
            console.error('❌ MongoDB URI not configured properly in .env file');
            console.error('   Current MONGODB_URI contains placeholder values:');
            if (mongoUri) {
                console.error(`   Has <username>: ${mongoUri.includes('<username>')}`);
                console.error(`   Has <password>: ${mongoUri.includes('<password>')}`);
                console.error(`   Has <cluster-url>: ${mongoUri.includes('<cluster-url>')}`);
            }
            console.error('   Please update MONGODB_URI with your MongoDB Atlas credentials');
            console.error('   OR change CACHE_TYPE to "file" in .env to use local cache');
            throw new Error('MongoDB URI not configured');
        }

        console.log('⏳ Connecting to MongoDB Atlas...');
        await mongoose.connect(mongoUri);

        isConnected = true;
        console.log('✅ Successfully connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('💡 Tip: Change CACHE_TYPE to "file" in .env to use local file cache instead');
        throw error;
    }
}

/**
 * Save financial data to MongoDB
 */
export async function saveToCache(symbol, reportType, data) {
    try {
        await connectDB();

        const result = await FinancialData.findOneAndUpdate(
            { symbol: symbol.toUpperCase(), reportType },
            {
                symbol: symbol.toUpperCase(),
                reportType,
                data,
                updatedAt: new Date()
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        console.log(`💾 Saved ${reportType} data for ${symbol} to MongoDB`);
        return result;
    } catch (error) {
        console.error(`❌ Error saving ${reportType} to MongoDB:`, error.message);
        throw error;
    }
}

/**
 * Get financial data from MongoDB cache
 */
export async function getFromCache(symbol, reportType) {
    try {
        await connectDB();

        const result = await FinancialData.findOne({
            symbol: symbol.toUpperCase(),
            reportType
        });

        if (result) {
            // Check if cache is still valid (within expiration time)
            const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 24);
            const expirationTime = expirationHours * 60 * 60 * 1000; // Convert to milliseconds
            const cacheAge = Date.now() - result.createdAt.getTime();

            if (cacheAge > expirationTime) {
                console.log(`⏰ Cache expired for ${reportType} ${symbol} (age: ${Math.round(cacheAge / 3600000)}h)`);
                // Delete expired cache
                await FinancialData.deleteOne({ _id: result._id });
                return null;
            }

            const ageInHours = Math.round(cacheAge / 3600000);
            console.log(`✅ Found ${reportType} data for ${symbol} in MongoDB cache (age: ${ageInHours}h)`);
            return result.data;
        }

        console.log(`📭 No cached ${reportType} data found for ${symbol}`);
        return null;
    } catch (error) {
        console.error(`❌ Error getting ${reportType} from MongoDB:`, error.message);
        return null;
    }
}

/**
 * Check if cache exists and is valid
 */
export async function isCacheValid(symbol, reportType) {
    try {
        await connectDB();

        const result = await FinancialData.findOne({
            symbol: symbol.toUpperCase(),
            reportType
        }).select('createdAt');

        if (!result) return false;

        const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 24);
        const expirationTime = expirationHours * 60 * 60 * 1000;
        const cacheAge = Date.now() - result.createdAt.getTime();

        return cacheAge <= expirationTime;
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
        await connectDB();

        const query = { symbol: symbol.toUpperCase() };
        if (reportType) {
            query.reportType = reportType;
        }

        const result = await FinancialData.deleteMany(query);
        console.log(`🗑️ Deleted ${result.deletedCount} cached entries for ${symbol}`);
        return result;
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
        await connectDB();

        const symbols = await FinancialData.distinct('symbol');
        return symbols;
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
        await connectDB();

        const totalCount = await FinancialData.countDocuments();
        const symbols = await FinancialData.distinct('symbol');

        const stats = {
            totalEntries: totalCount,
            uniqueSymbols: symbols.length,
            symbols: symbols
        };

        return stats;
    } catch (error) {
        console.error(`❌ Error getting cache stats:`, error.message);
        return null;
    }
}

