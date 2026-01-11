import mongoose from 'mongoose';

const financialDataSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        uppercase: true,
        index: true
    },
    reportType: {
        type: String,
        required: true,
        enum: ['income', 'balance', 'cashflow', 'earnings', 'overview', 'combined']
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for symbol + reportType
financialDataSchema.index({ symbol: 1, reportType: 1 }, { unique: true });

// TTL index to automatically delete old data after specified time
// This will be set based on CACHE_EXPIRATION_HOURS
financialDataSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: parseInt(process.env.CACHE_EXPIRATION_HOURS || 24) * 3600
});

// Update the updatedAt timestamp before saving
financialDataSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const FinancialData = mongoose.model('FinancialData', financialDataSchema);

export default FinancialData;

