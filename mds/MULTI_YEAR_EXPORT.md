# Multi-Year Excel Export Feature

## Overview
Added functionality to export multiple years of historical financial data per stock, with customizable year range.

## Changes Made

### 1. Server-Side Changes (`server.js`)

#### Modified `/api/export/excel` Endpoint
- **Added Query Parameter**: `years` (default: 20)
  - Example: `/api/export/excel?years=10` - exports last 10 years
  - Example: `/api/export/excel` - exports last 20 years (default)

#### Data Structure Changes
- **Previous**: One row per stock (latest year only)
- **New**: Multiple rows per stock (one row per year, up to specified years)

#### Example Output Structure
```
Symbol | Year | Total_Revenue | Gross_Profit | ... | Company_Name
-------|------|---------------|--------------|-----|-------------
AAPL   | 2024 | 391,035,000   | 169,148,000  | ... | Apple Inc.
AAPL   | 2023 | 383,285,000   | 169,148,000  | ... | Apple Inc.
AAPL   | 2022 | 394,328,000   | 170,782,000  | ... | Apple Inc.
MSFT   | 2024 | 211,915,000   | 146,052,000  | ... | Microsoft Corporation
MSFT   | 2023 | 198,270,000   | 135,620,000  | ... | Microsoft Corporation
```

#### Header Structure (3 Rows)
1. **Row 1**: Category Headers (merged cells)
   - Income Statement (6 columns)
   - Balance Sheet (6 columns)
   - Cash Flow (6 columns)
   - Metrics (15 columns)
   - Company Info (6 columns)

2. **Row 2**: Field Names
   - Symbol, Year
   - Total_Revenue, Gross_Profit, Operating_Income, Net_Income, EBITDA, EPS
   - Total_Assets, Current_Assets, Total_Liabilities, Current_Liabilities, Long_Term_Debt, Shareholder_Equity
   - Cash_Equivalents, Operating_Cash_Flow, Capital_Expenditures, Free_Cash_Flow, Investing_Cash_Flow, Financing_Cash_Flow
   - Gross_Profit_Margin, Operating_Margin, Net_Profit_Margin, ROA, ROE, EBITDA_Margin, Current_Ratio, Quick_Ratio, Debt_to_Equity, Debt_to_Assets, Asset_Turnover, Revenue_Growth_YoY, Net_Income_Growth_YoY, EPS_Growth_YoY
   - Company_Name, Sector, Industry, Market_Cap, PE_Ratio, Dividend_Yield

3. **Row 3+**: Data rows (one per stock per year)

#### Number Formatting
- **Large numbers** (> 1,000,000): Formatted with commas, no decimals
  - Example: 391,035,000 instead of 3.91E+08
- **Small numbers/Ratios** (-100 to 100): 4 decimal places
  - Example: 0.4329 instead of 0.43

#### Growth Calculations
- **YoY Growth**: Calculated per year by comparing to previous year
  - Revenue_Growth_YoY: `(Current Year Revenue - Previous Year Revenue) / Previous Year Revenue`
  - Net_Income_Growth_YoY: Same formula for Net Income
  - EPS_Growth_YoY: Same formula for EPS

#### Helper Function Added
```javascript
function calculateYearGrowth(currentYear, previousYear, field) {
    const current = parseFloat(currentYear?.[field]) || 0;
    const previous = parseFloat(previousYear?.[field]) || 0;
    
    if (previous === 0) return 0;
    return (current - previous) / previous;
}
```

### 2. Front-End Changes (`index.html`)

#### Added Years Selector UI
Located in the "Export All Database Data" section:
- **Input Field**: Number input (1-30 years)
- **Default Value**: 20 years
- **Label**: "📅 Number of years back (default: 20)"

#### Modified `exportToExcel()` Function
```javascript
async function exportToExcel() {
    const yearsBack = parseInt(document.getElementById('yearsBackInput').value) || 20;
    const response = await fetch(`/api/export/excel?years=${yearsBack}`);
    // ... rest of the code
}
```

## Usage Instructions

### For End Users

1. **Navigate to the Application**
   - Open the web application
   - Scroll down to the "📊 Export All Database Data" section

2. **Select Number of Years**
   - Default: 20 years
   - Minimum: 1 year
   - Maximum: 30 years
   - Enter desired number in the input field

3. **Click "📥 Download Excel Export"**
   - Excel file will be generated and downloaded
   - Filename format: `financial_data_export_YYYY-MM-DD.xlsx`

4. **View Results**
   - Each stock will have multiple rows (one per year)
   - Data is sorted by Symbol and Year (newest first)
   - All financial metrics are included per year

### Example Scenarios

#### Scenario 1: Last 5 Years Analysis
- Set years to: **5**
- Result: Each stock shows data for 2020-2024 (5 rows per stock)

#### Scenario 2: Full Historical Data
- Set years to: **30**
- Result: Each stock shows all available data (up to 30 years)

#### Scenario 3: Recent Year Only
- Set years to: **1**
- Result: Each stock shows only the most recent year (1 row per stock)

## Technical Details

### Data Availability
- System will export up to the requested number of years
- If a stock has fewer years available, it exports what exists
- Example: Request 20 years, but stock only has 10 years → exports 10 years

### Performance Considerations
- Larger year ranges take longer to process
- Export time is proportional to: `(Number of Stocks) × (Number of Years)`
- Recommended maximum: 20 years for optimal performance

### Database Requirements
- Feature only works with **MongoDB cache**
- File cache is not supported for this feature
- Check `.env` file: `CACHE_TYPE=mongodb`

## Testing Checklist

- [ ] Export with default 20 years
- [ ] Export with 1 year (latest only)
- [ ] Export with 5 years
- [ ] Export with 30 years (maximum)
- [ ] Verify header structure (3 rows)
- [ ] Verify field names appear in Row 2
- [ ] Verify no scientific notation for large numbers
- [ ] Verify decimal precision for ratios
- [ ] Verify multiple rows per stock
- [ ] Verify YoY growth calculations are per-year
- [ ] Verify data sorting (by Symbol, then by Year descending)

## Known Issues/Limitations

1. **API Rate Limits**: Alpha Vantage provides up to 20-25 years of annual data
2. **Missing Data**: Some older years may have incomplete data
3. **Growth Calculations**: First year for each stock has 0% growth (no previous year to compare)

## Future Enhancements

- [ ] Add option to export quarterly data with multi-period support
- [ ] Add filtering by sector/industry
- [ ] Add option to select specific stocks for export
- [ ] Add progress bar for large exports
- [ ] Add data completeness indicator per row

## Troubleshooting

### Issue: "Excel export is only available when using MongoDB cache"
**Solution**: Set `CACHE_TYPE=mongodb` in `.env` file

### Issue: Fewer years than requested
**Solution**: Stock has limited historical data available from Alpha Vantage

### Issue: Scientific notation in numbers
**Solution**: This should be fixed now. If still occurring, check Excel cell formatting.

### Issue: Missing field names in Row 2
**Solution**: Ensure you're using the latest version of the code (this update)

## Summary

This feature allows users to:
✅ Export multiple years of financial data per stock
✅ Customize the number of years (1-30)
✅ View proper headers with category groupings
✅ See clean number formatting (no scientific notation)
✅ Analyze year-over-year growth trends
✅ Get one Excel file with all data organized by stock and year

