# יצוא מסד נתונים לאקסל - מדריך מהיר 📊

## מה נוסף?

נוסף API חדש שמאפשר לייצא את כל המידע מבסיס הנתונים (MongoDB) לקובץ אקסל אחד.

## איך להשתמש?

### דרך הממשק הגרפי:
1. פתח את האפליקציה בדפדפן
2. חפש את הקופסה הסגולה עם הכיתוב "📊 Export All Database Data"
3. לחץ על הכפתור "📥 Download Excel Export"
4. הקובץ יורד אוטומטית למחשב שלך

### דרך API:
```
GET http://localhost:3000/api/export/excel
```

## מה כולל קובץ האקסל?

### 1. גיליון סיכום (Summary)
מכיל טבלה עם כל הרשומות במסד הנתונים:
- Symbol (סימול המניה)
- Report Type (סוג הדוח)
- Created At (תאריך יצירה)
- Updated At (תאריך עדכון)
- Has Data (האם יש מידע)

### 2. גיליונות נתונים
לכל מניה וסוג דוח יש גיליון נפרד:
- `AAPL_income` - דוח רווח והפסד של אפל
- `MSFT_balance` - מאזן של מיקרוסופט
- `CRM_cashflow` - תזרים מזומנים של Salesforce
- וכו'...

## דרישות

### חובה להשתמש ב-MongoDB:
הפיצ'ר עובד רק עם MongoDB. ודא שב-`.env` יש:
```
CACHE_TYPE=mongodb
MONGODB_URI=כתובת_החיבור_שלך
```

### חבילות מותקנות:
- ✅ `xlsx` - כבר הותקן אוטומטית
- ✅ `mongoose` - כבר קיים בפרויקט

## קבצים ששונו

### 1. server.js
נוספו:
- ייבוא חבילת `xlsx`
- ייבוא המודל `FinancialData`
- API endpoint חדש: `/api/export/excel`
- פונקציה עזר: `flattenObject()` - להמרת אובייקטים מקוננים

### 2. index.html
נוספו:
- סקשן חדש בממשק (קופסה סגולה)
- כפתור "📥 Download Excel Export"
- פונקציה JavaScript: `exportToExcel()`

### 3. קבצי תיעוד
נוצרו:
- `mds/EXCEL_EXPORT_FEATURE.md` - תיעוד מלא באנגלית
- `mds/EXCEL_EXPORT_HEBREW_GUIDE.md` - המדריך הזה

## איך זה עובד?

### שרת (Server):
1. מקבל בקשה ל-`/api/export/excel`
2. מתחבר ל-MongoDB
3. מושך את כל הנתונים מהטבלה `FinancialData`
4. יוצר קובץ אקסל עם גיליונות מרובים
5. שולח את הקובץ להורדה

### לקוח (Client):
1. לוחץ על כפתור
2. קורא ל-API
3. מקבל את הקובץ
4. מתחיל הורדה אוטומטית

## דוגמת שימוש ב-JavaScript

```javascript
async function downloadDatabase() {
    const response = await fetch('/api/export/excel');
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_data.xlsx';
    a.click();
}
```

## שגיאות נפוצות ופתרונות

### "Excel export is only available when using MongoDB cache"
**בעיה:** השרת לא משתמש ב-MongoDB  
**פתרון:** שנה ב-`.env` את `CACHE_TYPE=mongodb`

### "No data found in database"
**בעיה:** אין מידע במסד הנתונים  
**פתרון:** תחילה תבצע שאילתות למניות כדי שיישמר מידע במסד הנתונים

### "MongoDB connection error"
**בעיה:** אין חיבור ל-MongoDB  
**פתרון:** בדוק שה-`MONGODB_URI` תקין ב-`.env`

## מבנה קובץ האקסל שנוצר

```
financial_data_export_2026-01-13.xlsx
├── Summary (גיליון סיכום)
├── AAPL_income (דוח רווח והפסד - אפל)
├── AAPL_balance (מאזן - אפל)
├── AAPL_cashflow (תזרים מזומנים - אפל)
├── AAPL_earnings (רווחים - אפל)
├── AAPL_overview (סקירה כללית - אפל)
├── MSFT_income (דוח רווח והפסד - מיקרוסופט)
└── ... (ועוד)
```

## בדיקה שהכל עובד

להפעיל את השרת:
```bash
npm start
```

לפתוח בדפדפן:
```
http://localhost:3000
```

לבדוק ישירות את ה-API:
```
http://localhost:3000/api/export/excel
```

## טיפים

1. **גיבוי אוטומטי**: השתמש בפיצ'ר הזה לגיבוי תקופתי של המידע
2. **בדיקת נתונים**: בדוק תחילה את גיליון ה-Summary לוודא שכל המידע שם
3. **שם הקובץ**: כולל את התאריך, קל למיון ולמעקב
4. **גיליונות**: כל מניה וסוג דוח בגיליון נפרד - קל לניווט

## דוגמאות שימוש

### דוגמה 1: הורדה רגילה
1. לחץ על הכפתור
2. הקובץ יורד
3. פתח באקסל
4. סיימת!

### דוגמה 2: הורדה מתוכנתת
```javascript
// הורד כל יום בחצות
setInterval(() => {
    exportToExcel();
}, 24 * 60 * 60 * 1000);
```

### דוגמה 3: שליחה למייל (עתידי)
```javascript
// עתידי - שילוב עם שרת מייל
async function exportAndEmail() {
    const excelFile = await fetch('/api/export/excel');
    await sendEmail(excelFile);
}
```

## מה הלאה?

שיפורים אפשריים:
- [ ] סינון לפי תאריכים
- [ ] בחירת מניות ספציפיות
- [ ] פורמט CSV
- [ ] שליחה למייל אוטומטית
- [ ] העלאה לענן (Google Drive, Dropbox)

## תמיכה

אם יש בעיות:
1. בדוק את ה-logs של השרת
2. בדוק את ה-console של הדפדפן (F12)
3. וודא שיש חיבור ל-MongoDB
4. בדוק את קובץ ה-`.env`

## סיכום

✅ **הותקן**: חבילת xlsx  
✅ **נוסף**: API endpoint חדש  
✅ **נוסף**: כפתור בממשק  
✅ **נוסף**: פונקציות JavaScript  
✅ **נוצר**: תיעוד מלא  

הכל מוכן לשימוש! 🎉

