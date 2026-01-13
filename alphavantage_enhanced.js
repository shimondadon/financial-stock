import fetch from 'node-fetch';
import { saveToCache, getFromCache } from './cacheManager.js';

// ========================================
// הגדרות גלובליות
// ========================================

// סט A - מפתחות API ראשי (5 מפתחות)
const API_KEYS_SET_A = [
    'TT0O07L0Y7DO2PHV',
    'WCP77UX1RF7O4MSG',
    'XAN8JQ0KV40DRKUO',
    '73DEDQ2T9NQD96QG',
    'MZCCU2PIV56DC6RB'
];

// סט B - מפתחות API גיבוי (5 מפתחות)
const API_KEYS_SET_B = [
    'OZU0A7HK5EN21J13',
    'VD6SE0D30YSRUL3G',
    '1E4Q7KAMMGXZGWI4',
    'LWYTO43XX5TH4LQ0',
    '6P6D12B4ZFCOT550'
];

// מפתח רזרבי נוסף (אופציונלי)
const API_KEY_RESERVE = 'UX624YT2RK2EMVMU';

const BASE_URL = 'https://www.alphavantage.co/query';

// מעקב אחר הסט הנוכחי
let currentApiKeySet = 'A'; // 'A' or 'B'
let apiKeySwitchCount = 0;

/**
 * קבלת הסט הנוכחי של מפתחות API
 */
function getCurrentApiKeySet() {
    return currentApiKeySet === 'A' ? API_KEYS_SET_A : API_KEYS_SET_B;
}

/**
 * החלפת סט מפתחות API
 */
function switchApiKeySet() {
    const oldSet = currentApiKeySet;
    currentApiKeySet = currentApiKeySet === 'A' ? 'B' : 'A';
    apiKeySwitchCount++;

    console.log(`\n⚠️ ========================================`);
    console.log(`🔄 SWITCHING API KEY SET: ${oldSet} → ${currentApiKeySet}`);
    console.log(`📊 Switch count: ${apiKeySwitchCount}`);
    console.log(`🔑 Now using ${getCurrentApiKeySet().length} keys from Set ${currentApiKeySet}`);
    console.log(`⚠️ ========================================\n`);

    return currentApiKeySet;
}

/**
 * בדיקה האם התגובה מציינת שגיאת מכסה יומית
 */
function isRateLimitError(data) {
    if (!data) return false;

    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // בדיקת מספר דפוסי שגיאה
    const errorPatterns = [
        'limit is 25 requests per day',
        'Thank you for using Alpha Vantage',
        'Our standard API rate limit',
        'premium plan',
        'rate limit'
    ];

    return errorPatterns.some(pattern =>
        dataString.toLowerCase().includes(pattern.toLowerCase())
    );
}

/**
 * קבלת המפתח הבא מהסט הנוכחי (rotation)
 * @param {number} keyIndex - האינדקס הנוכחי במערך המפתחות
 * @returns {Object} - אובייקט עם המפתח והאינדקס החדש
 */
function getNextApiKey(keyIndex) {
    const keySet = getCurrentApiKeySet();
    const key = keySet[keyIndex % keySet.length];
    const newIndex = keyIndex + 1;
    return { key, newIndex };
}

// ========================================
// מנגנון נעילה למניעת קריאות API מקבילות
// ========================================
let isApiFetching = false;
let currentFetchingSymbol = null;
let apiLockQueue = [];
let lastApiCallEndTime = null;
const API_COOLDOWN_MS = 14000; // 14 שניות cooldown אחרי כל משיכה

/**
 * המתנה לתור עד שאפשר לקרוא ל-API
 * @param {string} symbol - סימבול המניה
 * @returns {Promise<void>}
 */
async function waitForApiAvailability(symbol) {
    return new Promise((resolve) => {
        // בדיקה אם צריך להמתין ל-cooldown
        const checkAvailability = () => {
            // אם ה-API תפוס
            if (isApiFetching) {
                console.log(`⏳ API is busy fetching data for "${currentFetchingSymbol}". Symbol "${symbol}" is waiting in queue...`);
                console.log(`📊 Queue position: ${apiLockQueue.length + 1}`);
                apiLockQueue.push({ symbol, resolve, timestamp: Date.now() });
                return;
            }

            // אם יש cooldown פעיל
            if (lastApiCallEndTime) {
                const timeSinceLastCall = Date.now() - lastApiCallEndTime;
                const remainingCooldown = API_COOLDOWN_MS - timeSinceLastCall;

                if (remainingCooldown > 0) {
                    console.log(`⏰ Cooldown active: ${Math.ceil(remainingCooldown / 1000)}s remaining. Symbol "${symbol}" is waiting...`);
                    setTimeout(checkAvailability, remainingCooldown);
                    return;
                }
            }

            // API זמין!
            isApiFetching = true;
            currentFetchingSymbol = symbol;
            console.log(`✅ API is now available for "${symbol}"`);
            resolve();
        };

        checkAvailability();
    });
}

