# תיעוד: מנגנון החלפת סטי מפתחות API אוטומטי

## 🎯 מטרה

יצירת מערכת חכמה שמזהה אוטומטית שגיאת **"limit is 25 requests per day"** ועוברת לסט מפתחות API שני.

---

## 🔑 ארכיטקטורה

### שני סטים של מפתחות:

```javascript
// סט A - מפתחות ראשיים (5 מפתחות)
const API_KEYS_SET_A = [
    'TT0O07L0Y7DO2PHV',
    'WCP77UX1RF7O4MSG',
    'XAN8JQ0KV40DRKUO',
    '73DEDQ2T9NQD96QG',
    'MZCCU2PIV56DC6RB'
];

// סט B - מפתחות גיבוי (5 מפתחות)
const API_KEYS_SET_B = [
    'OZU0A7HK5EN21J13',
    'VD6SE0D30YSRUL3G',
    '1E4Q7KAMMGXZGWI4',
    'LWYTO43XX5TH4LQ0',
    '6P6D12B4ZFCOT550'
];

// מפתח רזרבי נוסף (11)
const API_KEY_RESERVE = 'UX624YT2RK2EMVMU';
```

**סך הכל:** 11 מפתחות (5 + 5 + 1 רזרבי)

---

## 🔄 איך זה עובד?

### תרחיש רגיל:
```
1. התחלה → משתמש בסט A
2. כל קריאה API → מפתח אחר מהסט (rotation)
3. כל העבודה עם סט A → הכל תקין ✅
```

### תרחיש עם שגיאת מכסה:
```
1. משתמש בסט A
2. קריאה API → מחזיר שגיאה "limit is 25 requests per day" ❌
3. המערכת מזהה את השגיאה אוטומטית 🔍
4. עוברת לסט B אוטומטית 🔄
5. מנסה שוב עם סט B → הצלחה ✅
```

### תרחיש קיצוני - שני הסטים נגמרו:
```
1. סט A → שגיאת מכסה
2. עובר לסט B
3. סט B → גם שגיאת מכסה
4. מחזיר שגיאה למשתמש: "Rate limit exceeded on both sets" 🚫
```

---

## 🛠️ רכיבי המערכת

### 1. מעקב אחר הסט הנוכחי

```javascript
let currentApiKeySet = 'A';      // 'A' או 'B'
let apiKeySwitchCount = 0;       // כמה פעמים החלפנו
let currentKeyIndex = 0;         // מיקום במערך המפתחות
```

### 2. פונקציה: `getCurrentApiKeySet()`

מחזירה את המערך של הסט הנוכחי.

```javascript
function getCurrentApiKeySet() {
    return currentApiKeySet === 'A' ? API_KEYS_SET_A : API_KEYS_SET_B;
}
```

### 3. פונקציה: `getNextApiKey()`

מחזירה את המפתח הבא מהסט (rotation).

```javascript
function getNextApiKey() {
    const keySet = getCurrentApiKeySet();
    const key = keySet[currentKeyIndex % keySet.length];
    currentKeyIndex++;
    return key;
}
```

**דוגמה:**
```
קריאה 1 → מפתח 0 מסט A
קריאה 2 → מפתח 1 מסט A
קריאה 3 → מפתח 2 מסט A
...
קריאה 6 → מפתח 0 מסט A (חזרה להתחלה)
```

### 4. פונקציה: `switchApiKeySet()`

מחליפה בין סט A לסט B.

```javascript
function switchApiKeySet() {
    const oldSet = currentApiKeySet;
    currentApiKeySet = currentApiKeySet === 'A' ? 'B' : 'A';
    apiKeySwitchCount++;
    
    console.log(`⚠️ ========================================`);
    console.log(`🔄 SWITCHING API KEY SET: ${oldSet} → ${currentApiKeySet}`);
    console.log(`📊 Switch count: ${apiKeySwitchCount}`);
    console.log(`🔑 Now using ${getCurrentApiKeySet().length} keys from Set ${currentApiKeySet}`);
    console.log(`⚠️ ========================================`);
    
    return currentApiKeySet;
}
```

### 5. פונקציה: `isRateLimitError(data)`

בודקת אם התגובה מציינת שגיאת מכסה.

```javascript
function isRateLimitError(data) {
    if (!data) return false;
    
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
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
```

**בדיקת דפוסים:**
- `limit is 25 requests per day` ← מדויק
- `Thank you for using Alpha Vantage` ← הודעת שגיאה נפוצה
- `rate limit` ← כללי

---

## 🚀 פונקציה מרכזית: `fetchAllFinancialData()`

### מבנה:

