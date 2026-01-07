import fetch from 'node-fetch';
import fs from 'fs';

// ========================================
// הגדרות גלובליות
// ========================================
const API_KEY = 'TT0O07L0Y7DO2PHV'; // ה-API key שלך
const BASE_URL = 'https://www.alphavantage.co/query';

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
    console.log('Fetching Income Statement...');
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
 * חילוץ דוחות שנתיים ושנים זמינות
 * @param {Object} data - אובייקט עם כל הנתונים
 * @returns {Object} - דוחות ושנים זמינות
 */
function extractReportsAndYears(data) {
    const { incomeData, balanceData, cashFlowData, earningsData } = data;

    const incomeReports = incomeData.annualReports || [];
    const balanceReports = balanceData.annualReports || [];
    const cashFlowReports = cashFlowData.annualReports || [];
    const earningsReports = earningsData.annualEarnings || [];

    const incomeYears = incomeReports.map(r => r.fiscalDateEnding?.substring(0, 4));
    const balanceYears = balanceReports.map(r => r.fiscalDateEnding?.substring(0, 4));
    const cashFlowYears = cashFlowReports.map(r => r.fiscalDateEnding?.substring(0, 4));
    const earningsYears = earningsReports.map(r => r.fiscalDateEnding?.substring(0, 4));

    const years = [...new Set([...incomeYears, ...balanceYears, ...cashFlowYears, ...earningsYears])].sort();

    // הדפסת סיכום
    console.log('\n=== Available Years ===');
    console.log(`Income Statement: ${incomeReports.length} years`);
    console.log(`Balance Sheet: ${balanceReports.length} years`);
    console.log(`Cash Flow: ${cashFlowReports.length} years`);
    console.log(`Earnings: ${earningsReports.length} years`);
    console.log(`Income years: ${incomeYears.join(', ')}`);
    console.log(`Balance years: ${balanceYears.join(', ')}`);
    console.log(`Cash Flow years: ${cashFlowYears.join(', ')}`);
    console.log(`Earnings years: ${earningsYears.join(', ')}`);

    return {
        incomeReports,
        balanceReports,
        cashFlowReports,
        earningsReports,
        incomeYears,
        balanceYears,
        cashFlowYears,
        earningsYears,
        years
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
 * יצירת דוחות משופרים עם מדדים מחושבים לכל שנה
 * @param {Object} reportsData - כל הדוחות והשנים
 * @returns {Array} - מערך של דוחות משופרים
 */
function createEnhancedReports(reportsData) {
    const { years, incomeReports, balanceReports, cashFlowReports, earningsReports } = reportsData;

    const enhancedReports = years.map(year => {
        const income = incomeReports.find(r => r.fiscalDateEnding?.startsWith(year)) || {};
        const balance = balanceReports.find(r => r.fiscalDateEnding?.startsWith(year)) || {};
        const cashFlow = cashFlowReports.find(r => r.fiscalDateEnding?.startsWith(year)) || {};
        const earnings = earningsReports.find(r => r.fiscalDateEnding?.startsWith(year)) || {};

        return {
            year,
            fiscalDateEnding: income.fiscalDateEnding || balance.fiscalDateEnding || cashFlow.fiscalDateEnding,
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
 * @param {Array} enhancedReports - דוחות משופרים
 * @param {Object} reportsData - נתונים גולמיים
 * @returns {Object} - מבנה נתונים מלא
 */
function createFullDataStructure(symbol, overviewData, enhancedReports, reportsData) {
    return {
        symbol: symbol,
        fetchedAt: new Date().toISOString(),
        companyOverview: overviewData,
        yearsAvailable: reportsData.years.length,
        years: reportsData.years,
        enhancedReports: enhancedReports,
        rawData: {
            incomeStatement: {
                years: reportsData.incomeYears,
                reports: reportsData.incomeReports
            },
            balanceSheet: {
                years: reportsData.balanceYears,
                reports: reportsData.balanceReports
            },
            cashFlow: {
                years: reportsData.cashFlowYears,
                reports: reportsData.cashFlowReports
            },
            earnings: {
                years: reportsData.earningsYears,
                reports: reportsData.earningsReports
            }
        }
    };
}

/**
 * שמירת הנתונים לקובץ JSON
 * @param {Object} fullData - הנתונים המלאים
 * @param {string} symbol - סימבול המניה
 */
function saveToFile(fullData, symbol) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `financial_enhanced_${symbol}_${timestamp}.json`;

    try {
        fs.writeFileSync(filename, JSON.stringify(fullData, null, 2), 'utf8');
        console.log(`\n💾 Enhanced JSON saved to file: ${filename}`);
        console.log(`📁 File size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);
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
        // שלב 1: משיכת כל הנתונים מ-API
        const rawData = await fetchAllFinancialData(symbol);

        // שלב 2: בדיקת שגיאות
        const hasErrors = checkForErrors(rawData);
        if (hasErrors) {
            return null;
        }

        // שלב 3: חילוץ דוחות ושנים
        const reportsData = extractReportsAndYears(rawData);

        console.log('\n=== ENHANCED FINANCIAL STATEMENTS ===');
        console.log(`Symbol: ${symbol}`);
        console.log(`Currency: USD (in Billions)\n`);

        // שלב 4: יצירת דוחות משופרים עם מדדים מחושבים
        const enhancedReports = createEnhancedReports(reportsData);

        // שלב 5: חישוב מדדי צמיחה
        calculateGrowthMetrics(enhancedReports);

        // שלב 6: יצירת מבנה נתונים מלא
        const fullData = createFullDataStructure(
            symbol,
            rawData.overviewData,
            enhancedReports,
            reportsData
        );

        // שלב 7: הדפסת סיכום
        console.log('\n✅ Data retrieved successfully!');
        console.log(`📊 Total years available: ${reportsData.years.length}`);
        console.log(`📈 Enhanced metrics calculated for each year`);

        // שלב 8: שמירה לקובץ
        saveToFile(fullData, symbol);

        // שלב 9: הדפסת סיכום מדדים
        printMetricsSummary(enhancedReports);

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
