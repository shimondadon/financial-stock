# עדכון תקופת תוקף Cache לחודש

## סיכום השינויים

עודכנה תקופת התוקף של נתוני ה-cache מ-**יום אחד (24 שעות)** ל-**חודש אחד (30 ימים / 720 שעות)**.

## קבצים שעודכנו

### 1. `.env` - קובץ הגדרות סביבה
```env
# לפני:
CACHE_EXPIRATION_HOURS=24

# אחרי:
CACHE_EXPIRATION_HOURS=720
```

### 2. `models/FinancialData.js` - MongoDB Model
עודכנה ברירת המחדל של TTL (Time To Live) index:
```javascript
// לפני:
expireAfterSeconds: parseInt(process.env.CACHE_EXPIRATION_HOURS || 24) * 3600

// אחרי:
expireAfterSeconds: parseInt(process.env.CACHE_EXPIRATION_HOURS || 720) * 3600
```

### 3. `mongoCache.js` - MongoDB Cache Manager
עודכנה ברירת המחדל בשני מקומות:
- פונקציה `getFromCache()` - שורה 92
- פונקציה `isCacheValid()` - שורה 130

```javascript
// לפני:
const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 24);

// אחרי:
const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 720); // 720 hours = 30 days
```

### 4. `fileCache.js` - File-based Cache Manager
עודכנה ברירת המחדל בשני מקומות:
- פונקציה `getFromCache()` - שורה 57
- פונקציה `isCacheValid()` - שורה 93

```javascript
// לפני:
const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 24);

// אחרי:
const expirationHours = parseInt(process.env.CACHE_EXPIRATION_HOURS || 720); // 720 hours = 30 days
```

## השפעת השינויים

### ✅ יתרונות
1. **פחות קריאות API** - חיסכון ב-rate limits של Alpha Vantage
2. **ביצועים טובים יותר** - המידע נטען מהיר יותר מה-cache
3. **חיסכון בעלויות** - פחות קריאות API = פחות סיכוי לחריגה מהמכסה החינמית
4. **נתונים זמינים זמן רב יותר** - גם כשה-API לא זמין

### ⚠️ שיקולים
1. **עדכניות מידע** - נתונים פיננסיים יהיו בני עד חודש
   - בדרך כלל דוחות פיננסיים מתפרסמים רבעונית, אז חודש הוא סביר
2. **שטח אחסון** - יותר מידע יישמר ב-MongoDB/File system
   - אבל המידע קטן יחסית, כך שזה לא צריך להוות בעיה

## איך לשנות את התקופה?

אם תרצה לשנות את תקופת התוקף בעתיד, פשוט ערוך את הקובץ `.env`:

```env
# דוגמאות:
CACHE_EXPIRATION_HOURS=24     # יום אחד
CACHE_EXPIRATION_HOURS=168    # שבוע אחד
CACHE_EXPIRATION_HOURS=720    # חודש אחד (30 ימים) ✅ נוכחי
CACHE_EXPIRATION_HOURS=2160   # 3 חודשים (90 ימים)
CACHE_EXPIRATION_HOURS=8760   # שנה אחת (365 ימים)
```

לאחר העדכון, הפעל מחדש את השרת:
```bash
node server.js
```

## בדיקה

כדי לבדוק שהשינוי עבד:
1. הפעל את השרת
2. משוך מידע עבור סימבול מניה
3. בקונסול השרת תראה הודעות כמו:
   ```
   ✅ Found income data for AAPL in MongoDB cache (age: 15h)
   ```
4. המידע יישמר עכשיו למשך 30 ימים במקום 24 שעות

## מעקב אחר תוקף Cache

הלוגים של השרת יראו את גיל ה-cache בשעות:
- `age: 2h` - מידע בן שעתיים
- `age: 48h` - מידע בן יומיים
- `age: 720h` - מידע בן חודש (יפוג בקרוב)
- `⏰ Cache expired` - המידע פג תוקפו ונמחק

---

**תאריך עדכון:** 12 בינואר 2026
**סטטוס:** ✅ הושלם בהצלחה