```javascript
async function fetchAllFinancialData(symbol, isRetry = false) {
    await waitForApiAvailability(symbol);

    try {
        console.log(`🔑 Using API Key Set: ${currentApiKeySet}`);

        // קריאה 1: Income Statement
        const incomeData = await fetch(..., apikey=${getNextApiKey()});
        
        if (isRateLimitError(incomeData)) {
            if (!isRetry) {
                switchApiKeySet();
                releaseApiLock();
                return await fetchAllFinancialData(symbol, true); // ניסיון חוזר
            } else {
                throw new Error('Rate limit exceeded on both sets');
            }
        }

        // קריאה 2: Balance Sheet
        // ... אותו מנגנון
        
        // קריאה 3: Cash Flow
        // ... אותו מנגנון
        
        // קריאה 4: Earnings
        // ... אותו מנגנון
        
        // קריאה 5: Overview
        // ... אותו מנגנון

        return { incomeData, balanceData, ... };
        
    } catch (error) {
        throw error;
    } finally {
        releaseApiLock();
    }
}
```

### תזרים לוגי:

```
┌─────────────────────────┐
│ התחל משיכה              │
│ isRetry = false         │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ קריאה 1: Income         │
│ עם מפתח מסט A           │
└──────────┬──────────────┘
           │
           ▼
      [בדיקת שגיאה]
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 ✅ OK         ❌ Rate Limit
    │             │
    │             ▼
    │      [isRetry?]
    │             │
    │      ┌──────┴──────┐
    │      │             │
    │      ▼             ▼
    │   false         true
    │      │             │
    │      ▼             ▼
    │  Switch Set    Throw Error
    │      │
    │      ▼
    │  Call Again
    │  (isRetry=true)
    │      │
    └──────┴─────► [המשך...]
```

---

## 📊 לוגים בקונסול

### שימוש רגיל בסט A:
```
🚀 Starting API fetch for AAPL...
🔑 Using API Key Set: A
⏱️ Estimated time: ~65 seconds
Fetching Income Statement...
Fetching Balance Sheet...
Fetching Cash Flow...
Fetching Earnings...
Fetching Company Overview...
✅ Successfully fetched all data for AAPL using Set A
```

### החלפה לסט B:
```
🚀 Starting API fetch for MSFT...
🔑 Using API Key Set: A
Fetching Income Statement...
❌ Rate limit error detected in Income Statement!

⚠️ ========================================
🔄 SWITCHING API KEY SET: A → B
📊 Switch count: 1
🔑 Now using 5 keys from Set B
⚠️ ========================================

🔄 Retrying with Set B...
🚀 Starting API fetch for MSFT...
🔑 Using API Key Set: B
Fetching Income Statement...
✅ Success!
```

### שני הסטים נגמרו:
```
🚀 Starting API fetch for IBM...
🔑 Using API Key Set: A
Fetching Income Statement...
❌ Rate limit error detected!
🔄 Switching to Set B...

🚀 Starting API fetch for IBM...
🔑 Using API Key Set: B
Fetching Income Statement...
❌ Rate limit error detected!
❌ Error: Rate limit exceeded on both API key sets. Please try again tomorrow.
```

---

## 🌐 API Endpoint: `/api/status`

### בקשה:
```bash
GET http://localhost:3000/api/status
```

### תגובה:
```json
{
  "success": true,
  "api": {
    "isLocked": false,
    "currentSymbol": null,
    "queueLength": 0,
    "queuedSymbols": [],
    "cooldownRemaining": 0,
    "available": true
  },
  "apiKeys": {
    "currentSet": "A",
    "setAKeys": 5,
    "setBKeys": 5,
    "switchCount": 0,
    "totalKeys": 10,
    "currentKeyIndex": 3
  },
  "timestamp": "2026-01-12T12:00:00.000Z"
}
```

### שדות `apiKeys`:
- **currentSet** - איזה סט בשימוש ('A' או 'B')
- **setAKeys** - כמה מפתחות בסט A
- **setBKeys** - כמה מפתחות בסט B
- **switchCount** - כמה פעמים החלפנו סט
- **totalKeys** - סך כל המפתחות הזמינים
- **currentKeyIndex** - איזה מפתח בסט (0-4)

---

## 🎯 יתרונות

### ✅ אוטומציה מלאה
- המערכת מזהה שגיאה ועוברת לסט אחר **אוטומטית**
- אין צורך בהתערבות ידנית

### ✅ נסיונות חוזרים חכמים
- ניסיון אחד עם סט A
- ניסיון אחד עם סט B
- אם שניהם נכשלו → שגיאה ברורה

### ✅ ניצול מלא של כל המפתחות
- Rotation בתוך כל סט
- 10 מפתחות פעילים (5×2)
- מפתח רזרבי לעתיד

