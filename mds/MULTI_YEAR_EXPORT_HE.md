# תיעוד שינויים - ייצוא רב-שנתי לאקסל

## סיכום השינויים

### מה השתנה?

#### לפני השינוי ❌
- ייצוא לאקסל הציג **רק שנה אחת** (האחרונה) לכל מניה
- **שורה אחת** לכל מניה
- מספרים גדולים הוצגו בסימון מדעי (3.91E+08)
- **לא היו שמות שדות** (field names) בשורה 2

#### אחרי השינוי ✅
- ייצוא לאקסל מציג **מספר שנים** לכל מניה (לבחירת המשתמש)
- **שורה נפרדת לכל שנה** עבור כל מניה
- מספרים גדולים מוצגים כמו שצריך (391,035,000)
- **יש שמות שדות מלאים** בשורה 2

---

## מבנה הקובץ החדש

### שלוש שורות כותרת:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Row 1: Income Statement | Balance Sheet | Cash Flow | Metrics...   │  ← קטגוריות
├─────────────────────────────────────────────────────────────────────┤
│ Row 2: Symbol | Year | Total_Revenue | Gross_Profit | EPS...       │  ← שמות השדות
├─────────────────────────────────────────────────────────────────────┤
│ Row 3: AAPL | 2024 | 391,035,000 | 169,148,000 | 6.11...          │  ← נתונים
│ Row 4: AAPL | 2023 | 383,285,000 | 169,148,000 | 6.16...          │
│ Row 5: AAPL | 2022 | 394,328,000 | 170,782,000 | 6.11...          │
│ Row 6: MSFT | 2024 | 211,915,000 | 146,052,000 | 11.80...         │
│ Row 7: MSFT | 2023 | 198,270,000 | 135,620,000 | 9.72...          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## התוספות לממשק המשתמש

### 1. בוחר מספר שנים

נוסף שדה קלט למספר השנים:

```
┌──────────────────────────────────────────┐
│  📊 Export All Database Data             │
│                                          │
│  📅 Number of years back (default: 20)   │
│  ┌────┐                                  │
│  │ 20 │  ← שדה קלט (1-30)               │
│  └────┘                                  │
│                                          │
│  [📥 Download Excel Export]              │
└──────────────────────────────────────────┘
```

### 2. ברירת מחדל
- **20 שנים** - אם המשתמש לא משנה
- **מינימום**: 1 שנה
- **מקסימום**: 30 שנה

---

## דוגמאות לשימוש

### דוגמה 1: ניתוח 5 שנים אחרונות
```
הגדרה: 5 שנים
תוצאה: כל מניה תציג 5 שורות (2020-2024)

AAPL | 2024 | ...
AAPL | 2023 | ...
AAPL | 2022 | ...
AAPL | 2021 | ...
AAPL | 2020 | ...
MSFT | 2024 | ...
MSFT | 2023 | ...
...
```

### דוגמה 2: רק השנה האחרונה
```
הגדרה: 1 שנה
תוצאה: כל מניה תציג שורה אחת (2024)

AAPL | 2024 | ...
MSFT | 2024 | ...
CRM  | 2024 | ...
```

### דוגמה 3: היסטוריה מלאה
```
הגדרה: 30 שנה
תוצאה: כל מניה תציג עד 30 שנים (כמה שיש)

AAPL | 2024 | ...
AAPL | 2023 | ...
...
AAPL | 1995 | ...  ← עד כמה שיש נתונים זמינים
```

---

## השדות המופיעים בשורה 2

### קטגוריה: Income Statement
- Total_Revenue
- Gross_Profit
- Operating_Income
- Net_Income
- EBITDA
- EPS

### קטגוריה: Balance Sheet
- Total_Assets
- Current_Assets
- Total_Liabilities
- Current_Liabilities
- Long_Term_Debt
- Shareholder_Equity

### קטגוריה: Cash Flow
- Cash_Equivalents
- Operating_Cash_Flow
- Capital_Expenditures
- Free_Cash_Flow
- Investing_Cash_Flow
- Financing_Cash_Flow

### קטגוריה: Metrics (מדדים מחושבים)
- Gross_Profit_Margin
- Operating_Margin
- Net_Profit_Margin
- ROA (Return on Assets)
- ROE (Return on Equity)
- EBITDA_Margin
- Current_Ratio
- Quick_Ratio
- Debt_to_Equity
- Debt_to_Assets
- Asset_Turnover
- Revenue_Growth_YoY (צמיחה שנתית בהכנסות)
- Net_Income_Growth_YoY (צמיחה שנתית ברווח נקי)
- EPS_Growth_YoY (צמיחה שנתית ב-EPS)

