"""
LateralShield — Visualization Module
All plots. Tested: matplotlib 3.x, seaborn 0.12+, shap 0.51
"""
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import io, base64
from sklearn.metrics import roc_curve

C = {
    "normal":  "#378ADD",
    "attack":  "#E24B4A",
    "fused":   "#1D9E75",
    "neutral": "#888780",
    "warn":    "#FF8C00",
    "bg":      "#FAFAFA",
    "grid":    "#EEEEEE",
}


def _style(ax, title="", xlabel="", ylabel=""):
    ax.set_facecolor(C["bg"])
    ax.grid(True, color=C["grid"], linewidth=0.8, zorder=0)
    ax.spines[["top","right"]].set_visible(False)
    ax.spines[["left","bottom"]].set_color("#CCCCCC")
    if title:  ax.set_title(title,  fontsize=12, fontweight="bold", pad=10)
    if xlabel: ax.set_xlabel(xlabel, fontsize=10)
    if ylabel: ax.set_ylabel(ylabel, fontsize=10)


def fig_to_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="white")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


def plot_score_distribution(fused: np.ndarray,
                             y: pd.Series,
                             threshold: float) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(9, 4))
    y_arr = np.array(y)
    ax.hist(fused[y_arr==0], bins=60, alpha=0.65,
            color=C["normal"], label="Normal traffic", zorder=3)
    ax.hist(fused[y_arr==1], bins=60, alpha=0.65,
            color=C["attack"], label="Attack traffic",  zorder=3)
    ax.axvline(threshold, color=C["warn"], lw=2, ls="--",
               label=f"Alert threshold ({threshold:.3f})", zorder=4)
    _style(ax, "Anomaly Score Distribution",
           "Fused Anomaly Score (higher = more suspicious)",
           "Number of Events")
    ax.legend(fontsize=9)
    fig.tight_layout()
    return fig


def plot_confusion_matrix(cm: np.ndarray) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(5, 4))
    tn, fp, fn, tp = int(cm[0,0]), int(cm[0,1]), int(cm[1,0]), int(cm[1,1])
    vals   = [[tn, fp], [fn, tp]]
    labels = [["TN — Correct Normal", "FP — False Alarm"],
              ["FN — Missed Attack",  "TP — Caught Attack"]]
    clrs   = [[C["normal"]+"66", "#FFA07A66"],
              ["#FFA07A66",      C["fused"]+"66"]]
    for i in range(2):
        for j in range(2):
            ax.add_patch(plt.Rectangle((j,1-i),1,1, color=clrs[i][j]))
            ax.text(j+0.5, 1.5-i, f"{labels[i][j]}\n{vals[i][j]:,}",
                    ha="center", va="center", fontsize=10, fontweight="bold")
    ax.set_xlim(0,2); ax.set_ylim(0,2)
    ax.set_xticks([0.5,1.5]); ax.set_xticklabels(["Predicted Normal","Predicted Attack"])
    ax.set_yticks([0.5,1.5]); ax.set_yticklabels(["Actual Attack","Actual Normal"])
    ax.set_title("Confusion Matrix", fontsize=12, fontweight="bold", pad=10)
    ax.spines[:].set_visible(False); ax.tick_params(length=0)
    fig.tight_layout()
    return fig


def plot_roc_curve(y: pd.Series, fused: np.ndarray, auc: float) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(5, 5))
    try:
        fpr_v, tpr_v, _ = roc_curve(np.array(y), fused)
        ax.plot(fpr_v, tpr_v, color=C["fused"], lw=2.5,
                label=f"LateralShield  AUC={auc:.4f}")
        ax.fill_between(fpr_v, tpr_v, alpha=0.08, color=C["fused"])
    except Exception:
        ax.text(0.5, 0.5, "ROC unavailable", ha="center", va="center")
    ax.plot([0,1],[0,1], color=C["neutral"], lw=1.2, ls="--", label="Random")
    _style(ax, "ROC Curve", "False Positive Rate", "True Positive Rate")
    ax.legend(fontsize=9); ax.set_xlim(0,1); ax.set_ylim(0,1)
    fig.tight_layout()
    return fig


def plot_contamination_tuning(df: pd.DataFrame) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.plot(df["contamination"], df["f1_score"], "o-",
            color=C["fused"], lw=2.5, ms=8, label="F1 Score", zorder=3)
    ax.plot(df["contamination"], df["precision"], "s--",
            color=C["normal"], lw=1.8, ms=6, label="Precision", zorder=3)
    ax.plot(df["contamination"], df["recall"], "^--",
            color=C["attack"], lw=1.8, ms=6, label="Recall", zorder=3)
    if len(df):
        best = df.loc[df["f1_score"].idxmax()]
        ax.axvline(best["contamination"], color=C["warn"], lw=1.5, ls=":")
        ax.annotate(f"Best F1={best['f1_score']:.3f}",
                    xy=(best["contamination"], best["f1_score"]),
                    xytext=(best["contamination"]+0.01, best["f1_score"]-0.06),
                    fontsize=9, color=C["warn"],
                    arrowprops=dict(arrowstyle="->", color=C["warn"]))
    _style(ax, "Contamination Parameter Tuning", "Contamination", "Score")
    ax.legend(fontsize=9); ax.set_ylim(0, 1.05)
    fig.tight_layout()
    return fig


