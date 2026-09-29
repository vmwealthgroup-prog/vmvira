# VM ALGO AI Institutional Research Terminal
## Technical Specification & System Architecture Document

---

### 1. System Architecture
The VM ALGO AI Institutional Research Terminal is built as a full-stack, real-time web application. It integrates real-time equity data, technical indicators, options analytics, and news sentiment, processed through the **VM ALGO AI Core Engine** (powered by Gemini) to deliver institutional-grade equity research reports.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|             (React 19 + Vite + TailwindCSS 4 + Framer Motion + Lucide)            |
+-----------------------------------------------------------------------------------+
                                         │  ▲
                            HTTPS REST   │  │  WebSocket
                            JSON APIs    ▼  │  Real-time Feeds
+-----------------------------------------------------------------------------------+
|                                  BACKEND SERVER                                   |
|                        (Node.js + Express v4 + tsx Execution)                      |
+-----------------------------------------------------------------------------------+
       │                       │                             │
       ▼                       ▼                             ▼
+---------------+    +--------------------+    +------------------------------------+
|  STORAGE/DB   |    |   EXTERNAL SERVICES|    |        VM ALGO AI CORE ENGINE      |
| (In-Memory    |    |  (TradingView,     |    |   (Gemini-3.5-flash + Google Search|
|  & SQLite)    |    |   BSE/NSE Feeds)   |    |    Grounding / Real-time Reasoning)|
+---------------+    +--------------------+    +------------------------------------+
```

---

### 2. Folder Structure
Our codebase is structured into a modular, clean, feature-driven layout:

```
/
├── TECHNICAL_SPEC.md               # This master architecture document
├── .env.example                     # Environment variable templates
├── index.html                       # HTML entrypoint
├── package.json                     # Dependencies & full-stack scripts
├── server.ts                        # Express backend, API routes, Vite middleware
├── vite.config.ts                   # Vite client bundle config
├── tsconfig.json                    # TypeScript compiler settings
├── src/
│   ├── main.tsx                     # Client mounting entrypoint
│   ├── index.css                    # TailwindCSS 4 import & theme variables
│   ├── App.tsx                      # Root component, screen layout, state
│   ├── types.ts                     # Strict TypeScript interfaces & enums
│   ├── data/
│   │   └── mockEquityData.ts        # Database seeding & static NSE/BSE metadata
│   ├── services/
│   │   └── apiService.ts            # Client-side API abstraction
│   └── components/
│       ├── Header.tsx               # Top Bloomberg-style ribbon and ticker tape
│       ├── Sidebar.tsx              # Professional collapsible modular navigation
│       ├── Dashboard.tsx            # Market pulse, breadth, sector rotation & VIX
│       ├── StockResearch.tsx        # Institutional profile, financials, peer comparison
│       ├── Technicals.tsx           # Technical gauges, pivot points & signals
│       ├── OptionsAnalytics.tsx     # OI chain, max pain, PCR, strategy suggestions
│       ├── InstitutionalFlow.tsx    # FII/DII tracking, insider trading, block deals
│       ├── Screener.tsx             # Multivariable scanner, custom formulas
│       ├── AIChat.tsx               # BloombergGPT style AI analyst interface
│       └── NewsHub.tsx              # Live market intelligence & sentiment feed
```

---

### 3. Database Schema
To support high-frequency updates and deep historical relations, we specify a normalized PostgreSQL schema designed for high-performance indexing:

```sql
-- Core user accounts & roles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'ANALYST',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Listed equities (NSE/BSE)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    isin VARCHAR(50),
    market_cap DECIMAL(20,2),
    summary TEXT
);

