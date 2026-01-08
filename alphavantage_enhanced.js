import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// הגדרות גלובליות
// ========================================
const API_KEY = 'TT0O07L0Y7DO2PHV'; // ה-API key שלך
const BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_DIR = path.join(__dirname, 'cache');

// Create cache directory if it doesn't exist
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log('📁 Created cache directory');
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
// ניהול Cache
// ========================================

/**
 * בדיקה אם קיים קובץ cache בתוקף למניה
 * @param {string} symbol - סימבול המניה
 * @returns {Object|null} - הנתונים מה-cache או null
 */
function getCachedData(symbol) {
    const filename = `financial_enhanced_${symbol}.json`;
    const filepath = path.join(CACHE_DIR, filename);

    try {
        // בדיקה אם הקובץ קיים
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            const fileAge = Date.now() - stats.mtimeMs;
            const maxAge = 24 * 60 * 60 * 1000; // 24 שעות במילישניות

            // אם הקובץ עדיין בתוקף
            if (fileAge < maxAge) {
                console.log(`📂 Loading data from cache: ${filename}`);
                console.log(`⏰ Cache age: ${(fileAge / (60 * 60 * 1000)).toFixed(2)} hours`);

                const cachedData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                return cachedData;
            } else {
                console.log(`⚠️ Cache expired (older than 24 hours), fetching fresh data...`);
                // מחיקת הקובץ הישן
                fs.unlinkSync(filepath);
            }
        }
    } catch (err) {
        console.log(`⚠️ Error reading cache: ${err.message}`);
    }

    return null;
}

// ========================================
// משיכת נתונים מ-API
// ========================================

/**
 * משיכת כל הנתונים הפיננסיים מ-Alpha Vantage API
 * @param {string} symbol - סימבול המניה
 * @returns {Promise<Object>} - אובייקט עם כל הנתונים הגולמיים
 */
