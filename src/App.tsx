import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderTree,
  Search,
  X,
} from 'lucide-react';
import {
  CHART_INSIGHTS,
  PROJECT_TREE,
  type ChartInsight,
  type EdaSummary,
  type TipRecord,
} from './data/projectData';

interface NotebookCell {
  cell_type: 'markdown' | 'code';
  source: string[] | string;
}

interface NotebookDocument {
  cells: NotebookCell[];
}

type DeliverableTab = 'notebook' | 'script' | 'readme' | 'requirements';

function parseCsvRows(csvText: string): TipRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const parts = line.split(',');
    return {
      total_bill: Number(parts[0]),
      tip: Number(parts[1]),
      sex: parts[2]?.replace(/"/g, '') ?? '',
      smoker: parts[3]?.replace(/"/g, '') ?? '',
      day: parts[4]?.replace(/"/g, '') ?? '',
      time: parts[5]?.replace(/"/g, '') ?? '',
      size: Number(parts[6]),
    };
  });
}

function normalizeCellSource(source: string[] | string): string {
  return Array.isArray(source) ? source.join('') : source;
}

export default function App() {
  const [edaSummary, setEdaSummary] = useState<EdaSummary | null>(null);
  const [records, setRecords] = useState<TipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dataset Explorer interactive filters
  const [dayFilter, setDayFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<string>('All');
  const [smokerFilter, setSmokerFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'total_bill' | 'tip' | 'size'>('total_bill');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleRowLimit, setVisibleRowLimit] = useState<number>(12);

  // Chart Detail Modal
  const [selectedChart, setSelectedChart] = useState<ChartInsight | null>(null);

  // Code & Notebook Inspector
  const [activeDeliverable, setActiveDeliverable] = useState<DeliverableTab>('notebook');
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([]);
  const [scriptText, setScriptText] = useState<string>('');
  const [readmeText, setReadmeText] = useState<string>('');
  const [requirementsText, setRequirementsText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjectAssets() {
      try {
        setLoading(true);
        setLoadError(null);

        const [summaryRes, csvRes, nbRes, pyRes, readmeRes, reqRes] = await Promise.all([
          fetch('/outputs/eda_summary.json'),
          fetch('/dataset/tips_cleaned.csv'),
          fetch('/downloads/data_visualization.ipynb'),
          fetch('/downloads/visualization.py'),
          fetch('/downloads/README.md'),
          fetch('/downloads/requirements.txt'),
        ]);

        if (!summaryRes.ok || !csvRes.ok) {
          throw new Error('Failed to load computed EDA summary or dataset CSV.');
        }

        const summaryJson = (await summaryRes.json()) as EdaSummary;
        const csvText = await csvRes.text();

        const parsedNotebook = nbRes.ok ? ((await nbRes.json()) as NotebookDocument) : { cells: [] };
        const pyContent = pyRes.ok ? await pyRes.text() : '';
        const mdContent = readmeRes.ok ? await readmeRes.text() : '';
        const reqContent = reqRes.ok ? await reqRes.text() : '';

        if (!cancelled) {
          setEdaSummary(summaryJson);
          setRecords(parseCsvRows(csvText));
          setNotebookCells(parsedNotebook.cells ?? []);
          setScriptText(pyContent);
          setReadmeText(mdContent);
          setRequirementsText(reqContent);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load dataset artifacts.');
          setLoading(false);
        }
      }
    }

    loadProjectAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records
      .filter((row) => {
        if (dayFilter !== 'All' && row.day !== dayFilter) return false;
        if (timeFilter !== 'All' && row.time !== timeFilter) return false;
        if (smokerFilter !== 'All' && row.smoker !== smokerFilter) return false;
        if (q) {
          const matchesText =
            row.day.toLowerCase().includes(q) ||
            row.time.toLowerCase().includes(q) ||
            row.sex.toLowerCase().includes(q) ||
            row.total_bill.toFixed(2).includes(q) ||
            row.tip.toFixed(2).includes(q);
          if (!matchesText) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const diff = a[sortField] - b[sortField];
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [records, dayFilter, timeFilter, smokerFilter, searchQuery, sortField, sortDirection]);

  const filteredSummary = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { count: 0, avgBill: 0, avgTip: 0, avgPct: 0 };
    }
    const sumBill = filteredRecords.reduce((acc, r) => acc + r.total_bill, 0);
    const sumTip = filteredRecords.reduce((acc, r) => acc + r.tip, 0);
    return {
      count: filteredRecords.length,
      avgBill: sumBill / filteredRecords.length,
      avgTip: sumTip / filteredRecords.length,
      avgPct: (sumTip / sumBill) * 100,
    };
  }, [filteredRecords]);

  function handleSort(field: 'total_bill' | 'tip' | 'size') {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1800);
  }

  function resetFilters() {
    setDayFilter('All');
    setTimeFilter('All');
    setSmokerFilter('All');
    setSearchQuery('');
  }

  const statColumns = edaSummary ? Object.entries(edaSummary.summary_stats) : [];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#overview"
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Data Visualization with Matplotlib &amp; Seaborn
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#overview"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </a>
            <a
              href="#visualizations"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Visualizations
            </a>
            <a
              href="#dashboard"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Dashboard
            </a>
            <a
              href="#deliverables"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Notebook &amp; Files
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <a
              href="/downloads/visualization.py"
              download="visualization.py"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download Script
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-16">
        {/* Section 1: Overview, Data Quality & EDA Summary */}
        <section id="overview" className="space-y-8 scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-medium text-slate-500">
                  Seaborn Tips Dataset · Python 3.10 · Pandas &amp; NumPy · Matplotlib &amp; Seaborn
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
                  Exploratory Data Analysis &amp; Statistical Visualization of Restaurant Tipping
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                  An end-to-end, reproducible Data Science project examining how total bill size,
                  day of the week, meal period, and party size shape restaurant gratuities across
                  244 recorded dining tables.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#visualizations"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Explore 6 Visualizations
                </a>
                <a
                  href="/downloads/data_visualization.ipynb"
                  download="data_visualization.ipynb"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download Notebook (.ipynb)
                </a>
              </div>
            </div>

            {/* Right column: Data Inspection & Cleaning Audit */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Data Inspection &amp; Cleaning Audit
                  </h2>
                  <span className="text-xs font-mono text-slate-500">sns.load_dataset(&apos;tips&apos;)</span>
                </div>

                {loading ? (
                  <div className="space-y-3 py-4">
                    <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
                    <div className="h-4 w-5/6 rounded bg-slate-200 animate-pulse" />
                  </div>
                ) : loadError ? (
                  <p className="text-sm text-red-700">{loadError}</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <dt className="text-xs text-slate-500">Raw Records</dt>
                      <dd className="text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
                        {edaSummary?.raw_rows} × {edaSummary?.raw_cols}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Cleaned Records</dt>
                      <dd className="text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
                        {edaSummary?.clean_rows} rows
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Missing Values</dt>
                      <dd className="text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
                        0 across 7 cols
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Duplicates Removed</dt>
                      <dd className="text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
                        {edaSummary?.duplicate_count} exact row
                      </dd>
                    </div>
                  </dl>
                )}
              </div>

              <p className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-600 leading-relaxed">
                Duplicate check identified 1 identical observation ($13.00 bill, $2.00 tip, Female,
                Smoker, Thur, Lunch, Size 2) at indices 198 and 202, removed prior to analysis.
              </p>
            </div>
          </div>

          {/* 4-Column Key Metric Strip */}
          {edaSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-slate-200 py-6">
              <div>
                <p className="text-xs text-slate-500">Mean Total Bill</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                  ${edaSummary.summary_stats.total_bill.mean.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                  Median ${edaSummary.summary_stats.total_bill['50%'].toFixed(2)} · Max $
                  {edaSummary.summary_stats.total_bill.max.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mean Tip Amount</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                  ${edaSummary.summary_stats.tip.mean.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                  Median ${edaSummary.summary_stats.tip['50%'].toFixed(2)} · Max $
                  {edaSummary.summary_stats.tip.max.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Bill–Tip Correlation (r)</p>
                <p className="text-2xl font-bold text-blue-700 tabular-nums mt-1">
                  {edaSummary.correlation.total_bill.tip.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                  Moderate-to-strong positive association
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Highest Tipping Day</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                  Sunday (${edaSummary.tip_by_day.Sun.mean.toFixed(2)})
                </p>
                <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                  Median ${edaSummary.tip_by_day.Sun.median.toFixed(2)} across{' '}
                  {edaSummary.tip_by_day.Sun.count} tables
                </p>
              </div>
            </div>
          )}

          {/* Statistical Summary Table */}
          {statColumns.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  01. Descriptive Statistical Summary (Cleaned Numerical Features)
                </h2>
                <span className="text-xs text-slate-500 font-mono">df_clean.describe()</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3 text-right">Count</th>
                      <th className="px-4 py-3 text-right">Mean</th>
                      <th className="px-4 py-3 text-right">Std Dev</th>
                      <th className="px-4 py-3 text-right">Min</th>
                      <th className="px-4 py-3 text-right">25%</th>
                      <th className="px-4 py-3 text-right">Median (50%)</th>
                      <th className="px-4 py-3 text-right">75%</th>
                      <th className="px-4 py-3 text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {statColumns.map(([col, stats]) => {
                      const isCurrency = col !== 'size';
                      const fmt = (val: number) =>
                        isCurrency ? `$${val.toFixed(2)}` : val.toFixed(2);
                      return (
                        <tr key={col} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">
                            {col}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                            {stats.count}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                            {fmt(stats.mean)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                            {fmt(stats.std)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                            {fmt(stats.min)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                            {fmt(stats['25%'])}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                            {fmt(stats['50%'])}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                            {fmt(stats['75%'])}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                            {fmt(stats.max)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Six Core Visualizations + Written Insights */}
        <section id="visualizations" className="space-y-8 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                02. Six Exploratory Visualizations &amp; Data Insights
              </h2>
              <p className="text-sm text-slate-600">
                Every chart below was generated directly by Matplotlib and Seaborn from the
                cleaned 243-row dataset. Click any chart to inspect full resolution and source code.
              </p>
            </div>
            <span className="text-xs text-slate-500">6 PNG outputs · 150 DPI</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {CHART_INSIGHTS.map((chart) => (
              <article
                key={chart.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Chart {chart.index} · {chart.chartType}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                      {chart.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedChart(chart)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                      View Code
                    </button>
                    <a
                      href={chart.imagePath}
                      download={chart.filename}
                      aria-label={`Download ${chart.filename}`}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedChart(chart)}
                  className="group relative bg-white p-4 text-left focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <img
                    src={chart.imagePath}
                    alt={chart.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-72 object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                </button>

                <div className="border-t border-slate-200 px-5 py-4 space-y-3 text-sm text-slate-600 flex-1">
                  <div>
                    <span className="font-semibold text-slate-900">What it represents: </span>
                    {chart.represents}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Observed pattern: </span>
                    {chart.patterns}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Variable relationship: </span>
                    {chart.relationship}
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-slate-900">
                    <span className="font-semibold text-blue-700">Key takeaway: </span>
                    {chart.takeaway}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section 3: Four-Chart 2x2 Dashboard */}
        <section id="dashboard" className="space-y-6 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                03. Four-Chart Executive Dashboard (2×2 Subplot Layout)
              </h2>
              <p className="text-sm text-slate-600">
                Combines the Histogram, Box Plot, Scatter Plot, and Correlation Heatmap using{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  plt.tight_layout()
                </code>{' '}
                and saved at 150 DPI as{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  outputs/tips_overview.png
                </code>
                .
              </p>
            </div>
            <a
              href="/outputs/tips_overview.png"
              download="tips_overview.png"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download tips_overview.png
            </a>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <img
              src="/outputs/tips_overview.png"
              alt="2x2 Four-Chart Executive Dashboard combining Histogram, Box Plot, Scatter Plot, and Correlation Heatmap"
              referrerPolicy="no-referrer"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </section>

        {/* Section 4: Interactive Dataset Explorer */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                04. Interactive Cleaned Dataset Explorer
              </h2>
              <p className="text-sm text-slate-600">
                Filter and sort all 243 cleaned observations from{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  dataset/tips_cleaned.csv
                </code>{' '}
                to verify chart patterns directly against source rows.
              </p>
            </div>
            <a
              href="/dataset/tips_cleaned.csv"
              download="tips_cleaned.csv"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </a>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Segmented Day Filter */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                {['All', 'Thur', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setDayFilter(day)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      dayFilter === day
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Segmented Time Filter */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                {['All', 'Lunch', 'Dinner'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeFilter(t)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      timeFilter === t
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Smoker Filter */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                {[
                  { label: 'All Parties', val: 'All' },
                  { label: 'Non-Smoker', val: 'No' },
                  { label: 'Smoker', val: 'Yes' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setSmokerFilter(opt.val)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      smokerFilter === opt.val
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bill, day, sex..."
                  aria-label="Search dataset records"
                  className="w-52 rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
                />
              </div>
              {(dayFilter !== 'All' ||
                timeFilter !== 'All' ||
                smokerFilter !== 'All' ||
                searchQuery !== '') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Filtered Live Metrics Strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 tabular-nums">
            <span>
              Matching rows: <strong className="text-slate-900">{filteredSummary.count}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Filtered mean bill:{' '}
              <strong className="text-slate-900">${filteredSummary.avgBill.toFixed(2)}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Filtered mean tip:{' '}
              <strong className="text-slate-900">${filteredSummary.avgTip.toFixed(2)}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Aggregate tip rate:{' '}
              <strong className="text-slate-900">{filteredSummary.avgPct.toFixed(1)}%</strong>
            </span>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-900">
                No dining records match the selected filters.
              </p>
              <p className="text-xs text-slate-600">
                Try clearing one of the day, meal time, or smoker filters to view observations.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3">Meal Time</th>
                      <th className="px-4 py-3">Payer Sex</th>
                      <th className="px-4 py-3">Smoker</th>
                      <th className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('size')}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          Party Size
                          <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('total_bill')}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          Total Bill
                          <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('tip')}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          Tip
                          <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">Tip %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredRecords.slice(0, visibleRowLimit).map((row, idx) => {
                      const pct = (row.tip / row.total_bill) * 100;
                      return (
                        <tr
                          key={`${row.day}-${row.total_bill}-${row.tip}-${idx}`}
                          className="hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-2.5 text-slate-900 font-medium">{row.day}</td>
                          <td className="px-4 py-2.5 text-slate-600">{row.time}</td>
                          <td className="px-4 py-2.5 text-slate-600">{row.sex}</td>
                          <td className="px-4 py-2.5 text-slate-600">{row.smoker}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                            {row.size}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900">
                            ${row.total_bill.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 font-medium">
                            ${row.tip.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRecords.length > visibleRowLimit && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleRowLimit((n) => n + 25)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Show 25 More Rows ({filteredRecords.length - visibleRowLimit} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 5: Project Structure, Jupyter Notebook, Python Code & Documentation */}
        <section id="deliverables" className="space-y-6 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                05. Project Structure, Notebook &amp; Source Deliverables
              </h2>
              <p className="text-sm text-slate-600">
                Complete repository layout ready for Jupyter Notebook, Google Colab, or local
                Python execution.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left sidebar: Folder Structure + Direct Downloads */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FolderTree className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  Project Directory Layout
                </div>
                <pre className="overflow-x-auto text-xs font-mono leading-relaxed text-slate-700">
                  {PROJECT_TREE}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Downloadable Files</h3>
                <ul className="divide-y divide-slate-100 text-sm">
                  {[
                    {
                      label: 'src/visualization.py',
                      href: '/downloads/visualization.py',
                      name: 'visualization.py',
                    },
                    {
                      label: 'notebooks/data_visualization.ipynb',
                      href: '/downloads/data_visualization.ipynb',
                      name: 'data_visualization.ipynb',
                    },
                    {
                      label: 'outputs/tips_overview.png',
                      href: '/outputs/tips_overview.png',
                      name: 'tips_overview.png',
                    },
                    {
                      label: 'README.md',
                      href: '/downloads/README.md',
                      name: 'README.md',
                    },
                    {
                      label: 'requirements.txt',
                      href: '/downloads/requirements.txt',
                      name: 'requirements.txt',
                    },
                  ].map((file) => (
                    <li key={file.label} className="py-2.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-700 truncate">{file.label}</span>
                      <a
                        href={file.href}
                        download={file.name}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline shrink-0"
                      >
                        <Download className="h-3 w-3" aria-hidden="true" />
                        Get
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Right panel: Tabbed Viewer for Notebook / Python Script / README / Requirements */}
            <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                  {[
                    { id: 'notebook' as const, label: 'Jupyter Notebook' },
                    { id: 'script' as const, label: 'visualization.py' },
                    { id: 'readme' as const, label: 'README.md' },
                    { id: 'requirements' as const, label: 'requirements.txt' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveDeliverable(tab.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activeDeliverable === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeDeliverable !== 'notebook' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        activeDeliverable === 'script'
                          ? scriptText
                          : activeDeliverable === 'readme'
                            ? readmeText
                            : requirementsText,
                        activeDeliverable,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedId === activeDeliverable ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy File
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="max-h-[640px] overflow-y-auto p-5">
                {activeDeliverable === 'notebook' && (
                  <div className="space-y-4">
                    {notebookCells.map((cell, idx) => {
                      const content = normalizeCellSource(cell.source);
                      if (cell.cell_type === 'markdown') {
                        return (
                          <div
                            key={idx}
                            className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed"
                          >
                            {content}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2 text-xs text-slate-400">
                            <span className="font-mono">In [{idx + 1}]</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(content, `cell-${idx}`)}
                              className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
                            >
                              {copiedId === `cell-${idx}` ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="overflow-x-auto p-3.5 text-xs font-mono leading-relaxed">
                            <code>{content}</code>
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeDeliverable === 'script' && (
                  <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs font-mono leading-relaxed text-slate-100">
                    <code>{scriptText}</code>
                  </pre>
                )}

                {activeDeliverable === 'readme' && (
                  <div className="prose prose-slate max-w-none">
                    <pre className="overflow-x-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                      {readmeText}
                    </pre>
                  </div>
                )}

                {activeDeliverable === 'requirements' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      Install dependencies with{' '}
                      <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        pip install -r requirements.txt
                      </code>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs font-mono leading-relaxed text-slate-100">
                      <code>{requirementsText}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500">
          <span>Data Visualization with Matplotlib &amp; Seaborn · Seaborn Tips Dataset</span>
          <div className="flex items-center gap-5">
            <a href="#overview" className="hover:text-slate-900 transition-colors">
              Overview
            </a>
            <a href="#visualizations" className="hover:text-slate-900 transition-colors">
              Charts
            </a>
            <a href="#dashboard" className="hover:text-slate-900 transition-colors">
              Dashboard
            </a>
            <a href="#deliverables" className="hover:text-slate-900 transition-colors">
              Files
            </a>
          </div>
        </div>
      </footer>

      {/* Modal: Full-size Chart + Exact Python Snippet */}
      {selectedChart && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chart-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setSelectedChart(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs text-slate-500">
                  Chart {selectedChart.index} · {selectedChart.chartType}
                </p>
                <h3 id="chart-modal-title" className="text-lg font-bold text-slate-900">
                  {selectedChart.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedChart.imagePath}
                  download={selectedChart.filename}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Download PNG
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedChart(null)}
                  aria-label="Close modal"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <img
                  src={selectedChart.imagePath}
                  alt={selectedChart.title}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[420px] object-contain mx-auto"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">
                    Python Matplotlib / Seaborn Code
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedChart.pythonSnippet, selectedChart.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
                  >
                    {copiedId === selectedChart.id ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy Snippet
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs font-mono leading-relaxed text-slate-100">
                  <code>{selectedChart.pythonSnippet}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
