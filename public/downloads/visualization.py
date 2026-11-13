"""
Data Visualization with Matplotlib & Seaborn
------------------------------------------
A beginner-friendly Data Science project that loads, inspects, cleans,
and visualizes the Seaborn 'tips' dataset to uncover tipping patterns
and dining behaviors.
"""

from pathlib import Path
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


def setup_directories(base_dir: Path) -> tuple[Path, Path]:
    """Create dataset and outputs folders if they do not already exist."""
    dataset_dir = base_dir / "dataset"
    outputs_dir = base_dir / "outputs"
    dataset_dir.mkdir(parents=True, exist_ok=True)
    outputs_dir.mkdir(parents=True, exist_ok=True)
    return dataset_dir, outputs_dir


def load_data(dataset_dir: Path) -> pd.DataFrame:
    """Load the Seaborn 'tips' dataset and store a local CSV copy."""
    csv_path = dataset_dir / "tips.csv"
    try:
        df = sns.load_dataset("tips")
        df.to_csv(csv_path, index=False)
        print(f"Loaded 'tips' dataset from Seaborn and saved a copy to {csv_path}")
    except Exception as exc:
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            print(f"Loaded 'tips' dataset from local file {csv_path} ({exc})")
        else:
            raise RuntimeError("Could not load 'tips' dataset from Seaborn or local CSV.") from exc
    return df