### קטגוריה: Company Info
- Company_Name
- Sector
- Industry
- Market_Cap
- PE_Ratio
- Dividend_Yield

---

## תיקון בעיות תצוגה

### ✅ תוקן: סימון מדעי
**לפני**: `3.91E+08`  
**אחרי**: `391,035,000`

### ✅ תוקן: חסרו שמות שדות
**לפני**: 
```
Row 1: [Categories merged]
Row 2: [Empty or data]
Row 3: [Data]
```

**אחרי**:
```
Row 1: [Categories merged]
Row 2: Symbol | Year | Total_Revenue | Gross_Profit | ...
Row 3: AAPL | 2024 | 391,035,000 | 169,148,000 | ...
```

### ✅ תוקן: שורה כפולה
**לפני**: שתי שורות כותרת זהות  
**אחרי**: שורה אחת של קטגוריות + שורה אחת של שמות שדות

---

## איך להשתמש?

### צעדים:

1. **פתח את האפליקציה**
   ```
   http://localhost:3000
   ```

2. **גלול למטה ל"Export All Database Data"**

3. **בחר מספר שנים**
   - הקלד מספר בין 1 ל-30
   - ברירת מחדל: 20

4. **לחץ על "📥 Download Excel Export"**

5. **פתח את הקובץ באקסל**
   - שם הקובץ: `financial_data_export_2026-01-13.xlsx`

---

## שינויים טכניים

### בצד השרת (`server.js`)

#### 1. פרמטר חדש ב-API
```javascript
GET /api/export/excel?years=10  // מייצא 10 שנים אחרונות
GET /api/export/excel           // מייצא 20 שנים (ברירת מחדל)
```

#### 2. לולאה על שנים
```javascript
// במקום שורה אחת לכל מניה:
for (let i = 0; i < maxYears; i++) {
    // יוצר שורה נפרדת לכל שנה
    consolidatedRows.push(rowForYear);
}
```

#### 3. חישוב צמיחה לפי שנה
```javascript
// מחשב צמיחה YoY בין כל שתי שנים עוקבות
'Revenue_Growth_YoY': calculateYearGrowth(
    incomeReports[i],      // שנה נוכחית
    incomeReports[i + 1],  // שנה קודמת
    'totalRevenue'
)
```

### בצד הקליינט (`index.html`)

#### 1. שדה קלט חדש
```html
<input 
    type="number" 
    id="yearsBackInput" 
    min="1" 
    max="30" 
    value="20"
>
```

#### 2. שליחת הפרמטר ל-API
```javascript
const yearsBack = parseInt(document.getElementById('yearsBackInput').value) || 20;
const response = await fetch(`/api/export/excel?years=${yearsBack}`);
```

---

## בדיקות שבוצעו ✅

- [x] ייצוא עם 20 שנים (ברירת מחדל)
- [x] ייצוא עם שנה אחת
- [x] ייצוא עם 5 שנים
- [x] מבנה כותרות (3 שורות)
- [x] שמות שדות בשורה 2
- [x] ללא סימון מדעי למספרים גדולים
- [x] עיצוב עשרוני למדדים
- [x] שורות מרובות לכל מניה
- [x] חישובי צמיחה YoY לכל שנה

---

## תמיכה

### בעיה: "Excel export is only available when using MongoDB cache"
**פתרון**: הגדר `CACHE_TYPE=mongodb` בקובץ `.env`

### בעיה: פחות שנים ממה שביקשתי
**פתרון**: למניה יש פחות נתונים היסטוריים ב-Alpha Vantage

### בעיה: עדיין יש סימון מדעי
**פתרון**: בדוק שאתה משתמש בקוד המעודכן (עדכון זה)

---

## סיכום יתרונות

✨ **גמישות**: בחירת מספר שנים לפי צורך  
✨ **ברור**: שמות שדות מלאים וקריאים  
✨ **נקי**: מספרים ללא סימון מדעי  
✨ **מפורט**: שורה נפרדת לכל שנה עבור כל מניה  
✨ **מאורגן**: מיון לפי מניה ושנה (חדש לישן)  
✨ **מדויק**: חישובי צמיחה YoY לכל שנה בנפרד  

---

**תאריך עדכון**: 13 ינואר 2026  
**גרסה**: 2.0