/**
 * שחרור הנעילה וטיפול בתור
 */
function releaseApiLock() {
    console.log(`🔓 API lock released for "${currentFetchingSymbol}"`);
    isApiFetching = false;
    currentFetchingSymbol = null;
    lastApiCallEndTime = Date.now();

    // טיפול במשתמש הבא בתור
    if (apiLockQueue.length > 0) {
        const waitTime = Math.ceil((Date.now() - apiLockQueue[0].timestamp) / 1000);
        console.log(`👥 Processing next in queue (waited ${waitTime}s)...`);

        setTimeout(() => {
            const next = apiLockQueue.shift();
            console.log(`⏭️ Starting fetch for "${next.symbol}" from queue`);

            isApiFetching = true;
            currentFetchingSymbol = next.symbol;
            next.resolve();
        }, API_COOLDOWN_MS);
    } else {
        console.log(`✨ Queue is empty. API will be available in ${API_COOLDOWN_MS / 1000}s`);
    }
}

// ========================================
// פונקציות עזר (Utility Functions)
// ========================================

/**
 * המתנה בין קריאות API כדי למנוע rate limiting
 * @param {number} ms - מספר המילישניות להמתין
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * המרת ערך למספר (טיפול ב-None ו-undefined)
 * @param {any} val - הערך להמרה
 * @returns {number|null} - מספר או null
 */
const parseValue = (val) => {
    if (!val || val === 'None') return null;
    return parseFloat(val);
};

// ========================================
// ניהול Cache - MongoDB במקום קבצים
// ========================================

/**
 * בדיקה אם כל הנתונים קיימים ב-MongoDB cache
 * @param {string} symbol - סימבול המניה
 * @returns {Object|null} - הנתונים מה-cache או null
 */
export async function getCachedData(symbol) {
    try {
        console.log(`📂 Checking MongoDB cache for ${symbol}...`);

        // טעינת כל 5 סוגי הדוחות מ-MongoDB
        const [incomeData, balanceData, cashFlowData, earningsData, overviewData] = await Promise.all([
            getFromCache(symbol, 'income'),
            getFromCache(symbol, 'balance'),
            getFromCache(symbol, 'cashflow'),
            getFromCache(symbol, 'earnings'),
            getFromCache(symbol, 'overview')
        ]);

        // בדיקה שכל הנתונים קיימים
        if (!incomeData || !balanceData || !cashFlowData || !earningsData || !overviewData) {
            console.log('⚠️ Some cache data missing in MongoDB, will fetch from API...');
            return null;
        }

        console.log('✅ All 5 data types loaded successfully from MongoDB!');

        return {
            incomeData,
            balanceData,
            cashFlowData,
            earningsData,
            overviewData
        };

    } catch (err) {
        console.log(`⚠️ Error reading MongoDB cache: ${err.message}`);
        return null;
    }
}

/**
 * שמירת נתונים ל-MongoDB - 5 רשומות נפרדות
 * @param {string} symbol - סימבול המניה
 * @param {Object} rawData - הנתונים הגולמיים מ-API
 */
async function saveDataToCache(symbol, rawData) {
    console.log(`\n💾 Caching data for ${symbol} to MongoDB...`);

    try {
        // שמירה של כל 5 סוגי הדוחות במקביל
        await Promise.all([
            saveToCache(symbol, 'income', rawData.incomeData),
            saveToCache(symbol, 'balance', rawData.balanceData),
            saveToCache(symbol, 'cashflow', rawData.cashFlowData),
            saveToCache(symbol, 'earnings', rawData.earningsData),
            saveToCache(symbol, 'overview', rawData.overviewData)
        ]);

        console.log(`✅ All 5 data types cached successfully in MongoDB!\n`);

    } catch (err) {
        console.error(`⚠️ Failed to cache data to MongoDB: ${err.message}`);
    }
}

// ========================================
// משיכת נתונים מ-API
// ========================================

/**
 * פונקציה כללית לקריאת API עם טיפול בשגיאות והחלפת סטים
 * @param {string} functionName - שם הפונקציה ב-API
 * @param {string} symbol - סימבול המניה
 * @param {string} reportName - שם הדוח לתצוגה
 * @param {number} keyIndex - האינדקס הנוכחי במערך המפתחות
 * @returns {Promise<Object>} - אובייקט עם הנתונים והאינדקס החדש
 */
async function fetchApiData(functionName, symbol, reportName, keyIndex) {
    console.log(`Fetching ${reportName}...`);

    const { key, newIndex } = getNextApiKey(keyIndex);

    const response = await fetch(
        `${BASE_URL}?function=${functionName}&symbol=${symbol}&apikey=${key}`
    );
    const data = await response.json();

    // בדיקת שגיאת מכסה
    if (isRateLimitError(data)) {
        console.error(`❌ Rate limit error detected in ${reportName}!`);
        throw new Error(`RATE_LIMIT:${reportName}`);
    }

    return { data, newIndex };
}