### ✅ שקיפות מלאה
- לוגים מפורטים על כל החלפה
- API endpoint מראה סטטוס נוכחי
- ספירת החלפות

### ✅ מניעת בזבוז
- לא מנסה אותו סט פעמיים
- עובר מיד לסט השני
- חוסך זמן וקריאות מיותרות

---

## 📈 חישובי קיבולת

### מכסה יומית לכל מפתח:
```
25 קריאות ליום
```

### סך הכל קיבולת (2 סטים):
```
סט A: 5 מפתחות × 25 = 125 קריאות/יום
סט B: 5 מפתחות × 25 = 125 קריאות/יום
────────────────────────────────────────
סה"כ: 250 קריאות/יום
```

### משיכת סימבול אחד:
```
5 קריאות API (Income, Balance, Cash Flow, Earnings, Overview)
```

### מספר סימבולים ביום:
```
250 קריאות ÷ 5 = 50 סימבולים מלאים ליום! 🎉
```

**זה יותר מספיק!**

---

## 🧪 בדיקות מומלצות

### ✅ בדיקה 1: שימוש רגיל
1. הפעל את השרת
2. משוך מידע לסימבול
3. **צפוי:** משתמש בסט A, הכל עובד

### ✅ בדיקה 2: סימולציה של שגיאת מכסה
כדי לבדוק את המנגנון, זמנית שנה את `isRateLimitError()`:
```javascript
function isRateLimitError(data) {
    return true; // כופה שגיאה לבדיקה
}
```
**צפוי:** עובר מיד לסט B

### ✅ בדיקה 3: בדיקת `/api/status`
```bash
GET http://localhost:3000/api/status
```
**צפוי:** מראה `currentSet: "A"` בהתחלה

### ✅ בדיקה 4: מעקב אחר החלפות
משוך מספר סימבולים ובדוק:
```javascript
{
  "apiKeys": {
    "switchCount": 0  // אמור להישאר 0 אם אין שגיאות
  }
}
```

---

## 🔧 הגדרות מתקדמות

### הוספת מפתחות נוספים:

```javascript
// הוסף למערך הרצוי:
const API_KEYS_SET_A = [
    'KEY1',
    'KEY2',
    'KEY3',
    'KEY4',
    'KEY5',
    'KEY6'  // ← חדש
];
```

### שינוי דפוסי שגיאה:

```javascript
function isRateLimitError(data) {
    const errorPatterns = [
        'limit is 25 requests per day',
        'custom error message',  // ← הוסף דפוס משלך
    ];
    // ...
}
```

### שימוש במפתח רזרבי:

אם צריך להשתמש במפתח ה-11 (רזרבי):
```javascript
const API_KEYS_SET_B = [
    // ... מפתחות קיימים
    API_KEY_RESERVE  // ← הוסף לאחד הסטים
];
```

---

## 📊 מעקב וניטור

### לוגים חשובים לחפש:

#### החלפת סט:
```
🔄 SWITCHING API KEY SET: A → B
```

#### שגיאת מכסה:
```
❌ Rate limit error detected in [Report Type]!
```

#### כישלון בשני הסטים:
```
❌ Rate limit exceeded on both API key sets
```

### שאילתת סטטוס:
```javascript
// ב-Node.js או דפדפן:
fetch('http://localhost:3000/api/status')
    .then(r => r.json())
    .then(data => {
        console.log('Current Set:', data.apiKeys.currentSet);
        console.log('Switches:', data.apiKeys.switchCount);
    });
```

---

## ⚠️ התרעות חשובות

### 1. מכסה יומית מתאפסת ב-00:00 UTC
```
כל 24 שעות המפתחות "מתרעננים"
```

### 2. אל תחשוף מפתחות בקוד ציבורי
```javascript
// ✅ טוב - משתנה סביבה:
const API_KEY = process.env.API_KEY;

// ❌ רע - קוד קשיח:
const API_KEY = 'TT0O07L0Y7DO2PHV';
```

### 3. מעקב אחר שימוש
בדוק באתר Alpha Vantage כמה קריאות נשארו

---

## 🎉 סיכום

המערכת מספקת:

✅ **2 סטים של מפתחות** - גיבוי אוטומטי  
✅ **זיהוי שגיאות חכם** - מזהה מכסה מלאה  
✅ **החלפה אוטומטית** - עובר לסט השני  
✅ **250 קריאות/יום** - 50 סימבולים מלאים!  
✅ **שקיפות מלאה** - לוגים ו-API endpoint  
✅ **אמינות גבוהה** - טיפול בכל תרחיש  

**המערכת מוכנה לייצור! 🚀**

---

**תאריך יצירה:** 12 בינואר 2026  
**גרסה:** 1.0  
**סטטוס:** ✅ פעיל ומוכן

