# OTA Analyzer

**Multi-State Log Analysis & Visualization Dashboard** for Vehicle OTA (Over-The-Air) Update Analytics.

[![Deploy to GitHub Pages](https://github.com/CJ-1981/ota-analyzer/actions/workflows/deploy.yml/badge.svg)](https://github.com/CJ-1981/ota-analyzer/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://cj-1981.github.io/ota-analyzer/)

## Live Demo

**https://cj-1981.github.io/ota-analyzer/**

## Features

- **System Analytics** — Sankey-style state transition flow, funnel visualization, success rate & KPI metrics
- **Operational Drilldown** — Time-series trends, retry distribution, sortable & filterable log entries table
- **Wasted Data Analysis** — Failure progress distribution, wasted bandwidth breakdown by failure condition
- **Configurable OTA Package Size** — Simulate different OTA package sizes and see impact on bandwidth & waste metrics
- **Custom Data Upload** — Upload your own CSV/TSV/JSON files and auto-detect column mappings
- **Column Filtering & Sorting** — Free-text search on every table column, click-to-sort with direction indicators
- **Demo Mode** — Generates 3,000 vehicle OTA update paths with realistic state transitions and failure conditions
- **Report Export** — Download a full PDF report of the current analytics view
- **100% Client-Side** — All data generation and analytics run in the browser, no backend required

## Screenshots

### Dashboard Overview

![Dashboard Overview](docs/screenshot-overview.png)

KPI cards show total vehicles, retries, success rate, and wasted data at a glance. The state transition flow visualizes how vehicles move through the OTA pipeline stages.

### Operational Drilldown

![Operational Drilldown](docs/screenshot-drilldown.png)

Time-series chart tracks events, successes, and failures over time. The log entries table supports per-column text filtering and sortable headers for deep investigation.

### Wasted Data Analysis

![Wasted Data Analysis](docs/screenshot-wasted.png)

Histogram shows failure progress distribution — where in the download/install process vehicles tend to fail. Bar chart breaks down wasted bandwidth by failure condition.

### Configuration Panel

![Configuration Panel](docs/screenshot-config.png)

Easily switch between demo mode and custom data upload. Configure OTA package size, pipeline states, success/failure/retry states, and column mappings.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Static Export) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Charts | Recharts |
| Deployment | GitHub Pages |

## Local Development

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Build for production
bun run build

# The static output is in the `out/` directory
```

## Project Structure

```
src/
├── app/
│   └── page.tsx          # Main dashboard (single-page app)
├── lib/
│   ├── analytics.ts      # Analytics computation engine
│   ├── data-generator.ts # Seeded OTA demo data generator
│   ├── data-parser.ts    # CSV/TSV/JSON parser & normalizer
│   └── types.ts          # TypeScript types & default config
└── components/ui/        # shadcn/ui components
```

## License

MIT