def plot_shap_summary(shap_values: np.ndarray,
                       X: pd.DataFrame,
                       max_display: int = 15) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(8, 5))
    try:
        mean_abs = np.abs(shap_values).mean(axis=0)
        imp = pd.Series(mean_abs, index=X.columns).sort_values()
        imp = imp.tail(max_display)
        colors = [C["fused"] if v > imp.median() else C["normal"]
                  for v in imp.values]
        imp.plot(kind="barh", ax=ax, color=colors, edgecolor="none", zorder=3)
        _style(ax, "Feature Importance (SHAP)",
               "Mean |SHAP Value|", "")
        ax.tick_params(axis="y", labelsize=9)
    except Exception as e:
        ax.text(0.5, 0.5, f"SHAP plot error: {e}", ha="center", va="center",
                transform=ax.transAxes, fontsize=10)
    fig.tight_layout()
    return fig


def plot_shap_waterfall(sv_single: np.ndarray,
                         feat_names: list,
                         feat_values: np.ndarray,
                         top_n: int = 10) -> plt.Figure:
    """Manual waterfall — no dependency on shap.plots (version-safe)."""
    fig, ax = plt.subplots(figsize=(8, 5))
    try:
        n = min(top_n, len(sv_single))
        idx    = np.argsort(np.abs(sv_single))[-n:][::-1]
        sv     = sv_single[idx]
        names  = [feat_names[i] for i in idx]
        fvals  = feat_values[idx]
        colors = [C["attack"] if v > 0 else C["normal"] for v in sv]
        ax.barh(range(n), sv, color=colors, edgecolor="none", height=0.6, zorder=3)
        labels = [f"{nm} = {fv:.3f}" for nm, fv in zip(names, fvals)]
        ax.set_yticks(range(n)); ax.set_yticklabels(labels, fontsize=9)
        ax.axvline(0, color="#AAAAAA", lw=0.8)
        r_p = mpatches.Patch(color=C["attack"], label="→ anomaly")
        b_p = mpatches.Patch(color=C["normal"], label="→ normal")
        ax.legend(handles=[r_p, b_p], fontsize=9, loc="lower right")
        _style(ax, "Why This Event Was Flagged (SHAP)",
               "SHAP Value (contribution to anomaly score)", "")
    except Exception as e:
        ax.text(0.5, 0.5, f"Waterfall error: {e}", ha="center", va="center",
                transform=ax.transAxes, fontsize=10)
    fig.tight_layout()
    return fig


def plot_attack_timeline(fused: np.ndarray,
                          y: pd.Series,
                          threshold: float,
                          window: int = 500) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(10, 3.5))
    try:
        n   = min(window, len(fused))
        sc  = fused[-n:]
        yt  = np.array(y)[-n:]
        idx = np.arange(n)

        ax.plot(idx, sc, color=C["neutral"], lw=0.8, alpha=0.7, zorder=2)
        ax.fill_between(idx, sc, alpha=0.12, color=C["neutral"], zorder=1)

        atk = np.where(yt == 1)[0]
        if len(atk):
            ax.scatter(atk, sc[atk], color=C["attack"],
                       s=12, zorder=4, label="Known attack")

        ax.axhline(threshold, color=C["warn"], lw=1.5, ls="--",
                   label=f"Threshold ({threshold:.3f})", zorder=3)
        _style(ax, "Real-Time Anomaly Score Timeline (last 500 events)",
               "Event Index", "Anomaly Score")
        ax.legend(fontsize=9); ax.set_xlim(0, n)
    except Exception as e:
        ax.text(0.5, 0.5, f"Timeline error: {e}", ha="center", va="center",
                transform=ax.transAxes)
    fig.tight_layout()
    return fig


def plot_metrics_card(m: dict) -> plt.Figure:
    labels = ["Precision","Recall","F1 Score","AUC-ROC"]
    vals   = [m["precision"], m["recall"], m["f1_score"], m["auc_roc"]]
    colors = [C["normal"], C["fused"], C["attack"], "#7F77DD"]

    fig, axes = plt.subplots(1, 4, figsize=(10, 2.5))
    for ax, lbl, val, col in zip(axes, labels, vals, colors):
        ax.set_facecolor(col + "22")
        ax.text(0.5, 0.55, f"{val:.4f}", ha="center", va="center",
                fontsize=22, fontweight="bold", color=col,
                transform=ax.transAxes)
        ax.text(0.5, 0.18, lbl, ha="center", va="center",
                fontsize=11, color="#555555", transform=ax.transAxes)
        ax.set_xticks([]); ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_edgecolor(col); spine.set_linewidth(1.5)
    fig.suptitle("LateralShield — Detection Performance",
                 fontsize=12, fontweight="bold", y=1.02)
    fig.tight_layout()
    return fig
