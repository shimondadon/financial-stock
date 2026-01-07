# Alpha Vantage Financial Data Fetcher

Enhanced financial data fetcher from Alpha Vantage API with calculated metrics and a web interface.

## Features

- 📊 Fetches comprehensive financial statements (Income Statement, Balance Sheet, Cash Flow)
- 📈 Calculates 25+ financial metrics automatically
- 💰 Includes profitability, liquidity, leverage, and growth ratios
- 🌐 Easy-to-use web interface
- 💾 Downloads results as formatted JSON files
- ⚡ Smart caching - instantly serves today's data without re-fetching from API

## Installation

```bash
npm install
```

## Usage

### Web Interface (Recommended)

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Enter a stock symbol (e.g., AAPL, MSFT, IBM, CRM)

4. Click "Fetch Financial Data"

5. The file will automatically download when ready (takes 60-90 seconds due to API rate limits)

### Command Line Interface

To use the CLI directly, uncomment the last lines in `alphavantage_enhanced.js` and run:

```bash
npm run cli
```

Or edit the symbol in the file and run:
```bash
node alphavantage_enhanced.js
```

## API Key

The current API key is included for testing purposes. For production use:
- Get your free API key at: https://www.alphavantage.co/support/#api-key
- Replace the `API_KEY` constant in `alphavantage_enhanced.js`

## Rate Limits

- Free tier: 5 API calls per minute, 500 per day
- Each stock analysis requires 5 API calls (takes ~60-90 seconds)

## Caching

The application automatically caches financial data to avoid unnecessary API calls:

- **Cache Location**: `./cache` directory
- **Cache Duration**: Files are cached for the current day only
- **Behavior**: 
  - First request for a symbol: Fetches from API (~60-90 seconds)
  - Subsequent requests (same day): Served instantly from cache
  - Next day: Fresh data is fetched automatically
- **Benefits**: 
  - Faster response times for repeated queries
  - Reduced API usage
  - No manual cache management needed

The cache directory is created automatically when the server starts. Each cached file is named with the format:
```
financial_enhanced_SYMBOL_YYYY-MM-DDTHH-MM-SS.json
```

## File Structure

- `index.html` - Web interface
- `server.js` - Express server
- `alphavantage_enhanced.js` - Core financial data fetcher
- `package.json` - Dependencies and scripts

## Calculated Metrics

### Profitability Ratios
- Gross Profit Margin
- Operating Margin
- Net Profit Margin
- Return on Assets (ROA)
- Return on Equity (ROE)
- EBITDA Margin

### Liquidity Ratios
- Current Ratio
- Quick Ratio
- Working Capital

### Leverage Ratios
- Debt-to-Equity
- Debt-to-Assets
- Equity Ratio

### Cash Flow Ratios
- Free Cash Flow
- Free Cash Flow to Revenue
- Cash Flow to Debt

### Per Share Metrics
- Earnings Per Share (EPS)
- Book Value Per Share
- Cash Per Share

### Growth Metrics
- Revenue Growth (YoY)
- Net Income Growth (YoY)
- EPS Growth (YoY)

### Efficiency Ratios
- Asset Turnover
- Inventory Turnover
- Interest Coverage

## Output Format

The downloaded JSON file contains:
- Company overview and metadata
- Enhanced reports for each available year
- Calculated financial metrics
- Raw data from all API endpoints

## Example Symbols

- **AAPL** - Apple Inc.
- **MSFT** - Microsoft Corporation
- **IBM** - IBM Corporation
- **CRM** - Salesforce Inc.
- **GOOGL** - Alphabet Inc.

## Notes

- Data is fetched in USD
- Large numbers are displayed in billions for readability
- The tool respects API rate limits with built-in delays
- Files are saved with timestamps to avoid overwrites

## Troubleshooting

**"API call limit reached"**: Wait 1 minute before trying again.

**"Symbol not found"**: Verify the stock symbol is correct and publicly traded.

**Server won't start**: Make sure port 3000 is available or change the PORT in server.js.

## License

ISC