/**
 * משיכת כל הנתונים הפיננסיים מ-Alpha Vantage API
 * עם תמיכה בהחלפת סט מפתחות אוטומטית במקרה של שגיאת מכסה
 * @param {string} symbol - סימבול המניה
 * @param {boolean} isRetry - האם זו ניסיון חוזר אחרי החלפת סט
 * @returns {Promise<Object>} - אובייקט עם כל הנתונים הגולמיים
 */
async function fetchAllFinancialData(symbol, isRetry = false) {
    // המתנה עד שה-API זמין
    await waitForApiAvailability(symbol);

    try {
        console.log(`🚀 Starting API fetch for ${symbol}...`);
        console.log(`🔑 Using API Key Set: ${currentApiKeySet}`);
        console.log(`⏱️ Estimated time: ~65 seconds (5 API calls with 13s delays)`);

        // מערך של כל הקריאות שצריך לבצע
        const apiCalls = [
            { function: 'INCOME_STATEMENT', name: 'Income Statement', delay: 0 },
            { function: 'BALANCE_SHEET', name: 'Balance Sheet', delay: 0 },
            { function: 'CASH_FLOW', name: 'Cash Flow', delay: 0 },
            { function: 'EARNINGS', name: 'Earnings', delay: 0 },
            { function: 'OVERVIEW', name: 'Company Overview', delay: 0 }
        ];

        const results = {};
        const resultKeys = ['incomeData', 'balanceData', 'cashFlowData', 'earningsData', 'overviewData'];

        // מונה מפתחות מקומי - מתחיל מ-0 לכל משיכת סימבול!
        let localKeyIndex = 0;

        // ביצוע כל הקריאות ברצף
        for (let i = 0; i < apiCalls.length; i++) {
            const call = apiCalls[i];

            try {
                const result = await fetchApiData(call.function, symbol, call.name, localKeyIndex);
                results[resultKeys[i]] = result.data;
                localKeyIndex = result.newIndex; // עדכון האינדקס

                // המתנה בין קריאות (מלבד האחרונה)
                if (call.delay > 0) {
                    await delay(call.delay);
                }
            } catch (error) {
                // אם זו שגיאת rate limit ולא ניסיון חוזר
                if (error.message.startsWith('RATE_LIMIT:') && !isRetry) {
                    console.log(`🔄 Switching to Set ${currentApiKeySet === 'A' ? 'B' : 'A'}...`);
                    switchApiKeySet();
                    releaseApiLock();
                    return await fetchAllFinancialData(symbol, true);
                }

                // אם זו שגיאת rate limit וזה כבר ניסיון חוזר
                if (error.message.startsWith('RATE_LIMIT:') && isRetry) {
                    throw new Error('Rate limit exceeded on both API key sets. Please try again tomorrow.');
                }

                // שגיאה אחרת - זרוק הלאה
                throw error;
            }
        }

        console.log(`✅ Successfully fetched all data for ${symbol} using Set ${currentApiKeySet}`);

        return results;

    } catch (error) {
        console.error(`❌ Error fetching data for ${symbol}:`, error.message);
        throw error;
    } finally {
        // שחרור הנעילה ללא קשר להצלחה או כישלון
        releaseApiLock();
    }
}

/**
 * בדיקת שגיאות בנתונים שהתקבלו מ-API
 * @param {Object} data - אובייקט עם כל הנתונים
 * @returns {boolean} - האם יש שגיאות קריטיות
 */
function checkForErrors(data) {
    const { incomeData, balanceData, cashFlowData, earningsData, overviewData } = data;

    if (incomeData.Note || incomeData['Error Message']) {
        console.error('\n⚠️ Income Statement Error:', incomeData.Note || incomeData['Error Message']);
    }
    if (balanceData.Note || balanceData['Error Message']) {
        console.error('\n⚠️ Balance Sheet Error:', balanceData.Note || balanceData['Error Message']);
    }
    if (cashFlowData.Note || cashFlowData['Error Message']) {
        console.error('\n⚠️ Cash Flow Error:', cashFlowData.Note || cashFlowData['Error Message']);
    }
    if (earningsData.Note || earningsData['Error Message']) {
        console.error('\n⚠️ Earnings Error:', earningsData.Note || earningsData['Error Message']);
    }
    if (overviewData.Note || overviewData['Error Message']) {
        console.error('\n⚠️ Overview Error:', overviewData.Note || overviewData['Error Message']);
    }

    // בדיקה אם יש שגיאה בכל הדוחות המרכזיים
    const allFailed = (incomeData.Note || incomeData['Error Message']) &&
                      (balanceData.Note || balanceData['Error Message']) &&
                      (cashFlowData.Note || cashFlowData['Error Message']);

    if (allFailed) {
        console.error('\n❌ All API calls failed. Please wait 1 minute before trying again.');
    }

    return allFailed;
}

