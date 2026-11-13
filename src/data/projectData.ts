export interface ChartInsight {
  id: string;
  index: string;
  title: string;
  chartType: string;
  imagePath: string;
  filename: string;
  represents: string;
  patterns: string;
  relationship: string;
  takeaway: string;
  pythonSnippet: string;
}

export interface EdaSummary {
  raw_rows: number;
  raw_cols: number;
  clean_rows: number;
  duplicate_count: number;
  missing_values: Record<string, number>;
  summary_stats: Record<
    string,
    {
      count: number;
      mean: number;
      std: number;
      min: number;
      '25%': number;
      '50%': number;
      '75%': number;
      max: number;
    }
  >;
  tip_by_day: Record<
    string,
    {
      count: number;
      mean: number;
      median: number;
      std: number;
      min: number;
      max: number;
    }
  >;
  avg_by_time: Record<
    string,
    {
      total_bill: number;
      tip: number;
      size: number;
    }
  >;
  correlation: Record<string, Record<string, number>>;
}

export interface TipRecord {
  total_bill: number;
  tip: number;
  sex: string;
  smoker: string;
  day: string;
  time: string;
  size: number;
}

export const CHART_INSIGHTS: ChartInsight[] = [
  {
    id: 'histogram',
    index: '01',
    title: 'Distribution of Total Restaurant Bills',
    chartType: 'Histogram & KDE Curve',
    imagePath: '/outputs/histogram.png',
    filename: 'histogram.png',
    represents:
      'Frequency distribution of total bill amounts across all 243 unique dining tables, paired with a Kernel Density Estimate (KDE) curve and vertical markers for the mean ($19.81) and median ($17.81).',
    patterns:
      'The distribution is noticeably right-skewed: most tables fall between $10 and $25, with a peak around $15–$18 and a long upper tail extending to $50.81.',
    relationship:
      'High-value checks in the upper tail pull the arithmetic mean ($19.81) two dollars above the median ($17.81), showing why median and quartiles are helpful alongside the mean.',
    takeaway:
      'Half of all dining parties spend between $13.38 and $24.18, with a typical (median) bill of $17.81.',
    pythonSnippet: `fig, ax = plt.subplots(figsize=(9, 5.5))
sns.histplot(data=df, x="total_bill", bins=20, kde=True, color="#2563EB", edgecolor="white", alpha=0.82, ax=ax)
ax.axvline(df["total_bill"].mean(), color="#DC2626", linestyle="--", linewidth=1.8, label=f"Mean: \${df['total_bill'].mean():.2f}")
ax.axvline(df["total_bill"].median(), color="#059669", linestyle=":", linewidth=2.0, label=f"Median: \${df['total_bill'].median():.2f}")
ax.set_title("Distribution of Total Restaurant Bills", pad=12)
ax.set_xlabel("Total Bill ($)")
ax.set_ylabel("Number of Tables (Frequency)")
ax.legend()
plt.tight_layout()
fig.savefig(outputs_dir / "histogram.png", dpi=150)`,
  },
  {
    id: 'bar_chart',
    index: '02',
    title: 'Average Tip Amount by Day of Week',
    chartType: 'Bar Chart',
    imagePath: '/outputs/bar_chart.png',
    filename: 'bar_chart.png',
    represents:
      'Comparison of the mean dollar tip per table across the four recorded service days: Thursday (n = 61), Friday (n = 19), Saturday (n = 87), and Sunday (n = 76).',
    patterns:
      'Average tips climb over the weekend, rising from $2.78 on Thursday and $2.73 on Friday to $2.99 on Saturday and peaking at $3.26 on Sunday.',
    relationship:
      'Day of the week aligns with meal service mix—Thursday consists predominantly of Lunch orders, whereas Saturday and Sunday consist entirely of Dinner service, which carries higher average bills.',
    takeaway:
      'Sunday service yields the highest average tip at $3.26 per table, roughly $0.53 higher than Friday ($2.73).',
    pythonSnippet: `day_order = ["Thur", "Fri", "Sat", "Sun"]
day_palette = ["#2563EB", "#0EA5E9", "#0D9488", "#4F46E5"]
fig, ax = plt.subplots(figsize=(9, 5.5))
avg_tips = df.groupby("day", observed=False)["tip"].mean().reindex(day_order)
bars = sns.barplot(x=avg_tips.index, y=avg_tips.values, hue=avg_tips.index, palette=day_palette, legend=False, ax=ax)
for bar, val in zip(bars.patches, avg_tips.values):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.06, f"\${val:.2f}", ha="center", va="bottom", fontweight="semibold")
ax.set_title("Average Tip Amount by Day of Week", pad=12)
ax.set_xlabel("Day of Week")
ax.set_ylabel("Average Tip ($)")
plt.tight_layout()
fig.savefig(outputs_dir / "bar_chart.png", dpi=150)`,
  },
  {
    id: 'scatter_plot',
    index: '03',
    title: 'Relationship Between Total Bill and Tip',
    chartType: 'Scatter Plot & Linear Fit',
    imagePath: '/outputs/scatter_plot.png',
    filename: 'scatter_plot.png',
    represents:
      'Table-level pairing of total bill (horizontal axis) against tip amount (vertical axis), segmented by Lunch vs. Dinner and overlaid with a least-squares linear regression line.',
    patterns:
      'Data points cluster tightly below $25 and fan outward as total bills rise above $30, indicating greater tipping variance on larger tabs.',
    relationship:
      'Total bill and tip exhibit a clear positive linear association (y = 0.10x + 0.92, Pearson r = 0.67), while Dinner tables occupy most of the upper-right high-spend region.',
    takeaway:
      'Higher restaurant bills are strongly associated with larger dollar tips, though individual generosity varies more widely on checks above $30.',
    pythonSnippet: `fig, ax = plt.subplots(figsize=(9, 5.5))
sns.scatterplot(data=df, x="total_bill", y="tip", hue="time", style="time",
                palette={"Lunch": "#0EA5E9", "Dinner": "#1D4ED8"}, s=65, alpha=0.82, ax=ax)
slope, intercept = np.polyfit(df["total_bill"], df["tip"], 1)
x_vals = np.linspace(df["total_bill"].min(), df["total_bill"].max(), 100)
ax.plot(x_vals, slope * x_vals + intercept, color="#DC2626", linestyle="--", linewidth=1.8,
        label=f"Linear Fit (y = {slope:.2f}x + {intercept:.2f})")
ax.set_title("Relationship Between Total Bill and Tip", pad=12)
ax.legend(title="Meal Time / Fit")
plt.tight_layout()
fig.savefig(outputs_dir / "scatter_plot.png", dpi=150)`,
  },
  {
    id: 'box_plot',
    index: '04',
    title: 'Tip Distribution Across Days of the Week',
    chartType: 'Box Plot',
    imagePath: '/outputs/box_plot.png',
    filename: 'box_plot.png',
    represents:
      'Five-number distribution summary (minimum whisker, 25th percentile, median line, 75th percentile, and outlier circles) of tip amounts across Thursday through Sunday.',
    patterns:
      'Saturday exhibits the widest spread (std = $1.63) and multiple upper outliers reaching $10.00, whereas Sunday has the highest median tip ($3.15) without extreme upper outliers.',
    relationship:
      'Comparing medians rather than means alone confirms that Sunday tipping is consistently higher across typical tables rather than skewed by one exceptionally large tip.',
    takeaway:
      'Sunday delivers the highest typical tip (median $3.15), while Saturday produces the widest spread and the dataset maximum of $10.00.',
    pythonSnippet: `fig, ax = plt.subplots(figsize=(9, 5.5))
sns.boxplot(data=df, x="day", y="tip", order=day_order, hue="day", hue_order=day_order,
            palette=day_palette, legend=False, width=0.55,
            flierprops={"marker": "o", "markersize": 5, "alpha": 0.65}, ax=ax)
ax.set_title("Tip Distribution Across Days of the Week", pad=12)
ax.set_xlabel("Day of Week")
ax.set_ylabel("Tip ($)")
plt.tight_layout()
fig.savefig(outputs_dir / "box_plot.png", dpi=150)`,
  },
  {
    id: 'correlation_heatmap',
    index: '05',
    title: 'Correlation Heatmap of Numerical Features',
    chartType: 'Correlation Matrix Heatmap',
    imagePath: '/outputs/correlation_heatmap.png',
    filename: 'correlation_heatmap.png',
    represents:
      'Pairwise Pearson correlation coefficients (r) across the three numerical columns in the dataset: total_bill, tip, and party size.',
    patterns:
      'All pairwise correlations are positive: total_bill and tip correlate at r = 0.67, total_bill and size at r = 0.60, and tip and size at r = 0.49.',
    relationship:
      'Larger dining parties generally accumulate higher total bills (r = 0.60), and higher bills translate into higher tips (r = 0.67), making bill size a stronger linear predictor of tip than headcount alone.',
    takeaway:
      'Total bill has the strongest linear correlation with tip (r = 0.67), ahead of party size (r = 0.49).',
    pythonSnippet: `fig, ax = plt.subplots(figsize=(7.5, 6))
corr = df[["total_bill", "tip", "size"]].corr()
sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", vmin=-1, vmax=1,
            center=0, square=True, linewidths=1.2,
            cbar_kws={"shrink": 0.82, "label": "Pearson Correlation (r)"}, ax=ax)
ax.set_title("Correlation Heatmap of Numerical Features", pad=12)
plt.tight_layout()
fig.savefig(outputs_dir / "correlation_heatmap.png", dpi=150)`,
  },
  {
    id: 'pair_plot',
    index: '06',
    title: 'Pairwise Relationships Among Numerical Features',
    chartType: 'Seaborn Pair Plot',
    imagePath: '/outputs/pair_plot.png',
    filename: 'pair_plot.png',
    represents:
      'A 3×3 grid displaying scatter plots for every pair of numerical variables (total_bill, tip, size) alongside stacked histograms on the diagonal, colored by meal time.',
    patterns:
      'Dinner observations (dark blue) extend further along both the bill and tip axes than Lunch observations (light blue), and discrete party sizes (1–6) show upward-shifting bill ranges.',
    relationship:
      'All three numerical variables move positively together across both meal services without separate non-linear clusters, confirming steady linear scaling.',
    takeaway:
      'Dinner service drives higher bill totals and larger party counts than Lunch while preserving a consistent positive bill-to-tip trend.',
    pythonSnippet: `pair_grid = sns.pairplot(
    data=df, vars=["total_bill", "tip", "size"], hue="time",
    palette={"Lunch": "#0EA5E9", "Dinner": "#1D4ED8"},
    diag_kind="hist", plot_kws={"alpha": 0.72, "s": 42}, height=2.8
)
pair_grid.figure.suptitle("Pairwise Relationships Among Numerical Features by Meal Time", y=1.02, fontsize=13, fontweight="bold")
pair_grid.savefig(outputs_dir / "pair_plot.png", dpi=150, bbox_inches="tight")`,
  },
];

export const PROJECT_TREE = `Data-Visualization-Project/
├── dataset/
│   ├── tips.csv
│   └── tips_cleaned.csv
├── notebooks/
│   └── data_visualization.ipynb
├── outputs/
│   ├── histogram.png
│   ├── bar_chart.png
│   ├── scatter_plot.png
│   ├── box_plot.png
│   ├── correlation_heatmap.png
│   ├── pair_plot.png
│   ├── tips_overview.png
│   └── eda_summary.json
├── src/
│   └── visualization.py
├── README.md
└── requirements.txt`;
