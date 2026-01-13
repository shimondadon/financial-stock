# Excel Export Feature 📊

## Overview
The Excel Export feature allows you to download all financial data stored in the MongoDB database as a single Excel (.xlsx) file with multiple sheets.

## Features

### 1. **Complete Database Export**
- Exports all financial data from MongoDB
- Includes all symbols and report types (income, balance, cashflow, earnings, overview)
- Organized by symbol and report type

### 2. **Multiple Sheets**
The generated Excel file contains:
- **Summary Sheet**: Overview of all data entries with:
  - Symbol
  - Report Type
  - Created At (timestamp)
  - Updated At (timestamp)
  - Data availability status

- **Individual Data Sheets**: One sheet per symbol/report combination
  - Sheet name format: `{SYMBOL}_{REPORT_TYPE}`
  - Example: `AAPL_income`, `MSFT_balance`

### 3. **Smart Data Formatting**
- Automatically flattens nested JSON objects for Excel compatibility
- Handles arrays and complex data structures
- Converts dates to Hebrew locale format (he-IL)
- **Auto-truncates values exceeding 32,767 character limit**
- Marks truncated values with "[TRUNCATED]" suffix
- Prevents infinite recursion with max depth limit
- Handles large arrays intelligently (limits to 100 items)

## Usage

### From Web Interface
1. Open the application in your browser
2. Look for the "📊 Export All Database Data" section (purple gradient box)
3. Click the "📥 Download Excel Export" button
4. The Excel file will be automatically downloaded

### Via API Endpoint
```javascript
GET /api/export/excel
```

**Response:**
- Success: Excel file download (`.xlsx`)
- Error: JSON error message

**Example using JavaScript:**
```javascript
async function exportData() {
    const response = await fetch('/api/export/excel');
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial_data.xlsx';
    a.click();
}
```

**Example using curl:**
```bash
curl -o financial_data.xlsx http://localhost:3000/api/export/excel
```

## Requirements

### Dependencies
- `xlsx` package (automatically installed)
- MongoDB connection (CACHE_TYPE=mongodb)

### Configuration
The Excel export feature **only works with MongoDB cache**. Make sure your `.env` file has:
```
CACHE_TYPE=mongodb
MONGODB_URI=your_mongodb_connection_string
```

## File Structure

### Generated Filename
```
financial_data_export_YYYY-MM-DD.xlsx
```
Example: `financial_data_export_2026-01-13.xlsx`

### Sheet Naming Convention
- Summary sheet: `Summary`
- Data sheets: `{SYMBOL}_{REPORT_TYPE}` (max 31 characters for Excel compatibility)

## Error Handling

### Common Errors

1. **Cache Type Not MongoDB**
```json
{
  "success": false,
  "error": "Excel export is only available when using MongoDB cache",
  "cacheType": "file",
  "hint": "Set CACHE_TYPE=mongodb in .env file"
}
```

2. **No Data Found**
```json
{
  "success": false,
  "error": "No data found in database",
  "totalEntries": 0
}
```

3. **Export Failed**
```json
{
  "success": false,
  "error": "Failed to export data to Excel"
}
```

4. **Character Limit Exceeded**
```
Error: Text length must not exceed 32767 characters
```
**Solution:** ✅ **Automatically handled!** The system now:
- Truncates values longer than 32,000 characters
- Adds "[TRUNCATED]" marker to truncated values
- Logs warnings for truncated fields
- Creates error placeholder sheets if a sheet fails completely

## Data Structure

### Summary Sheet Columns
| Column | Description |
|--------|-------------|
| Symbol | Stock ticker symbol (e.g., AAPL, MSFT) |
| Report Type | Type of financial report (income, balance, cashflow, earnings, overview) |
| Created At | When the data was first cached |
| Updated At | When the data was last updated |
| Has Data | Whether data exists (Yes/No) |

### Data Sheets Structure
Each data sheet contains the flattened JSON structure:
| Column | Description |
|--------|-------------|
| Field | JSON path to the data field |
| Value | The actual value |

Example:
```
Field                           | Value
--------------------------------|--------
company.name                    | Apple Inc.
company.sector                  | Technology
financials.revenue              | 394328000000
financials.netIncome            | 99803000000
```

## Implementation Details

### Server-side (server.js)
```javascript
// New endpoint
app.get('/api/export/excel', async (req, res) => {
    // 1. Check if using MongoDB
    // 2. Fetch all data from FinancialData model
    // 3. Create Excel workbook with XLSX
    // 4. Generate summary sheet
    // 5. Create sheets for each symbol/report
    // 6. Send as downloadable file
});
```

### Helper Functions
```javascript
// Flattens nested objects for Excel compatibility
function flattenObject(obj, prefix = '') {
    // Recursively flattens nested structures
    // Example: {a: {b: {c: 1}}} => {"a.b.c": 1}
}
```

### Client-side (index.html)
```javascript
async function exportToExcel() {
    // 1. Call API endpoint
    // 2. Handle response as blob
    // 3. Create download link
    // 4. Trigger download
    // 5. Show success/error message
}
```

## Performance Considerations

- **Large Datasets**: Export time increases with database size
- **Memory Usage**: Large datasets are processed in memory
- **Sheet Limits**: Excel has a limit of 1,048,576 rows per sheet
- **Cell Character Limit**: Excel has a limit of 32,767 characters per cell
  - Values are automatically truncated at 32,000 characters
  - Truncated values are marked with "[TRUNCATED]"
  - Large nested objects are converted to JSON strings and truncated if needed
- **Recursion Depth**: Object flattening is limited to 5 levels deep to prevent stack overflow
- **Array Limits**: Arrays with more than 100 items are summarized rather than fully expanded

## Best Practices

1. **Regular Exports**: Schedule regular exports for backup purposes
2. **Data Verification**: Check the Summary sheet to verify all expected data is present
3. **File Management**: Keep exported files organized by date
4. **MongoDB Connection**: Ensure stable MongoDB connection before exporting

## Troubleshooting

### Export Button Not Working
1. Check if MongoDB is connected
2. Verify CACHE_TYPE is set to "mongodb"
3. Check browser console for errors
4. Ensure there is data in the database

### Empty Excel File
- Database might be empty
- Check the Summary sheet for entries
- Verify data was properly cached

### Sheet Names Truncated
- Excel limits sheet names to 31 characters
- Long symbol+reportType combinations are automatically truncated

## Future Enhancements

Potential improvements:
- [ ] Export specific symbols only
- [ ] Export date range filtering
- [ ] CSV format option
- [ ] Multiple file formats (PDF, etc.)
- [ ] Scheduled automatic exports
- [ ] Email delivery option
- [ ] Cloud storage integration

## Related Documentation
- [MongoDB Setup](./MONGODB_SETUP.md)
- [Cache Guide](./CACHE_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Support
For issues or questions, check:
1. Server logs for detailed error messages
2. Browser console for client-side errors
3. MongoDB connection status
4. .env configuration