async function fetchAllFinancialData(symbol) {
    console.log(`Fetching financial data for ${symbol}...`);

    // קבלת Income Statement
    console.log('Fetching Income Statement...', `${BASE_URL}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${API_KEY}`);
    const incomeResponse = await fetch(
        `${BASE_URL}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${API_KEY}`
    );
    const incomeData = await incomeResponse.json();
    await delay(13000);

    // קבלת Balance Sheet
    console.log('Fetching Balance Sheet...');
    const balanceResponse = await fetch(
        `${BASE_URL}?function=BALANCE_SHEET&symbol=${symbol}&apikey=${API_KEY}`
    );
    const balanceData = await balanceResponse.json();
    await delay(13000);

    // קבלת Cash Flow
    console.log('Fetching Cash Flow...');
    const cashFlowResponse = await fetch(
        `${BASE_URL}?function=CASH_FLOW&symbol=${symbol}&apikey=${API_KEY}`
    );
    const cashFlowData = await cashFlowResponse.json();
    await delay(13000);

    // קבלת Earnings
    console.log('Fetching Earnings...');
    const earningsResponse = await fetch(
        `${BASE_URL}?function=EARNINGS&symbol=${symbol}&apikey=${API_KEY}`
    );
    const earningsData = await earningsResponse.json();
    await delay(13000);

    // קבלת Company Overview
    console.log('Fetching Company Overview...');
    const overviewResponse = await fetch(
        `${BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`
    );
    const overviewData = await overviewResponse.json();

    return {
        incomeData,
        balanceData,
        cashFlowData,
        earningsData,
        overviewData
    };
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
    console.log(`Income Statement: ${incomeReports.length} ${isAnnual ? 'years' : 'quarters'}`);
    console.log(`Balance Sheet: ${balanceReports.length} ${isAnnual ? 'years' : 'quarters'}`);
    console.log(`Cash Flow: ${cashFlowReports.length} ${isAnnual ? 'years' : 'quarters'}`);
    console.log(`Earnings: ${earningsReports.length} ${isAnnual ? 'years' : 'quarters'}`);

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
    const revenue = parseValue(income.totalRevenue);
    const netIncome = parseValue(income.netIncome);
    const totalAssets = parseValue(balance.totalAssets);
    const equity = parseValue(balance.totalShareholderEquity);
    const currentAssets = parseValue(balance.totalCurrentAssets);
    const currentLiabilities = parseValue(balance.totalCurrentLiabilities);
    const longTermDebt = parseValue(balance.longTermDebt);
    const operatingCashFlow = parseValue(cashFlow.operatingCashflow);
    const capex = parseValue(cashFlow.capitalExpenditures);
    const freeCashFlow = operatingCashFlow && capex ? operatingCashFlow + capex : null;
    const shares = parseValue(balance.commonStockSharesOutstanding);
    const eps = parseValue(earnings.reportedEPS);

    return {
        // Profitability Ratios
        grossProfitMargin: revenue ? (parseValue(income.grossProfit) / revenue) * 100 : null,
        operatingMargin: revenue ? (parseValue(income.operatingIncome) / revenue) * 100 : null,
        netProfitMargin: revenue && netIncome ? (netIncome / revenue) * 100 : null,
        returnOnAssets: totalAssets && netIncome ? (netIncome / totalAssets) * 100 : null,
        returnOnEquity: equity && netIncome ? (netIncome / equity) * 100 : null,

        // Liquidity Ratios
        currentRatio: currentLiabilities ? currentAssets / currentLiabilities : null,
        quickRatio: currentLiabilities && currentAssets ?
            (currentAssets - parseValue(balance.inventory)) / currentLiabilities : null,
        workingCapital: currentAssets && currentLiabilities ? currentAssets - currentLiabilities : null,

        // Leverage Ratios
        debtToEquity: equity && longTermDebt ? longTermDebt / equity : null,
        debtToAssets: totalAssets && longTermDebt ? longTermDebt / totalAssets : null,
        equityRatio: totalAssets && equity ? equity / totalAssets : null,

        // Cash Flow Ratios
        freeCashFlow: freeCashFlow,
        freeCashFlowToRevenue: revenue && freeCashFlow ? (freeCashFlow / revenue) * 100 : null,
        cashFlowToDebt: longTermDebt && operatingCashFlow ? operatingCashFlow / longTermDebt : null,

        // Per Share Metrics
        earningsPerShare: eps,
        bookValuePerShare: shares && equity ? equity / shares : null,
        cashPerShare: shares ? parseValue(balance.cashAndCashEquivalentsAtCarryingValue) / shares : null,

        // Growth Metrics (will be calculated later)
        revenueGrowth: null,
        netIncomeGrowth: null,
        epsGrowth: null,

        // Asset Efficiency
        assetTurnover: totalAssets && revenue ? revenue / totalAssets : null,
        inventoryTurnover: parseValue(balance.inventory) && parseValue(income.costOfRevenue) ?
            parseValue(income.costOfRevenue) / parseValue(balance.inventory) : null,

        // Other Important Metrics
        ebitdaMargin: revenue && parseValue(income.ebitda) ? (parseValue(income.ebitda) / revenue) * 100 : null,
        interestCoverage: parseValue(income.interestExpense) && parseValue(income.operatingIncome) ?
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
                report.fiscalDateEnding.startsWith(period) :
                report.fiscalDateEnding === period;
        };

        const income = incomeReports.find(matchPeriod) || {};
        const balance = balanceReports.find(matchPeriod) || {};
        const cashFlow = cashFlowReports.find(matchPeriod) || {};
        const earnings = earningsReports.find(matchPeriod) || {};

        return {
            period,  // יכול להיות שנה (2024) או תאריך מלא (2024-12-31)
            year: isAnnual ? period : period.substring(0, 4),  // תמיד שנה
            fiscalDateEnding: income.fiscalDateEnding || balance.fiscalDateEnding || cashFlow.fiscalDateEnding,
            reportType,
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

        // חישוב צמיחה בהכנסות
        const currentRevenue = parseFloat(current.incomeStatement.totalRevenue);
        const previousRevenue = parseFloat(previous.incomeStatement.totalRevenue);
        if (currentRevenue && previousRevenue) {
            current.calculatedMetrics.revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        }

        // חישוב צמיחה ברווח נקי
        const currentNetIncome = parseFloat(current.incomeStatement.netIncome);
        const previousNetIncome = parseFloat(previous.incomeStatement.netIncome);
        if (currentNetIncome && previousNetIncome && previousNetIncome !== 0) {
            current.calculatedMetrics.netIncomeGrowth = ((currentNetIncome - previousNetIncome) / previousNetIncome) * 100;
        }

        // חישוב צמיחה ב-EPS
        const currentEPS = parseFloat(current.earnings.reportedEPS);
        const previousEPS = parseFloat(previous.earnings.reportedEPS);
        if (currentEPS && previousEPS && previousEPS !== 0) {
            current.calculatedMetrics.epsGrowth = ((currentEPS - previousEPS) / previousEPS) * 100;
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

    const latest = enhancedReports[0].calculatedMetrics;
    console.log(`Year: ${enhancedReports[0].year}`);

    console.log('\nProfitability:');
    console.log(`  Gross Profit Margin: ${latest.grossProfitMargin?.toFixed(2)}%`);
    console.log(`  Operating Margin: ${latest.operatingMargin?.toFixed(2)}%`);
    console.log(`  Net Profit Margin: ${latest.netProfitMargin?.toFixed(2)}%`);
    console.log(`  ROA: ${latest.returnOnAssets?.toFixed(2)}%`);
    console.log(`  ROE: ${latest.returnOnEquity?.toFixed(2)}%`);

    console.log('\nLiquidity:');
    console.log(`  Current Ratio: ${latest.currentRatio?.toFixed(2)}`);
    console.log(`  Quick Ratio: ${latest.quickRatio?.toFixed(2)}`);
    console.log(`  Working Capital: $${(latest.workingCapital / 1e9)?.toFixed(2)}B`);

    console.log('\nLeverage:');
    console.log(`  Debt-to-Equity: ${latest.debtToEquity?.toFixed(2)}`);
    console.log(`  Debt-to-Assets: ${latest.debtToAssets?.toFixed(2)}`);
    console.log(`  Equity Ratio: ${latest.equityRatio?.toFixed(2)}`);

    console.log('\nGrowth:');
    console.log(`  Revenue Growth: ${latest.revenueGrowth?.toFixed(2)}%`);
    console.log(`  Net Income Growth: ${latest.netIncomeGrowth?.toFixed(2)}%`);
    console.log(`  EPS Growth: ${latest.epsGrowth?.toFixed(2)}%`);
}

// ========================================
// פונקציה ראשית
// ========================================

/**
 * פונקציה ראשית למשיכת וניתוח נתונים פיננסיים
 * @param {string} symbol - סימבול המניה
 * @returns {Promise<Object|null>} - הנתונים המלאים או null במקרה של שגיאה
 */
export async function getFinancials(symbol) {
    try {
        // בדיקת cache תחילה
        const cachedData = getCachedData(symbol);
        if (cachedData) {
            console.log('✅ Using cached data!');
            return cachedData;
        }

        console.log('🔄 Fetching fresh data from API...');

        // שלב 1: משיכת כל הנתונים מ-API
        const rawData = await fetchAllFinancialData(symbol);

        // שלב 2: בדיקת שגיאות
        const hasErrors = checkForErrors(rawData);
        if (hasErrors) {
            return null;
        }

        console.log('\n=== ENHANCED FINANCIAL STATEMENTS ===');
        console.log(`Symbol: ${symbol}`);
        console.log(`Currency: USD (in Billions)\n`);

        // שלב 3: עיבוד דוחות שנתיים
        console.log('\n📅 Processing ANNUAL reports...');
        const annualReportsData = extractReportsAndYears(rawData, 'annual');
        const annualEnhancedReports = createEnhancedReports(annualReportsData);
        calculateGrowthMetrics(annualEnhancedReports);

        // שלב 4: עיבוד דוחות רבעוניים
        console.log('\n📅 Processing QUARTERLY reports...');
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
        console.log('\n✅ Data retrieved successfully!');
        console.log(`📊 Annual periods available: ${annualEnhancedReports.length}`);
        console.log(`📊 Quarterly periods available: ${quarterlyEnhancedReports.length}`);
        console.log(`📈 Enhanced metrics calculated for both report types`);

        // שלב 7: שמירה לקובץ
        saveToFile(fullData, symbol);

        // שלב 8: הדפסת סיכום מדדים (רק לשנתי)
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

// Run directly from command line (uncomment to use):
// console.log('Alpha Vantage Enhanced Financial Data Fetcher');
// console.log('==============================================\n');
// console.log('Note: Free API key allows 5 requests per minute and 500 per day');
// console.log('Get your free API key at: https://www.alphavantage.co/support/#api-key\n');
// getFinancials('CRM');

// Or run the web server with: node server.js