/**
 * חילוץ דוחות (שנתיים או רבעוניים) ותקופות זמינות
 * @param {Object} data - אובייקט עם כל הנתונים
 * @param {string} reportType - 'annual' או 'quarterly'
 * @returns {Object} - דוחות ותקופות זמינות
 */
function extractReportsAndYears(data, reportType = 'annual') {
    const { incomeData, balanceData, cashFlowData, earningsData } = data;

    // בחירת סוג הדוחות (שנתי או רבעוני)
    const isAnnual = reportType === 'annual';
    const reportsKey = isAnnual ? 'annualReports' : 'quarterlyReports';
    const earningsKey = isAnnual ? 'annualEarnings' : 'quarterlyEarnings';

    const incomeReports = incomeData[reportsKey] || [];
    const balanceReports = balanceData[reportsKey] || [];
    const cashFlowReports = cashFlowData[reportsKey] || [];
    const earningsReports = earningsData[earningsKey] || [];

    // עבור דוחות רבעוניים, נשתמש בתאריך המלא (YYYY-MM-DD)
    // עבור דוחות שנתיים, רק השנה (YYYY)
    const extractPeriod = (dateStr) => {
        if (!dateStr) return null;
        return isAnnual ? dateStr.substring(0, 4) : dateStr;
    };

    const incomePeriods = incomeReports.map(r => extractPeriod(r.fiscalDateEnding)).filter(Boolean);
    const balancePeriods = balanceReports.map(r => extractPeriod(r.fiscalDateEnding)).filter(Boolean);
    const cashFlowPeriods = cashFlowReports.map(r => extractPeriod(r.fiscalDateEnding)).filter(Boolean);
    const earningsPeriods = earningsReports.map(r => extractPeriod(r.fiscalDateEnding)).filter(Boolean);

    const periods = [...new Set([...incomePeriods, ...balancePeriods, ...cashFlowPeriods, ...earningsPeriods])].sort().reverse();

    // הדפסת סיכום
    console.log(`\n=== Available ${isAnnual ? 'Years' : 'Quarters'} (${reportType.toUpperCase()}) ===`);
    console.log(`Income Statement: ${incomeReports.length} ${isAnnual ? 'years' : 'quarters'} (${incomePeriods.length > 0 ? incomePeriods[0] + ' to ' + incomePeriods[incomePeriods.length - 1] : 'none'})`);
    console.log(`Balance Sheet: ${balanceReports.length} ${isAnnual ? 'years' : 'quarters'} (${balancePeriods.length > 0 ? balancePeriods[0] + ' to ' + balancePeriods[balancePeriods.length - 1] : 'none'})`);
    console.log(`Cash Flow: ${cashFlowReports.length} ${isAnnual ? 'years' : 'quarters'} (${cashFlowPeriods.length > 0 ? cashFlowPeriods[0] + ' to ' + cashFlowPeriods[cashFlowPeriods.length - 1] : 'none'})`);
    console.log(`Earnings: ${earningsReports.length} ${isAnnual ? 'years' : 'quarters'} (${earningsPeriods.length > 0 ? earningsPeriods[0] + ' to ' + earningsPeriods[earningsPeriods.length - 1] : 'none'})`);
    console.log(`📊 Total unique periods (union): ${periods.length}`);

    return {
        reportType,
        incomeReports,
        balanceReports,
        cashFlowReports,
        earningsReports,
        incomePeriods,
        balancePeriods,
        cashFlowPeriods,
        earningsPeriods,
        periods,
        // שמירת שמות ישנים לתאימות לאחור
        incomeYears: incomePeriods,
        balanceYears: balancePeriods,
        cashFlowYears: cashFlowPeriods,
        earningsYears: earningsPeriods,
        years: periods
    };
}

// ========================================
// חישוב מדדים פיננסיים
// ========================================

/**
 * חישוב כל המדדים הפיננסיים לשנה מסוימת
 * @param {Object} income - דוח רווח והפסד
 * @param {Object} balance - מאזן
 * @param {Object} cashFlow - תזרים מזומנים
 * @param {Object} earnings - נתוני רווחיות
 * @returns {Object} - מדדים מחושבים
 */
