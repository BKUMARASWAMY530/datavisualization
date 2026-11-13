# Data Visualization with Matplotlib & Seaborn

## 1. Project Introduction
This project presents a complete, beginner-friendly Exploratory Data Analysis (EDA) and Data Visualization workflow in Python using **Pandas**, **NumPy**, **Matplotlib**, and **Seaborn**. Using the classic restaurant **Tips** dataset, the project demonstrates how to inspect raw data, verify data quality, extract descriptive statistics, and communicate clear visual insights across individual charts and a 2×2 executive dashboard.

## 2. Problem Statement
Hospitality and service businesses collect transaction-level billing and tipping records, yet raw tables alone do not reveal spending distributions, peak tipping days, or how party size and meal time relate to tip amounts. Without structured visual exploration, managers cannot easily understand customer tipping behavior or check whether patterns are consistent or driven by outliers.

## 3. Objectives
- Load and inspect the Seaborn `tips` dataset programmatically.
- Check for missing values, inspect data types, and remove exact duplicate records.
- Generate statistical summaries (`mean`, `median`, `std`, quartiles, and grouped aggregates).
- Build six distinct, well-labeled visualizations (`histogram`, `bar chart`, `scatter plot`, `box plot`, `correlation heatmap`, and `pair plot`).
- Assemble a 2×2 multi-chart dashboard (`tips_overview.png`) saved at 150 DPI.
- Document objective, data-backed insights for every visualization without unsupported claims.

## 4. Dataset Description
The project uses Seaborn's built-in **`tips`** dataset (`sns.load_dataset('tips')`), which contains **244 raw rows** (**243 rows** after removing 1 exact duplicate record) and **7 columns**:

| Column | Type | Description |
| :--- | :--- | :--- |
| `total_bill` | `float64` | Total restaurant bill in US dollars (`$3.07` – `$50.81`) |
| `tip` | `float64` | Gratuity / tip amount in US dollars (`$1.00` – `$10.00`) |
| `sex` | `category` | Gender of the bill payer (`Male`, `Female`) |
| `smoker` | `category` | Whether the dining party included smokers (`Yes`, `No`) |
| `day` | `category` | Day of the week (`Thur`, `Fri`, `Sat`, `Sun`) |
| `time` | `category` | Meal service period (`Lunch`, `Dinner`) |
| `size` | `int64` | Number of people in the dining party (`1` – `6`) |

## 5. Tools and Technologies
- **Python 3.10+** — Core programming language
- **Pandas** — Data loading, inspection, cleaning, and grouped aggregation
- **NumPy** — Linear trend fitting (`np.polyfit`) and numerical arrays
- **Matplotlib** — Figure sizing, subplot layout (`plt.subplots(2, 2)`), reference lines, and 150 DPI export
- **Seaborn** — High-level statistical charts (`histplot`, `barplot`, `scatterplot`, `boxplot`, `heatmap`, `pairplot`)
- **Jupyter Notebook / Google Colab** — Interactive analysis environment

## 6. Methodology
1. **Data Loading**: Load `tips` via `sns.load_dataset('tips')` and save a reproducible CSV copy in `dataset/tips.csv`.
2. **Data Inspection**: Examine row/column counts (`df.shape`), data types (`df.info()`), and initial records (`df.head()`).
3. **Quality Checks & Cleaning**: Verify `0` missing values across all 7 columns (`df.isnull().sum()`), detect `1` exact duplicate row (`$13.00` bill, `$2.00` tip, Female, Yes, Thur, Lunch, size 2), and remove the duplicate to yield `243` unique table records (`dataset/tips_cleaned.csv`).
4. **Exploratory Data Analysis**: Compute summary statistics (`df.describe()`), grouped averages by `day` and `time`, and Pearson correlations among numerical columns.
5. **Visualization & Dashboarding**: Render all 6 individual charts plus the 2×2 dashboard (`outputs/tips_overview.png`) with consistent color palettes, titles, axis labels, and legends.

## 7. Visualization Results
All charts are saved inside `outputs/`:
1. `outputs/histogram.png` — Distribution of `total_bill` with KDE curve, mean (`$19.81`), and median (`$17.81`).
2. `outputs/bar_chart.png` — Average `tip` across `Thur` (`$2.78`), `Fri` (`$2.73`), `Sat` (`$2.99`), and `Sun` (`$3.26`).
3. `outputs/scatter_plot.png` — `total_bill` vs. `tip` grouped by `time` (`Lunch` / `Dinner`) with linear fit (`y = 0.10x + 0.92`).
4. `outputs/box_plot.png` — Tip quartiles, medians, and outliers across all four service days.
5. `outputs/correlation_heatmap.png` — Pearson correlation matrix for `total_bill`, `tip`, and `size`.
6. `outputs/pair_plot.png` — Pairwise scatter plots and histograms segmented by `time`.
7. `outputs/tips_overview.png` — Combined 2×2 dashboard saved at 150 DPI.

## 8. Key Findings
- **Bill Distribution**: Total bills are right-skewed (`mean = $19.81`, `median = $17.81`), with 50% of tables falling between `$13.38` and `$24.18`.
- **Bill-to-Tip Relationship**: `total_bill` and `tip` have a moderate-to-strong positive correlation (`r = 0.67`), meaning larger bills generally correspond to larger tips, though variance widens above `$30`.
- **Weekend vs. Weekday Tips**: Sunday records both the highest mean tip (`$3.26`) and highest median tip (`$3.15`), while Saturday has the largest spread (`std = $1.63`) and the dataset's maximum tip (`$10.00`).
- **Meal Time Differences**: Dinner tables average higher bills (`$20.80`) and tips (`$3.10`) than Lunch tables (`$17.23` bill, `$2.74` tip).
- **Party Size Effect**: Party `size` correlates positively with `total_bill` (`r = 0.60`) and moderately with `tip` (`r = 0.49`).

## 9. Conclusion
The Seaborn `tips` dataset demonstrates clear, interpretable relationships between bill total, meal period, day of the week, and tipping amounts. Cleaning the single duplicate record ensures accurate counts, and combining complementary chart types—histograms for shape, box plots for spread/outliers, scatter plots for linear trends, and heatmaps for correlation strength—provides a complete analytical narrative suitable for stakeholder reporting.

## 10. Instructions to Run the Project

### Option A: Run the Python Script Locally
```bash
# 1. Navigate to the project folder
cd Data-Visualization-Project

# 2. Install required packages
pip install -r requirements.txt

# 3. Execute the visualization pipeline
python src/visualization.py
```
All generated CSV files and PNG charts will be written to `dataset/` and `outputs/`.

### Option B: Run in Jupyter Notebook or Google Colab
1. Launch Jupyter Notebook:
   ```bash
   jupyter notebook notebooks/data_visualization.ipynb
   ```
   Or upload `notebooks/data_visualization.ipynb` directly to **Google Colab**.
2. Run all cells sequentially from top to bottom.
