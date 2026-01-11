# MongoDB Cloud Setup Guide - מדריך הגדרת MongoDB

## שלב 1: יצירת חשבון MongoDB Atlas (חינם)

1. גש לאתר: https://www.mongodb.com/cloud/atlas/register
2. הירשם עם אימייל או Google/GitHub
3. בחר באופציה **FREE** (M0 Sandbox) - זה מספיק לפרויקט שלך
4. בחר **Provider**: AWS, **Region**: קרוב אליך (לדוגמה: Frankfurt או US-East)
5. תן שם ל-Cluster (לדוגמה: `FinancialData`)

## שלב 2: הגדרת אבטחה

### 2.1 יצירת משתמש למסד הנתונים

1. לחץ על **Database Access** בתפריט השמאלי
2. לחץ **Add New Database User**
3. בחר **Password** authentication
4. הזן:
   - Username: `financial_user` (או שם אחר)
   - Password: צור סיסמה חזקה (לדוגמה: `FinPass2026!`)
   - **שמור את השם משתמש והסיסמה - תצטרך אותם!**
5. תחת **Database User Privileges** בחר: `Read and write to any database`
6. לחץ **Add User**

### 2.2 הגדרת גישה לרשת (Network Access)

1. לחץ על **Network Access** בתפריט השמאלי
2. לחץ **Add IP Address**
3. לחץ **Allow Access from Anywhere** (או הזן את ה-IP שלך)
4. לחץ **Confirm**

## שלב 3: קבלת Connection String

1. חזור ל-**Database** (לחץ על Database בתפריט)
2. ליד ה-Cluster שלך, לחץ **Connect**
3. בחר **Connect your application**
4. בחר:
   - Driver: **Node.js**
   - Version: **5.5 or later**
5. העתק את ה-**connection string** - זה נראה כך:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## שלב 4: עדכון קובץ .env

1. פתח את הקובץ `.env` בפרויקט שלך
2. החלף את הערכים:
   - `<username>` - עם שם המשתמש שיצרת (לדוגמה: `financial_user`)
   - `<password>` - עם הסיסמה שיצרת
   - `<cluster-url>` - עם ה-URL של ה-Cluster (הכל אחרי @ ולפני /?)

### דוגמה:

לפני:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
```

אחרי:
```
MONGODB_URI=mongodb+srv://financial_user:FinPass2026!@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

**חשוב**: אם הסיסמה מכילה תווים מיוחדים (@, :, /, וכו'), צריך לעשות להם URL encoding:
- @ → %40
- : → %3A
- / → %2F

## שלב 5: בדיקת החיבור

1. הרץ את השרת:
   ```bash
   node server.js
   ```

2. אם החיבור הצליח, תראה:
   ```
   ✅ Successfully connected to MongoDB
   📊 MongoDB Cache Statistics:
      Total entries: 0
      Unique symbols: 0
   ```

3. אם יש שגיאה, בדוק:
   - שהסיסמה והשם משתמש נכונים
   - שהגדרת Network Access ל-"Allow from Anywhere"
   - שעשית URL encoding לתווים מיוחדים בסיסמה

## שלב 6: שימוש

המערכת תעבוד בדיוק כמו קודם, רק עכשיו:
- ✅ הנתונים נשמרים ב-MongoDB Cloud במקום בקבצים מקומיים
- ✅ הנתונים זמינים מכל מחשב
- ✅ אוטומטית נמחקים אחרי 24 שעות (TTL)
- ✅ ניתן לגשת למסד הנתונים מ-MongoDB Compass או מהאתר

## בעיות נפוצות

### שגיאה: "Authentication failed"
- בדוק שהסיסמה והשם משתמש נכונים
- אם יש תווים מיוחדים, וודא שעשית URL encoding

### שגיאה: "Could not connect to any servers"
- בדוק ש-Network Access מאפשר גישה מה-IP שלך
- בדוק את חיבור האינטרנט

### שגיאה: "MONGODB_URI not configured"
- וודא שערכת את קובץ .env
- וודא שהחלפת את <username>, <password>, ו-<cluster-url>

## צפייה בנתונים

אפשר לראות את הנתונים שנשמרו:
1. היכנס ל-MongoDB Atlas
2. לחץ על **Browse Collections**
3. תראה את כל הנתונים שנשמרו, מסודרים לפי Symbol ו-Report Type

## MongoDB Compass (אופציונלי)

MongoDB Compass הוא כלי גרפי לניהול MongoDB:
1. הורד מ: https://www.mongodb.com/try/download/compass
2. התקן והפעל
3. הדבק את ה-Connection String
4. תוכל לראות ולערוך נתונים בצורה ויזואלית

---

**הצלחה! עכשיו המערכת שלך משתמשת ב-MongoDB Cloud! 🎉**