function calculateFinancialMetrics(income, balance, cashFlow, earnings) {
    // בדיקה אם הדוחות קיימים (לא אובייקט ריק)
    const hasIncome = income && Object.keys(income).length > 0;
    const hasBalance = balance && Object.keys(balance).length > 0;
    const hasCashFlow = cashFlow && Object.keys(cashFlow).length > 0;
    const hasEarnings = earnings && Object.keys(earnings).length > 0;

    const revenue = hasIncome ? parseValue(income.totalRevenue) : null;
    const netIncome = hasIncome ? parseValue(income.netIncome) : null;
    const totalAssets = hasBalance ? parseValue(balance.totalAssets) : null;
    const equity = hasBalance ? parseValue(balance.totalShareholderEquity) : null;
    const currentAssets = hasBalance ? parseValue(balance.totalCurrentAssets) : null;
    const currentLiabilities = hasBalance ? parseValue(balance.totalCurrentLiabilities) : null;
    const longTermDebt = hasBalance ? parseValue(balance.longTermDebt) : null;
    const operatingCashFlow = hasCashFlow ? parseValue(cashFlow.operatingCashflow) : null;
    const capex = hasCashFlow ? parseValue(cashFlow.capitalExpenditures) : null;
    const freeCashFlow = operatingCashFlow && capex ? operatingCashFlow + capex : null;
    const shares = hasBalance ? parseValue(balance.commonStockSharesOutstanding) : null;
    const eps = hasEarnings ? parseValue(earnings.reportedEPS) : null;

    return {
        // Profitability Ratios
        grossProfitMargin: (hasIncome && revenue) ? (parseValue(income.grossProfit) / revenue) * 100 : null,
        operatingMargin: (hasIncome && revenue) ? (parseValue(income.operatingIncome) / revenue) * 100 : null,
        netProfitMargin: revenue && netIncome ? (netIncome / revenue) * 100 : null,
        returnOnAssets: totalAssets && netIncome ? (netIncome / totalAssets) * 100 : null,
        returnOnEquity: equity && netIncome ? (netIncome / equity) * 100 : null,

        // Liquidity Ratios
        currentRatio: (currentLiabilities && currentAssets) ? currentAssets / currentLiabilities : null,
        quickRatio: (currentLiabilities && currentAssets && hasBalance) ?
            (currentAssets - parseValue(balance.inventory)) / currentLiabilities : null,
        workingCapital: (currentAssets && currentLiabilities) ? currentAssets - currentLiabilities : null,

        // Leverage Ratios
        debtToEquity: (equity && longTermDebt) ? longTermDebt / equity : null,
        debtToAssets: (totalAssets && longTermDebt) ? longTermDebt / totalAssets : null,
        equityRatio: (totalAssets && equity) ? equity / totalAssets : null,

        // Cash Flow Ratios
        freeCashFlow: freeCashFlow,
        freeCashFlowToRevenue: (revenue && freeCashFlow) ? (freeCashFlow / revenue) * 100 : null,
        cashFlowToDebt: (longTermDebt && operatingCashFlow) ? operatingCashFlow / longTermDebt : null,

        // Per Share Metrics
        earningsPerShare: eps,
        bookValuePerShare: (shares && equity) ? equity / shares : null,
        cashPerShare: (shares && hasBalance) ? parseValue(balance.cashAndCashEquivalentsAtCarryingValue) / shares : null,

        // Growth Metrics (will be calculated later)
        revenueGrowth: null,
        netIncomeGrowth: null,
        epsGrowth: null,

        // Asset Efficiency
        assetTurnover: (totalAssets && revenue) ? revenue / totalAssets : null,
        inventoryTurnover: (hasBalance && hasIncome && parseValue(balance.inventory) && parseValue(income.costOfRevenue)) ?
            parseValue(income.costOfRevenue) / parseValue(balance.inventory) : null,

        // Other Important Metrics
        ebitdaMargin: (hasIncome && revenue && parseValue(income.ebitda)) ? (parseValue(income.ebitda) / revenue) * 100 : null,
        interestCoverage: (hasIncome && parseValue(income.interestExpense) && parseValue(income.operatingIncome)) ?
            parseValue(income.operatingIncome) / Math.abs(parseValue(income.interestExpense)) : null,
    };
}

/**
 * יצירת דוחות משופרים עם מדדים מחושבים
 * @param {Object} reportsData - כל הדוחות והתקופות
 * @returns {Array} - מערך של דוחות משופרים
 */