def inspect_and_clean_data(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Perform data inspection, missing value checks, duplicate removal, and EDA summaries."""
    print("\n--- 1. First 5 Rows ---")
    print(df.head())

    print(f"\n--- 2. Dataset Shape ---\nRows: {df.shape[0]}, Columns: {df.shape[1]}")

    print("\n--- 3. Data Types & Non-Null Counts ---")
    df.info()

    missing_values = df.isnull().sum()
    print("\n--- 4. Missing Values Per Column ---")
    print(missing_values)

    duplicate_count = int(df.duplicated().sum())
    print(f"\n--- 5. Duplicate Rows Found: {duplicate_count} ---")
    if duplicate_count > 0:
        print("Duplicate record(s):")
        print(df[df.duplicated(keep=False)])

    # Clean dataset by removing exact duplicate rows while preserving original index order
    df_clean = df.drop_duplicates().reset_index(drop=True)
    print(f"\nShape after cleaning duplicates: {df_clean.shape}")

    print("\n--- 6. Statistical Summary (Cleaned Data) ---")
    summary_stats = df_clean.describe().round(4)
    print(summary_stats)

    # Compute grouped EDA metrics for reporting
    day_order = ["Thur", "Fri", "Sat", "Sun"]
    avg_tip_by_day = (
        df_clean.groupby("day", observed=False)["tip"]
        .agg(["count", "mean", "median", "std", "min", "max"])
        .reindex(day_order)
        .round(4)
    )
    print("\n--- 7. Tip Statistics by Day ---")
    print(avg_tip_by_day)

    avg_by_time = (
        df_clean.groupby("time", observed=False)[["total_bill", "tip", "size"]]
        .mean()
        .round(4)
    )
    print("\n--- 8. Average Metrics by Meal Time ---")
    print(avg_by_time)

    corr_matrix = df_clean[["total_bill", "tip", "size"]].corr().round(4)
    print("\n--- 9. Correlation Matrix (Numerical Variables) ---")
    print(corr_matrix)

    eda_report = {
        "raw_rows": int(df.shape[0]),
        "raw_cols": int(df.shape[1]),
        "clean_rows": int(df_clean.shape[0]),
        "duplicate_count": duplicate_count,
        "missing_values": {col: int(val) for col, val in missing_values.items()},
        "summary_stats": summary_stats.to_dict(),
        "tip_by_day": avg_tip_by_day.to_dict(orient="index"),
        "avg_by_time": avg_by_time.to_dict(orient="index"),
        "correlation": corr_matrix.to_dict(),
    }
    return df_clean, eda_report


def configure_plot_style() -> None:
    """Apply a clean, readable visual theme for all Matplotlib and Seaborn figures."""
    sns.set_theme(style="whitegrid", context="notebook")
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "axes.facecolor": "#FAFAFC",
            "axes.edgecolor": "#CBD5E1",
            "axes.titlesize": 13,
            "axes.titleweight": "bold",
            "axes.labelsize": 11,
            "xtick.labelsize": 10,
            "ytick.labelsize": 10,
            "legend.frameon": True,
            "legend.facecolor": "white",
            "legend.edgecolor": "#E2E8F0",
        }
    )


def create_individual_charts(df: pd.DataFrame, outputs_dir: Path) -> None:
    """Generate and save all six individual exploratory visualizations."""
    day_order = ["Thur", "Fri", "Sat", "Sun"]
    day_palette = ["#2563EB", "#0EA5E9", "#0D9488", "#4F46E5"]

    # 1. Histogram: Distribution of Total Bills
    fig, ax = plt.subplots(figsize=(9, 5.5))
    sns.histplot(
        data=df,
        x="total_bill",
        bins=20,
        kde=True,
        color="#2563EB",
        edgecolor="white",
        alpha=0.82,
        ax=ax,
    )
    mean_bill = df["total_bill"].mean()
    median_bill = df["total_bill"].median()
    ax.axvline(mean_bill, color="#DC2626", linestyle="--", linewidth=1.8, label=f"Mean: ${mean_bill:.2f}")
    ax.axvline(median_bill, color="#059669", linestyle=":", linewidth=2.0, label=f"Median: ${median_bill:.2f}")
    ax.set_title("Distribution of Total Restaurant Bills", pad=12)
    ax.set_xlabel("Total Bill ($)")
    ax.set_ylabel("Number of Tables (Frequency)")
    ax.legend()
    plt.tight_layout()
    fig.savefig(outputs_dir / "histogram.png", dpi=150)
    plt.close(fig)

    # 2. Bar Chart: Average Tips for Different Days
    fig, ax = plt.subplots(figsize=(9, 5.5))
    avg_tips = df.groupby("day", observed=False)["tip"].mean().reindex(day_order)
    bars = sns.barplot(
        x=avg_tips.index,
        y=avg_tips.values,
        hue=avg_tips.index,
        palette=day_palette,
        legend=False,
        ax=ax,
    )
    for bar, val in zip(bars.patches, avg_tips.values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.06,
            f"${val:.2f}",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="semibold",
            color="#0F172A",
        )
    ax.set_ylim(0, max(avg_tips.values) * 1.18)
    ax.set_title("Average Tip Amount by Day of Week", pad=12)
    ax.set_xlabel("Day of Week")
    ax.set_ylabel("Average Tip ($)")
    plt.tight_layout()
    fig.savefig(outputs_dir / "bar_chart.png", dpi=150)
    plt.close(fig)

    # 3. Scatter Plot: Relationship Between Total Bill and Tip
    fig, ax = plt.subplots(figsize=(9, 5.5))
    sns.scatterplot(
        data=df,
        x="total_bill",
        y="tip",
        hue="time",
        style="time",
        palette={"Lunch": "#0EA5E9", "Dinner": "#1D4ED8"},
        s=65,
        alpha=0.82,
        ax=ax,
    )
    # Add an overall linear trend line to show positive association
    slope, intercept = np.polyfit(df["total_bill"], df["tip"], 1)
    x_vals = np.linspace(df["total_bill"].min(), df["total_bill"].max(), 100)
    ax.plot(
        x_vals,
        slope * x_vals + intercept,
        color="#DC2626",
        linestyle="--",
        linewidth=1.8,
        label=f"Linear Fit (y = {slope:.2f}x + {intercept:.2f})",
    )
    ax.set_title("Relationship Between Total Bill and Tip", pad=12)
    ax.set_xlabel("Total Bill ($)")
    ax.set_ylabel("Tip ($)")
    ax.legend(title="Meal Time / Fit")
    plt.tight_layout()
    fig.savefig(outputs_dir / "scatter_plot.png", dpi=150)
    plt.close(fig)

    # 4. Box Plot: Tip Distribution Across Different Days
    fig, ax = plt.subplots(figsize=(9, 5.5))
    sns.boxplot(
        data=df,
        x="day",
        y="tip",
        order=day_order,
        hue="day",
        hue_order=day_order,
        palette=day_palette,
        legend=False,
        width=0.55,
        flierprops={"marker": "o", "markersize": 5, "alpha": 0.65},
        ax=ax,
    )
    ax.set_title("Tip Distribution Across Days of the Week", pad=12)
    ax.set_xlabel("Day of Week")
    ax.set_ylabel("Tip ($)")
    plt.tight_layout()
    fig.savefig(outputs_dir / "box_plot.png", dpi=150)
    plt.close(fig)

    # 5. Correlation Heatmap: Numerical Variables
    fig, ax = plt.subplots(figsize=(7.5, 6))
    corr = df[["total_bill", "tip", "size"]].corr()
    sns.heatmap(
        corr,
        annot=True,
        fmt=".2f",
        cmap="coolwarm",
        vmin=-1,
        vmax=1,
        center=0,
        square=True,
        linewidths=1.2,
        cbar_kws={"shrink": 0.82, "label": "Pearson Correlation (r)"},
        ax=ax,
    )
    ax.set_title("Correlation Heatmap of Numerical Features", pad=12)
    plt.tight_layout()
    fig.savefig(outputs_dir / "correlation_heatmap.png", dpi=150)
    plt.close(fig)

    # 6. Pair Plot: Relationships Between Numerical Features
    pair_grid = sns.pairplot(
        data=df,
        vars=["total_bill", "tip", "size"],
        hue="time",
        palette={"Lunch": "#0EA5E9", "Dinner": "#1D4ED8"},
        diag_kind="hist",
        plot_kws={"alpha": 0.72, "s": 42},
        height=2.8,
    )
    pair_grid.figure.suptitle("Pairwise Relationships Among Numerical Features by Meal Time", y=1.02, fontsize=13, fontweight="bold")
    pair_grid.savefig(outputs_dir / "pair_plot.png", dpi=150, bbox_inches="tight")
    plt.close(pair_grid.figure)


def create_four_chart_dashboard(df: pd.DataFrame, outputs_dir: Path) -> None:
    """Create a 2x2 summary dashboard and save it at 150 DPI as tips_overview.png."""
    day_order = ["Thur", "Fri", "Sat", "Sun"]
    day_palette = ["#2563EB", "#0EA5E9", "#0D9488", "#4F46E5"]

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # Top-Left: Histogram of Total Bill
    sns.histplot(
        data=df,
        x="total_bill",
        bins=20,
        kde=True,
        color="#2563EB",
        edgecolor="white",
        alpha=0.82,
        ax=axes[0, 0],
    )
    mean_bill = df["total_bill"].mean()
    axes[0, 0].axvline(mean_bill, color="#DC2626", linestyle="--", linewidth=1.6, label=f"Mean: ${mean_bill:.2f}")
    axes[0, 0].set_title("1. Total Bill Distribution")
    axes[0, 0].set_xlabel("Total Bill ($)")
    axes[0, 0].set_ylabel("Frequency")
    axes[0, 0].legend()

    # Top-Right: Box Plot of Tips by Day
    sns.boxplot(
        data=df,
        x="day",
        y="tip",
        order=day_order,
        hue="day",
        hue_order=day_order,
        palette=day_palette,
        legend=False,
        width=0.55,
        ax=axes[0, 1],
    )
    axes[0, 1].set_title("2. Tip Distribution by Day")
    axes[0, 1].set_xlabel("Day of Week")
    axes[0, 1].set_ylabel("Tip ($)")

    # Bottom-Left: Scatter Plot of Total Bill vs Tip
    sns.scatterplot(
        data=df,
        x="total_bill",
        y="tip",
        hue="time",
        palette={"Lunch": "#0EA5E9", "Dinner": "#1D4ED8"},
        alpha=0.8,
        s=55,
        ax=axes[1, 0],
    )
    slope, intercept = np.polyfit(df["total_bill"], df["tip"], 1)
    x_vals = np.linspace(df["total_bill"].min(), df["total_bill"].max(), 100)
    axes[1, 0].plot(x_vals, slope * x_vals + intercept, color="#DC2626", linestyle="--", linewidth=1.6, label="Trend Line")
    axes[1, 0].set_title("3. Total Bill vs. Tip Relationship")
    axes[1, 0].set_xlabel("Total Bill ($)")
    axes[1, 0].set_ylabel("Tip ($)")
    axes[1, 0].legend(title="Meal Time")

    # Bottom-Right: Correlation Heatmap
    corr = df[["total_bill", "tip", "size"]].corr()
    sns.heatmap(
        corr,
        annot=True,
        fmt=".2f",
        cmap="coolwarm",
        vmin=-1,
        vmax=1,
        center=0,
        square=True,
        linewidths=1,
        cbar_kws={"shrink": 0.8},
        ax=axes[1, 1],
    )
    axes[1, 1].set_title("4. Numerical Feature Correlation")

    fig.suptitle("Restaurant Tips Dataset — Exploratory Dashboard Overview", fontsize=16, fontweight="bold", y=0.98)
    plt.tight_layout(rect=[0, 0, 1, 0.95])
    fig.savefig(outputs_dir / "tips_overview.png", dpi=150)
    plt.close(fig)


def main() -> None:
    """Run the complete data visualization pipeline."""
    # Resolve project root cleanly whether invoked from project root or src/
    script_path = Path(__file__).resolve()
    base_dir = script_path.parent.parent if script_path.parent.name == "src" else Path.cwd()

    dataset_dir, outputs_dir = setup_directories(base_dir)
    configure_plot_style()

    raw_df = load_data(dataset_dir)
    clean_df, eda_report = inspect_and_clean_data(raw_df)

    # Persist cleaned dataset and verified summary metrics for reproducibility
    clean_df.to_csv(dataset_dir / "tips_cleaned.csv", index=False)
    with open(outputs_dir / "eda_summary.json", "w", encoding="utf-8") as f:
        json.dump(eda_report, f, indent=2)

    create_individual_charts(clean_df, outputs_dir)
    create_four_chart_dashboard(clean_df, outputs_dir)
    print(f"\nAll visualizations and dashboard successfully saved to: {outputs_dir}")


if __name__ == "__main__":
    main()
