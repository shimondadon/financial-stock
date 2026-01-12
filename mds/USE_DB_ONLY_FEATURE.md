# תיעוד: תכונת "Use DB Only"

## סקירה כללית
הוספנו תכונה חדשה שמאפשרת למשתמש לבחור האם למשוך מידע **רק מה-Database** (cache) או לאפשר משיכה מה-API במידת הצורך.

## שינויים שבוצעו

### 1. שינויים ב-HTML (`index.html`)

#### הוספת Checkbox בטופס:
```html
<div class="form-group" style="margin-bottom: 20px;">
    <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
        <input
            type="checkbox"
            id="useDbOnly"
            name="useDbOnly"
            style="width: 20px; height: 20px; margin-right: 10px; cursor: pointer;"
        >
        <span style="font-weight: 500;">📂 Use cached data from DB only (skip API)</span>
    </label>
</div>
```

#### עדכון קוד JavaScript לשליחת הדגל:
```javascript
const useDbOnly = document.getElementById('useDbOnly').checked;

// שליחה לשרת
body: JSON.stringify({ symbol, useDbOnly })
```

#### עדכון הודעות הסטטוס:
- הודעות מותאמות בהתאם למצב `useDbOnly`
- הצגת מקור המידע (DB cache / API) בהודעת ההצלחה

### 2. שינויים בשרת (`server.js`)

#### קבלת דגל `useDbOnly`:
```javascript
const { symbol, useDbOnly = false } = req.body;
```

#### העברת הדגל לפונקציה `getFinancials`:
```javascript
const data = await getFinancials(upperSymbol, useDbOnly);
```

#### טיפול בשגיאות מותאם:
- אם `useDbOnly=true` ואין cache - מוחזרת שגיאה 404 עם הודעה מתאימה
- אם `useDbOnly=false` ויש בעיה - מוחזרת שגיאה 500 כרגיל

### 3. שינויים ב-API (`alphavantage_enhanced.js`)

#### הוספת פרמטר `skipApiIfNotCached`:
```javascript
export async function getFinancials(symbol, skipApiIfNotCached = false)
```

#### לוגיקה מעודכנת:
```javascript
if (cachedData) {
    // יש cache - להשתמש בו
    rawData = cachedData;
} else {
    if (skipApiIfNotCached) {
        // אין cache והדגל מורה לדלג על API
        console.log('⚠️ No cache found and skipApiIfNotCached=true, returning null');
        return null;
    }
    
    // אין cache אבל מותר למשוך מה-API
    rawData = await fetchAllFinancialData(symbol);
    // ...
}
```

#### Export של פונקציה `getCachedData`:
הפונקציה הפכה ל-public למקרה שנצטרך אותה בעתיד.

## איך זה עובד?

### תרחיש 1: משתמש **לא** מסמן את ה-checkbox (ברירת מחדל)
1. השרת מקבל `useDbOnly=false`
2. `getFinancials` נקרא עם `skipApiIfNotCached=false`
3. אם יש cache בתוקף - משתמשים בו ✅
4. אם אין cache - משכים מה-API ✅
5. המשתמש מקבל את המידע בכל מקרה

### תרחיש 2: משתמש **מסמן** את ה-checkbox
1. השרת מקבל `useDbOnly=true`
2. `getFinancials` נקרא עם `skipApiIfNotCached=true`
3. אם יש cache בתוקף - משתמשים בו ✅
4. אם אין cache - מוחזר `null` ❌
5. השרת מחזיר שגיאה 404 עם הודעה:
   ```
   No cached data found for [SYMBOL]. Please uncheck "Use cached data from DB only" to fetch from API.
   ```

## יתרונות התכונה

1. **שליטה מלאה למשתמש** - המשתמש יכול לבחור את מקור המידע
2. **חיסכון בקריאות API** - אפשר למשוך רק מה-cache בתקופת הפיתוח
3. **מהירות** - משיכה מ-DB היא מיידית (ללא המתנה של 60-90 שניות)
4. **שקיפות** - המשתמש יודע בדיוק מאיפה המידע הגיע
5. **אבטחה** - אי אפשר למשוך יותר מדי פעמים מה-API בטעות

## בדיקות מומלצות

### בדיקה 1: מצב רגיל (ללא checkbox)
- [ ] הזן סימבול שכבר קיים ב-cache
- [ ] ודא שהמידע נטען מהר (מ-cache)
- [ ] הודעה: "Success! Data loaded from today's cache"

### בדיקה 2: מצב רגיל עם API
- [ ] הזן סימבול חדש (שלא ב-cache)
- [ ] ודא שהמידע נמשך מה-API (לוקח זמן)
- [ ] הודעה: "Success! Fresh data fetched from API"

### בדיקה 3: DB Only עם cache קיים
- [ ] סמן את ה-checkbox
- [ ] הזן סימבול שכבר קיים ב-cache
- [ ] ודא שהמידע נטען מהר
- [ ] הודעה: "Success! Data loaded from database cache"

### בדיקה 4: DB Only ללא cache
- [ ] סמן את ה-checkbox
- [ ] הזן סימבול חדש (שלא ב-cache)
- [ ] ודא שמתקבלת שגיאה ברורה
- [ ] הודעת שגיאה: "No cached data found for [SYMBOL]..."

## לוגים בקונסול השרת

כשהשרת מקבל בקשה, הוא מדפיס:
```
📊 Processing request for symbol: AAPL
📂 Use DB Only mode: true/false
```

זה מאפשר מעקב נוח אחרי הבקשות ומצבן.

## סיכום
התכונה מאפשרת גמישות מקסימלית ושליטה מלאה על מקור המידע, תוך שמירה על חוויית משתמש פשוטה וברורה.