function createEnhancedReports(reportsData) {
    const { periods, incomeReports, balanceReports, cashFlowReports, earningsReports, reportType } = reportsData;
    const isAnnual = reportType === 'annual';

    const enhancedReports = periods.map(period => {
        // מציאת דוחות לפי תקופה (שנה או רבעון)
        const matchPeriod = (report) => {
            if (!report.fiscalDateEnding) return false;
            return isAnnual ?
                report.fiscalDateEnding.startsWith((parseInt(period)).toString() ) :
                report.fiscalDateEnding === period;
        };

        const income = incomeReports.find(matchPeriod) || {};
        const balance = balanceReports.find(matchPeriod) || {};
        const cashFlow = cashFlowReports.find(matchPeriod) || {};
        const earnings = earningsReports.find(matchPeriod) || {};

        // בדיקה איזה דוחות זמינים
        const hasIncome = income && Object.keys(income).length > 0;
        const hasBalance = balance && Object.keys(balance).length > 0;
        const hasCashFlow = cashFlow && Object.keys(cashFlow).length > 0;
        const hasEarnings = earnings && Object.keys(earnings).length > 0;

        return {
            period,  // יכול להיות שנה (2024) או תאריך מלא (2024-12-31)
            year: isAnnual ? period : period.substring(0, 4),  // תמיד שנה
            fiscalDateEnding: income.fiscalDateEnding || balance.fiscalDateEnding || cashFlow.fiscalDateEnding || earnings.fiscalDateEnding,
            reportType,

            // אינדיקטור זמינות דוחות
            availableReports: {
                incomeStatement: hasIncome,
                balanceSheet: hasBalance,
                cashFlow: hasCashFlow,
                earnings: hasEarnings,
                completeness: (hasIncome && hasBalance && hasCashFlow && hasEarnings) ? 'complete' : 'partial'
            },

            incomeStatement: income,
            balanceSheet: balance,
            cashFlow: cashFlow,
            earnings: earnings,
            calculatedMetrics: calculateFinancialMetrics(income, balance, cashFlow, earnings)
        };
    });

    return enhancedReports;
}

/**
 * חישוב מדדי צמיחה על ידי השוואה לשנה הקודמת
 * @param {Array} enhancedReports - מערך הדוחות המשופרים
 */
function calculateGrowthMetrics(enhancedReports) {
    for (let i = 0; i < enhancedReports.length - 1; i++) {
        const current = enhancedReports[i];
        const previous = enhancedReports[i + 1];

        // חישוב צמיחה בהכנסות - רק אם יש income statement לשתי התקופות
        if (current.availableReports.incomeStatement && previous.availableReports.incomeStatement) {
            const currentRevenue = parseFloat(current.incomeStatement.totalRevenue);
            const previousRevenue = parseFloat(previous.incomeStatement.totalRevenue);
            if (currentRevenue && previousRevenue && previousRevenue !== 0) {
                current.calculatedMetrics.revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
            }
        }

        // חישוב צמיחה ברווח נקי - רק אם יש income statement לשתי התקופות
        if (current.availableReports.incomeStatement && previous.availableReports.incomeStatement) {
            const currentNetIncome = parseFloat(current.incomeStatement.netIncome);
            const previousNetIncome = parseFloat(previous.incomeStatement.netIncome);
            if (currentNetIncome && previousNetIncome && previousNetIncome !== 0) {
                current.calculatedMetrics.netIncomeGrowth = ((currentNetIncome - previousNetIncome) / previousNetIncome) * 100;
            }
        }

        // חישוב צמיחה ב-EPS - רק אם יש earnings לשתי התקופות
        if (current.availableReports.earnings && previous.availableReports.earnings) {
            const currentEPS = parseFloat(current.earnings.reportedEPS);
            const previousEPS = parseFloat(previous.earnings.reportedEPS);
            if (currentEPS && previousEPS && previousEPS !== 0) {
                current.calculatedMetrics.epsGrowth = ((currentEPS - previousEPS) / previousEPS) * 100;
            }
        }
    }
}

// ========================================
// שמירה והדפסה
// ========================================

/**
 * יצירת מבנה הנתונים המלא לשמירה
 * @param {string} symbol - סימבול המניה
 * @param {Object} overviewData - מידע כללי על החברה
 * @param {Array} annualReports - דוחות שנתיים משופרים
 * @param {Array} quarterlyReports - דוחות רבעוניים משופרים
 * @param {Object} rawData - נתונים גולמיים
 * @returns {Object} - מבנה נתונים מלא
 */
function createFullDataStructure(symbol, overviewData, annualReports, quarterlyReports, rawData) {
    return {
        symbol: symbol,
        fetchedAt: new Date().toISOString(),
        companyOverview: overviewData,

        // נתונים שנתיים
        annual: {
            periodsAvailable: annualReports.length,
            periods: annualReports.map(r => r.period),
            enhancedReports: annualReports
        },

        // נתונים רבעוניים
        quarterly: {
            periodsAvailable: quarterlyReports.length,
            periods: quarterlyReports.map(r => r.period),
            enhancedReports: quarterlyReports
        },

        // נתונים גולמיים (כולל גם annual וגם quarterly)
        rawData: {
            incomeStatement: {
                annual: rawData.incomeData.annualReports || [],
                quarterly: rawData.incomeData.quarterlyReports || []
            },
            balanceSheet: {
                annual: rawData.balanceData.annualReports || [],
                quarterly: rawData.balanceData.quarterlyReports || []
            },
            cashFlow: {
                annual: rawData.cashFlowData.annualReports || [],
                quarterly: rawData.cashFlowData.quarterlyReports || []
            },
            earnings: {
                annual: rawData.earningsData.annualEarnings || [],
                quarterly: rawData.earningsData.quarterlyEarnings || []
            }
        },

        // תאימות לאחור - ברירת מחדל שנתי
        yearsAvailable: annualReports.length,
        years: annualReports.map(r => r.period),
        enhancedReports: annualReports
    };
}