-- Real-time prices & updates
CREATE TABLE prices (
    ticker VARCHAR(50) PRIMARY KEY REFERENCES companies(ticker),
    price DECIMAL(15,2) NOT NULL,
    change_pct DECIMAL(5,2) NOT NULL,
    volume BIGINT,
    delivery_pct DECIMAL(5,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Historical daily bars for Technical Analysis
CREATE TABLE historical_prices (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(50) REFERENCES companies(ticker),
    trade_date DATE NOT NULL,
    open DECIMAL(15,2),
    high DECIMAL(15,2),
    low DECIMAL(15,2),
    close DECIMAL(15,2),
    volume BIGINT,
    UNIQUE(ticker, trade_date)
);

-- Quarterly Financial Reporting
CREATE TABLE quarterly_financials (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(50) REFERENCES companies(ticker),
    period_end DATE NOT NULL,
    revenue DECIMAL(20,2),
    net_profit DECIMAL(20,2),
    eps DECIMAL(10,2),
    operating_margin DECIMAL(5,2),
    UNIQUE(ticker, period_end)
);

-- Balance Sheet structure
CREATE TABLE balance_sheets (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(50) REFERENCES companies(ticker),
    period_end DATE NOT NULL,
    share_capital DECIMAL(20,2),
    reserves DECIMAL(20,2),
    borrowings DECIMAL(20,2),
    other_liabilities DECIMAL(20,2),
    fixed_assets DECIMAL(20,2),
    other_assets DECIMAL(20,2),
    UNIQUE(ticker, period_end)
);

-- Options open interest history
CREATE TABLE options_chain (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(50) REFERENCES companies(ticker),
    expiry_date DATE NOT NULL,
    strike_price DECIMAL(10,2) NOT NULL,
    call_oi BIGINT,
    call_change_oi BIGINT,
    call_ltp DECIMAL(10,2),
    put_oi BIGINT,
    put_change_oi BIGINT,
    put_ltp DECIMAL(10,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-calculated AI Core scores
CREATE TABLE ai_scores (
    ticker VARCHAR(50) PRIMARY KEY REFERENCES companies(ticker),
    fundamental_score INT CHECK(fundamental_score BETWEEN 0 AND 100),
    technical_score INT CHECK(technical_score BETWEEN 0 AND 100),
    momentum_score INT CHECK(momentum_score BETWEEN 0 AND 100),
    quality_score INT CHECK(quality_score BETWEEN 0 AND 100),
    growth_score INT CHECK(growth_score BETWEEN 0 AND 100),
    risk_score INT CHECK(risk_score BETWEEN 0 AND 100),
    overall_score INT CHECK(overall_score BETWEEN 0 AND 100),
    grade VARCHAR(10),
    recommendation VARCHAR(50),
    thesis TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Institutional Watchlists
CREATE TABLE watchlists (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    tickers VARCHAR(50)[] -- Array of tracked tickers
);
```

---

### 4. API Specification
Our server exposes a comprehensive backend API under `/api/v1/`:

*   **Market Summary**: `GET /api/v1/markets` -> Returns index values, VIX, advances/declines, FII/DII flow.
*   **Equities Master**: `GET /api/v1/stocks` -> Returns full list of tracked NSE/BSE companies.
*   **Equity Profile**: `GET /api/v1/stocks/:ticker` -> Fundamental stats, annuals, balance sheet, ratios, peer analysis.
*   **Technical Feed**: `GET /api/v1/stocks/:ticker/technicals` -> Support/resistance levels, indicators (RSI, EMA, Bollinger), gauges.
*   **Options Chain**: `GET /api/v1/stocks/:ticker/options` -> Open Interest details, PCR, Max Pain, greeks.
*   **Institutional Data**: `GET /api/v1/institutional/flows` -> Daily FII/DII net flows, block deals.
*   **Multivariate Screener**: `POST /api/v1/screener/run` -> Filters stocks based on growth, valuation, and momentum metrics.
*   **AI Research Core**: `POST /api/v1/research/analyze` -> Triggers the unified AI Core Engine with real-time data feeding + Gemini Search Grounding. Returns structured report + scores.
*   **BloombergGPT Chat**: `POST /api/v1/chat` -> Chat helper for financial terminal-specific inquiries.

---

### 5. UI Wireframes & Layout
The interface is designed with a high-density, Bloomberg Terminal-inspired HUD using a primary charcoal slate palette and deep ocean neon accents (`#0EA5E9`).

```
+-----------------------------------------------------------------------------------+
|  [VM ALGO AI]  NIFTY: 24,310 (+0.4%) | BANKNIFTY: 52,110 | VIX: 12.4 | USDINR: 83.4 | Search | [User]  |
+-----------------------------------------------------------------------------------+
| S | [MARKET PULSE]                             | [REALTIME SIGNAL GAUGES]          |
| I | Nifty 50 Indices Chart / Area Visualizer   | Trend Indicators: [BUY ]          |
| D | Technical Breakdown List                   | Volatility Index                  |
| E | ------------------------------------------ +-----------------------------------|
| B | [FII/DII FLOWS] | [ADVANCE-DECLINE]        | [GLOBAL SENTIMENT FEED]           |
| A | FII: +1,240 Cr  | Adv: 34  | Dec: 16       | AI Core News Analysis             |
| R | DII: -410 Cr    | Breadth: Positive        | Reliance Q1 EPS beats consensus   |
+-----------------------------------------------------------------------------------+
| Terminal Console Footer: [Press Alt+S to Search | Alt+C for AI Analyst]           |
+-----------------------------------------------------------------------------------+
```

---

### 6. Component Hierarchy
-   `App` (Central Router / Layout Provider)
    -   `Header` (Realtime indices ribbon, system search, UTC clock)
    -   `Sidebar` (View selector: Dashboard, Stock Research, Screener, Options, Institutional Flows, AI Chat, Settings)
    -   `Main Screen Area` (Displays active component with lazy loading & skeleton states)
        -   `DashboardView` (Indices panels, VIX tracker, market breadth gauges, top movers, sector heatmaps)
        -   `StockResearchView`
            -   `StockSelectorHeader` (LTP, Day change, corporate details)
            -   `CompanyFinancials` (Annual & Quarterly tables, balance sheet visualizers, cash flows)
            -   `TechnicalsGauge` (Multi-timeframe RSI, MACD, EMA signals, custom chart integration)
            -   `OptionsAnalysisView` (Dynamic Open Interest bar chart, strike price tables, Max Pain)
            -   `AIResearchReport` (Triggers `VM ALGO AI CORE ENGINE`, displaying grading, SWOT, bull/bear thesis, expected CAGR)
        -   `ScreenerView` (Custom formula builder, interactive results grid with sorting & custom filters)
        -   `InstitutionalFlowView` (FII/DII Net Flow histories, bulk deals, insider activity trackers)
        -   `AIChatView` (Dual-pane chat window: BloombergGPT style command inputs, portfolio analyses)

---

### 7. Backend Architecture
The backend is implemented as an Express application built in `server.ts`. It acts as the gateway:
1.  **State Server**: Serves seed database data containing complete balance sheets, incomes, cash flows, and peer arrays.
2.  **Simulation Engine**: Automatically randomizes stock prices & open interest parameters every 10 seconds to mimic live institutional feeds.
3.  **Core Gateway**: Proxies the `@google/genai` client, keeping keys safe, attaching appropriate system instructions, enabling Search Grounding, and returning structured outputs.

---

### 8. AI Core Engine Architecture
Every AI request follows the **Unified AI Core Engine pipeline**:

```
+------------------+     +------------------------+     +------------------------+
| 1. GATHER DATA   | ──> | 2. NORMALIZATION       | ──> | 3. SEARCH GROUNDING    |
| Read stock profile,|     | Standardize ratios,    |     | Fetch latest news,     |
| financials, OI,    |     | technical metrics,     |     | broker target changes, |
| and option pain    |     | and peer data          |     | and earnings transcripts|
+------------------+     +------------------------+     +------------------------+
                                                                     │
                                                                     ▼
+------------------+     +------------------------+     +------------------------+
| 6. REPORT OUTPUT | <── | 5. MULTI-AXIS GRADING  | <── | 4. REASONING PIPELINE  |
| Generate target, |     | Compute Fundamental,   |     | Synthesize bull/bear   |
| grade (AAA to B),|     | Technical, Risk,       |     | cases, SWOT,           |
| and detailed thesis|     | Growth and Value scores|     | and catalysts          |
+------------------+     +------------------------+     +------------------------+
```

---

### 9. Development Roadmap
-   [x] **Phase 1**: Technical Specification and Database Modeling.
-   [ ] **Phase 2**: Create TypeScript Definitions & Seeding Data for India's 20 largest equities.
-   [ ] **Phase 3**: Implement Full-Stack Express Server with Gemini AI Core endpoints & Search Grounding.
-   [ ] **Phase 4**: Develop High-Density Bloomberg Dark UI layout.
-   [ ] **Phase 5**: Build Stock Research Dashboard with full financials, ratios, and Technical Gauges.
-   [ ] **Phase 6**: Develop Realtime Options chain with OI Bar Charting & Max Pain.
-   [ ] **Phase 7**: Implement Interactive Screener and FII/DII Flow analytics.
-   [ ] **Phase 8**: Integrate Chat and AI research reporting with real-time status cues.
-   [ ] **Phase 9**: Final optimization, TypeScript compliance audits, and full-app verification.
