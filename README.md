# Hiring Funnel Calculator

A Google Sheets sidebar tool for modeling recruiting pipeline volume, pass-through rates, and weekly sourcing targets.

## Setup (manual copy-paste)

1. Open a Google Sheet → **Extensions → Apps Script**.
2. In the Apps Script editor, create two files:
   - **Code.gs** — paste the contents of `Code.gs` from this repo.
   - **Index.html** — click **+** → **HTML**, name it `Index`, paste the contents of `Index.html`.
3. If there is an existing `appsscript.json` manifest (View → Show manifest file), you can leave it as-is or replace it with the one in this repo.
4. Save, then reload the spreadsheet. A **Hiring Funnel** menu will appear.
5. Click **Hiring Funnel → Open Calculator** to launch the sidebar.

## Setup (clasp CLI)

```bash
npm install -g @google/clasp
clasp login
clasp create --type sheets --title "Hiring Funnel Calculator"
clasp push
clasp open          # opens the spreadsheet in your browser
```

## Usage

| Mode | What you enter | What it calculates |
|---|---|---|
| **From headcount** | Candidate count at each stage | Pass-through rates between stages |
| **From hires needed** | Target offers + pass-through rates | Required candidates at every stage |

Summary cards show recruiter screens/week and sourced outreach/week needed to hit your hiring goal by end of year (December excluded to account for pipeline lag).