/**
 * שמירת הנתונים לקובץ JSON (ללא timestamp בשם)
 * @param {Object} fullData - הנתונים המלאים
 * @param {string} symbol - סימבול המניה
 */
function saveToFile(fullData, symbol) {
    const filename = `financial_enhanced_${symbol}.json`;
    const filepath = path.join(CACHE_DIR, filename);

    try {
        fs.writeFileSync(filepath, JSON.stringify(fullData, null, 2), 'utf8');
        console.log(`\n💾 Enhanced JSON saved to file: ${filename}`);
        console.log(`📁 File location: ${filepath}`);
        console.log(`📦 File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
        return filename;
    } catch (writeErr) {
        console.error(`\n⚠️ Failed to save JSON to file: ${writeErr.message}`);
        return null;
    }
}

/**
 * הדפסת סיכום מדדים פיננסיים לשנה האחרונה
 * @param {Array} enhancedReports - מערך הדוחות המשופרים
 */
function printMetricsSummary(enhancedReports) {
    console.log('\n\n📊 === CALCULATED METRICS SUMMARY (Latest Year) ===');

    if (enhancedReports.length === 0) {
        console.log('No data available');
        return;
    }

    const latest = enhancedReports[0];
    const metrics = latest.calculatedMetrics;
    const available = latest.availableReports;

    console.log(`Year: ${latest.year}`);
    console.log(`\n📋 Available Reports:`);
    console.log(`  Income Statement: ${available.incomeStatement ? '✅' : '❌'}`);
    console.log(`  Balance Sheet: ${available.balanceSheet ? '✅' : '❌'}`);
    console.log(`  Cash Flow: ${available.cashFlow ? '✅' : '❌'}`);
    console.log(`  Earnings: ${available.earnings ? '✅' : '❌'}`);
    console.log(`  Completeness: ${available.completeness === 'complete' ? '✅ Complete' : '⚠️ Partial'}`);

    // פונקציית עזר להצגת ערך או N/A
    const formatValue = (value, suffix = '', decimals = 2) => {
        if (value === null || value === undefined) return 'N/A';
        return `${value.toFixed(decimals)}${suffix}`;
    };

    console.log('\nProfitability:');
    console.log(`  Gross Profit Margin: ${formatValue(metrics.grossProfitMargin, '%')}`);
    console.log(`  Operating Margin: ${formatValue(metrics.operatingMargin, '%')}`);
    console.log(`  Net Profit Margin: ${formatValue(metrics.netProfitMargin, '%')}`);
    console.log(`  ROA: ${formatValue(metrics.returnOnAssets, '%')}`);
    console.log(`  ROE: ${formatValue(metrics.returnOnEquity, '%')}`);

    console.log('\nLiquidity:');
    console.log(`  Current Ratio: ${formatValue(metrics.currentRatio, '')}`);
    console.log(`  Quick Ratio: ${formatValue(metrics.quickRatio, '')}`);
    console.log(`  Working Capital: ${metrics.workingCapital !== null ? `$${(metrics.workingCapital / 1e9).toFixed(2)}B` : 'N/A'}`);

    console.log('\nLeverage:');
    console.log(`  Debt-to-Equity: ${formatValue(metrics.debtToEquity, '')}`);
    console.log(`  Debt-to-Assets: ${formatValue(metrics.debtToAssets, '')}`);
    console.log(`  Equity Ratio: ${formatValue(metrics.equityRatio, '')}`);

    console.log('\nGrowth:');
    console.log(`  Revenue Growth: ${formatValue(metrics.revenueGrowth, '%')}`);
    console.log(`  Net Income Growth: ${formatValue(metrics.netIncomeGrowth, '%')}`);
    console.log(`  EPS Growth: ${formatValue(metrics.epsGrowth, '%')}`);
}

// ========================================
// פונקציה ראשית
// ========================================

/**
 * פונקציה ראשית למשיכת וניתוח נתונים פיננסיים
 * @param {string} symbol - סימבול המניה
 * @param {boolean} skipApiIfNotCached - האם לדלג על API אם אין cache
 * @param {boolean} forceApiRefresh - האם לכפות משיכה מה-API גם אם יש cache
 * @returns {Promise<Object|null>} - הנתונים המלאים או null במקרה של שגיאה
 */
export async function getFinancials(symbol, skipApiIfNotCached = false, forceApiRefresh = false) {
    try {
        let rawData;

        // אם forceApiRefresh=true, דלג על בדיקת cache ומשוך ישירות מה-API
        if (forceApiRefresh) {
            console.log('🔄 Force API Refresh mode - skipping cache check, fetching from API...');

            // שלב 1: משיכת כל הנתונים מ-API
            rawData = await fetchAllFinancialData(symbol);

            // שלב 2: בדיקת שגיאות
            const hasErrors = checkForErrors(rawData);
            if (hasErrors) {
                return null;
            }

            // שמירה/עדכון ב-MongoDB
            await saveDataToCache(symbol, rawData);

        } else {
            // בדיקת cache ב-MongoDB
            const cachedData = await getCachedData(symbol);

            if (cachedData) {
                console.log('✅ Found cached data in MongoDB! Using cached data and recalculating...');
                rawData = cachedData;
            } else {
                if (skipApiIfNotCached) {
                    console.log('⚠️ No cache found and skipApiIfNotCached=true, returning null');
                    return null;
                }

                console.log('🔄 No cache found in MongoDB, fetching fresh data from API...');

                // שלב 1: משיכת כל הנתונים מ-API
                rawData = await fetchAllFinancialData(symbol);

                // שלב 2: בדיקת שגיאות
                const hasErrors = checkForErrors(rawData);
                if (hasErrors) {
                    return null;
                }

                // שמירה ל-MongoDB
                await saveDataToCache(symbol, rawData);
            }
        }

        console.log('\n=== ENHANCED FINANCIAL STATEMENTS ===');
        console.log(`Symbol: ${symbol}`);
        console.log(`Currency: USD (in Billions)`);
        console.log(`🔄 Processing data (calculations are always fresh!)\n`);

        // שלב 3: עיבוד דוחות שנתיים (תמיד מחדש!)
        console.log('📅 Processing ANNUAL reports...');
        const annualReportsData = extractReportsAndYears(rawData, 'annual');
        const annualEnhancedReports = createEnhancedReports(annualReportsData);
        calculateGrowthMetrics(annualEnhancedReports);

        // שלב 4: עיבוד דוחות רבעוניים (תמיד מחדש!)
        console.log('📅 Processing QUARTERLY reports...');
        const quarterlyReportsData = extractReportsAndYears(rawData, 'quarterly');
        const quarterlyEnhancedReports = createEnhancedReports(quarterlyReportsData);
        calculateGrowthMetrics(quarterlyEnhancedReports);

        // שלב 5: יצירת מבנה נתונים מלא
        const fullData = createFullDataStructure(
            symbol,
            rawData.overviewData,
            annualEnhancedReports,
            quarterlyEnhancedReports,
            rawData
        );

        // שלב 6: הדפסת סיכום
        console.log('\n✅ Data processed successfully!');

        // סיכום שנתי
        const annualComplete = annualEnhancedReports.filter(r => r.availableReports.completeness === 'complete').length;
        const annualPartial = annualEnhancedReports.length - annualComplete;
        console.log(`📊 Annual periods: ${annualEnhancedReports.length} total (${annualComplete} complete, ${annualPartial} partial)`);

        // סיכום רבעוני
        const quarterlyComplete = quarterlyEnhancedReports.filter(r => r.availableReports.completeness === 'complete').length;
        const quarterlyPartial = quarterlyEnhancedReports.length - quarterlyComplete;
        console.log(`📊 Quarterly periods: ${quarterlyEnhancedReports.length} total (${quarterlyComplete} complete, ${quarterlyPartial} partial)`);

        console.log(`📈 Enhanced metrics calculated for both report types`);

        // שלב 7: הדפסת סיכום מדדים (רק לשנתי)
        printMetricsSummary(annualEnhancedReports);

        return fullData;

    } catch (err) {
        console.error('Error:', err.message);
        return null;
    }
}

// ========================================
// הרצת התוכנית
// ========================================

// Export API lock status functions for server monitoring
export function getApiLockStatus() {
    return {
        isLocked: isApiFetching,
        currentSymbol: currentFetchingSymbol,
        queueLength: apiLockQueue.length,
        queuedSymbols: apiLockQueue.map(item => item.symbol),
        lastCallEndTime: lastApiCallEndTime,
        cooldownRemaining: lastApiCallEndTime
            ? Math.max(0, API_COOLDOWN_MS - (Date.now() - lastApiCallEndTime))
            : 0
    };
}

// Export API key set status
export function getApiKeySetStatus() {
    return {
        currentSet: currentApiKeySet,
        setAKeys: API_KEYS_SET_A.length,
        setBKeys: API_KEYS_SET_B.length,
        switchCount: apiKeySwitchCount,
        totalKeysAvailable: API_KEYS_SET_A.length + API_KEYS_SET_B.length
    };
}

// Run directly from command line (uncomment to use):
// console.log('Alpha Vantage Enhanced Financial Data Fetcher');
// console.log('==============================================\n');
// console.log('Note: Free API key allows 5 requests per minute and 500 per day');
// console.log('Get your free API key at: https://www.alphavantage.co/support/#api-key\n');
// getFinancials('F');

// Or run the web server with: node server.js
