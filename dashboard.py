"""
LateralShield — Streamlit Dashboard
VisionX 2026 · 36-Hour National Hackathon
Run: streamlit run dashboard.py
"""
import os, sys, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import numpy as np
import pandas as pd
import streamlit as st
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ── Page config (MUST be first Streamlit call) ─────────────────────────────────
st.set_page_config(
    page_title="LateralShield — Lateral Movement Detection",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Imports (after page config) ────────────────────────────────────────────────
from model import (
    train_model, predict, evaluate,
    tune_contamination, get_shap_explainer,
    get_shap_values, get_base_value
)
from data_generator import generate_dataset
from visualizations import (
    plot_score_distribution, plot_confusion_matrix, plot_roc_curve,
    plot_contamination_tuning, plot_shap_summary, plot_shap_waterfall,
    plot_attack_timeline, plot_metrics_card
)

# ── CSS ────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
  .header-box {
    background: #0a1628;
    padding: 1.4rem 2rem;
    border-radius: 12px;
    margin-bottom: 1.2rem;
  }
  .header-box h1 { color: #ffffff; margin:0; font-size:1.9rem; }
  .header-box p  { color: #7eb3e8; margin:0.25rem 0 0; font-size:0.95rem; }
  .info-card {
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    padding: 1rem 1.2rem;
    margin-bottom: 0.6rem;
  }
  .info-card h4 { margin: 0 0 0.4rem; color: #1a3a5c; }
  .info-card p  { margin: 0; color: #555; font-size: 0.88rem; }
  .alert-row {
    border-left: 4px solid #E24B4A;
    background: #fff5f5;
    padding: 0.5rem 0.8rem;
    border-radius: 3px;
    margin: 0.3rem 0;
    font-size: 0.85rem;
  }
</style>
""", unsafe_allow_html=True)

# ── Session state init ─────────────────────────────────────────────────────────
for k, v in {
    "X": None, "y": None, "model": None,
    "result": None, "metrics": None,
    "shap_values": None, "X_shap": None,
    "explainer": None, "tuning_df": None,
    "trained": False, "data_label": "",
    "run_error": None, "tune_error": None,
}.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="header-box">
  <h1>🛡️ LateralShield</h1>
  <p>Context-Aware Lateral Movement Detection &nbsp;·&nbsp;
     Isolation Forest + SHAP Explainability &nbsp;·&nbsp;
     VisionX 2026</p>
</div>
""", unsafe_allow_html=True)

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## ⚙️ Configuration")
    st.divider()

    # Data source
    st.markdown("### 1. Data Source")
    src = st.radio("Choose:", ["Synthetic Demo Data", "Upload UNSW-NB15 CSV"],
                   key="data_src")
    uploaded_file = None
    if src == "Upload UNSW-NB15 CSV":
        uploaded_file = st.file_uploader(
            "Upload UNSW-NB15_1.csv or UNSW-NB15_2.csv",
            type=["csv"],
            help="Download from kaggle.com → search 'UNSW-NB15'"
        )
        if uploaded_file is None:
            st.info("No file uploaded yet. Using synthetic data until you upload.")

    st.divider()

    # Model settings
    st.markdown("### 2. Model Settings")
    contamination = st.slider(
        "Contamination (expected % attacks)",
        min_value=0.01, max_value=0.30, value=0.10, step=0.01,
        help="Higher → more events flagged. Tune to balance precision vs recall."
    )
    context_weight = st.slider(
        "Context Weight",
        min_value=0.0, max_value=0.50, value=0.25, step=0.05,
        help="Weight of context-aware scoring in fused score."
    )
    sample_size = st.select_slider(
        "Sample Size",
        options=[5000, 10000, 20000, 30000, 50000],
        value=20000
    )

    st.divider()

    # Action buttons
    run_btn  = st.button("🚀 Run Detection",      use_container_width=True, type="primary")
    tune_btn = st.button("🔧 Run Tuning Sweep",   use_container_width=True)
    reset_btn= st.button("🔄 Reset",              use_container_width=True)

    if reset_btn:
        for k in ["X","y","model","result","metrics","shap_values",
                  "X_shap","explainer","tuning_df","trained",
                  "data_label","run_error","tune_error"]:
            st.session_state[k] = None if k not in ["trained"] else False
        st.rerun()

    st.divider()
    st.markdown("**Status:**")
    if st.session_state["trained"]:
        st.success("Model trained ✓")
        m = st.session_state["metrics"]
        if m:
            st.markdown(f"F1 = `{m['f1_score']}`")
            st.markdown(f"AUC = `{m['auc_roc']}`")
    else:
        st.info("Not trained yet")


# ══════════════════════════════════════════════════════════════════════════════
# RUN DETECTION
# ══════════════════════════════════════════════════════════════════════════════
if run_btn:
    st.session_state["run_error"] = None
    progress = st.progress(0, text="Starting...")

    try:
        # ── Step 1: Load data ──────────────────────────────────────────────
        progress.progress(10, "Loading data...")

        if uploaded_file is not None:
            from model import load_dataset
            try:
                X, y, scaler, feats = load_dataset(uploaded_file, sample_size)
                label = f"UNSW-NB15 (uploaded, {len(X):,} samples)"
            except Exception as e:
                st.session_state["run_error"] = f"CSV load failed: {e}"
                progress.empty()
                st.error(f"❌ CSV Error: {e}")
                st.info("Tip: Make sure you're uploading UNSW-NB15_1.csv exactly.")
                st.stop()
        else:
            n_atk  = int(sample_size * 0.20)
            n_norm = sample_size - n_atk
            X, y, scaler = generate_dataset(n_norm, n_atk)
            label  = f"Synthetic demo ({len(X):,} samples)"

        st.session_state["X"] = X
        st.session_state["y"] = y
        st.session_state["data_label"] = label

        # ── Step 2: Train ──────────────────────────────────────────────────
        progress.progress(30, "Training Isolation Forest on normal traffic...")
        model = train_model(X, y, contamination=contamination)
        st.session_state["model"] = model

        # ── Step 3: Predict ────────────────────────────────────────────────
        progress.progress(55, "Computing anomaly scores...")
        result = predict(model, X, context_weight=context_weight)
        st.session_state["result"] = result

        # ── Step 4: Evaluate ───────────────────────────────────────────────
        progress.progress(70, "Evaluating...")
        metrics = evaluate(y, result)
        st.session_state["metrics"] = metrics

        # ── Step 5: SHAP ───────────────────────────────────────────────────
        progress.progress(80, "Computing SHAP explanations (may take 30s)...")
        shap_n    = min(300, len(X))
        X_shap    = X.sample(shap_n, random_state=42).reset_index(drop=True)
        try:
            explainer  = get_shap_explainer(model, X_shap)
            shap_vals  = get_shap_values(explainer, X_shap)
            st.session_state["explainer"]   = explainer
            st.session_state["shap_values"] = shap_vals
            st.session_state["X_shap"]      = X_shap
        except Exception as se:
            # SHAP failure is non-fatal — dashboard still works
            st.session_state["shap_values"] = None
            st.session_state["run_error"]   = f"SHAP warning: {se}"

        st.session_state["trained"] = True
        progress.progress(100, "Done!")
        progress.empty()
        st.success(f"✅ Detection complete! Data: {label}")

    except Exception as e:
        progress.empty()
        st.session_state["run_error"] = str(e)
        st.error(f"❌ Run failed: {e}")
        st.info("Try reducing Sample Size, or use Synthetic Data.")


# ══════════════════════════════════════════════════════════════════════════════
# TUNING
# ══════════════════════════════════════════════════════════════════════════════
if tune_btn:
    if not st.session_state["trained"]:
        st.sidebar.warning("⚠️ Run Detection first, then tune.")
    else:
        with st.spinner("Running tuning sweep — ~60 seconds..."):
            try:
                tdf = tune_contamination(
                    st.session_state["X"],
                    st.session_state["y"]
                )
                st.session_state["tuning_df"]  = tdf
                st.session_state["tune_error"] = None
                st.sidebar.success("Tuning done! See Parameter Tuning tab.")
            except Exception as e:
                st.session_state["tune_error"] = str(e)
                st.sidebar.error(f"Tuning failed: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# TABS
# ══════════════════════════════════════════════════════════════════════════════
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📊 Overview",
    "📈 Results & Metrics",
    "🚨 Flagged Alerts",
    "🔍 SHAP Explainability",
    "⚙️ Parameter Tuning",
])


# ─────────────────────────────────────────────────────────────────────────────
# TAB 1 — OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────
with tab1:
    if not st.session_state["trained"]:
        st.markdown("### Welcome to LateralShield")
        c1, c2, c3 = st.columns(3)
        with c1:
            st.markdown("""
            <div class='info-card'>
            <h4>🔍 Step 1 — Ingest</h4>
            <p>Network traffic logs are ingested. 26 behavioral features extracted per event (bytes, TTL, packet counts, connection reuse, timing).</p>
            </div>""", unsafe_allow_html=True)
        with c2:
            st.markdown("""
            <div class='info-card'>
            <h4>🌲 Step 2 — Isolate</h4>
            <p>Isolation Forest trained only on normal traffic. No labeled attack data needed. Detects rare anomalous events by how easily they are isolated.</p>
            </div>""", unsafe_allow_html=True)
        with c3:
            st.markdown("""
            <div class='info-card'>
            <h4>💡 Step 3 — Explain</h4>
            <p>Every flagged alert explained via SHAP. Analysts see exactly which features caused the flag — not just 'this is suspicious'.</p>
            </div>""", unsafe_allow_html=True)
        st.info("👈 Click **Run Detection** in the sidebar to begin.")

    else:
        m      = st.session_state["metrics"]
        result = st.session_state["result"]
        X      = st.session_state["X"]
        y      = st.session_state["y"]

        # Metric row
        c1,c2,c3,c4,c5 = st.columns(5)
        c1.metric("Precision",  f"{m['precision']:.4f}")
        c2.metric("Recall",     f"{m['recall']:.4f}")
        c3.metric("F1 Score",   f"{m['f1_score']:.4f}")
        c4.metric("AUC-ROC",    f"{m['auc_roc']:.4f}")
        c5.metric("False Positive Rate", f"{m['fpr']:.4f}")

        st.divider()
        ca, cb = st.columns(2)
        with ca:
            st.markdown("#### Score Distribution")
            fig = plot_score_distribution(result["fused_scores"], y, result["threshold"])
            st.pyplot(fig); plt.close(fig)
        with cb:
            st.markdown("#### Event Timeline")
            fig = plot_attack_timeline(result["fused_scores"], y, result["threshold"])
            st.pyplot(fig); plt.close(fig)

        st.caption(
            f"**Source:** {st.session_state['data_label']}  |  "
            f"**Events:** {len(X):,}  |  "
            f"**Flagged:** {int(result['predictions'].sum()):,}  |  "
            f"**Contamination:** {contamination}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# TAB 2 — RESULTS
# ─────────────────────────────────────────────────────────────────────────────
with tab2:
    if not st.session_state["trained"]:
        st.info("Run Detection first.")
    else:
        m      = st.session_state["metrics"]
        result = st.session_state["result"]
        y      = st.session_state["y"]

        c1, c2 = st.columns(2)
        with c1:
            st.markdown("#### Confusion Matrix")
            fig = plot_confusion_matrix(m["confusion_matrix"])
            st.pyplot(fig); plt.close(fig)
        with c2:
            st.markdown("#### ROC Curve")
            fig = plot_roc_curve(y, result["fused_scores"], m["auc_roc"])
            st.pyplot(fig); plt.close(fig)

        st.divider()
        st.markdown("#### Metrics Card")
        fig = plot_metrics_card(m)
        st.pyplot(fig); plt.close(fig)

        st.divider()
        st.markdown("#### Comparison Table")
        tbl = pd.DataFrame([
            {"Model": "Standard Isolation Forest (baseline)",
             "Precision": "~0.78", "Recall": "~0.74", "F1": "~0.76",
             "FPR": "~0.28", "Source": "Literature baseline"},
            {"Model": "🛡️ LateralShield (our model)",
             "Precision": str(m["precision"]), "Recall": str(m["recall"]),
             "F1": str(m["f1_score"]), "FPR": str(m["fpr"]),
             "Source": "Real experiment"},
        ])
        st.dataframe(tbl, hide_index=True, use_container_width=True)
        st.caption(
            "Baseline from Smiliotopoulos et al. (2024), "
            "*Computers & Security* — direct comparison paper for unsupervised LM detection."
        )

        st.divider()
        st.markdown("#### Full Metrics Detail")
        detail = pd.DataFrame([{
            "Metric": k, "Value": v
            } for k,v in m.items()
            if k not in ["confusion_matrix","tp","fp","tn","fn"]
        ])
        st.dataframe(detail, hide_index=True, use_container_width=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 3 — FLAGGED ALERTS
# ─────────────────────────────────────────────────────────────────────────────
with tab3:
    if not st.session_state["trained"]:
        st.info("Run Detection first.")
    else:
        X      = st.session_state["X"]
        y      = st.session_state["y"]
        result = st.session_state["result"]
        preds  = result["predictions"]
        scores = result["fused_scores"]

        flagged = np.where(preds == 1)[0]
        if len(flagged) == 0:
            st.warning("No events flagged. Try increasing the contamination slider.")
        else:
            st.markdown(f"### 🚨 {len(flagged):,} Events Flagged as Suspicious")

            # Severity
            f_scores = scores[flagged]
            p75 = np.percentile(f_scores, 75)
            p40 = np.percentile(f_scores, 40)
            high   = int((f_scores > p75).sum())
            medium = int(((f_scores > p40) & (f_scores <= p75)).sum())
            low    = int((f_scores <= p40).sum())

            c1,c2,c3 = st.columns(3)
            c1.metric("🔴 High",   high)
            c2.metric("🟡 Medium", medium)
            c3.metric("🟢 Low",    low)

            st.divider()

            # Build table
            alert_df = X.iloc[flagged].copy().reset_index(drop=True)
            alert_df["anomaly_score"] = f_scores.round(4)
            alert_df["true_label"]    = y.iloc[flagged].values

            def sev(s):
                if s > p75: return "High"
                elif s > p40: return "Medium"
                return "Low"
            alert_df["severity"] = alert_df["anomaly_score"].apply(sev)
            alert_df = alert_df.sort_values("anomaly_score", ascending=False)

            show_cols = ["anomaly_score","severity","true_label"] + \
                        [c for c in ["sbytes","dbytes","dur","spkts",
                                     "ct_srv_src","ct_src_ltm"]
                         if c in alert_df.columns]

            st.markdown("#### Top 50 Flagged Events")
            st.dataframe(
                alert_df[show_cols].head(50),
                hide_index=True, use_container_width=True
            )

            csv = alert_df.to_csv(index=False)
            st.download_button(
                "⬇️ Download All Alerts as CSV",
                csv, "lateralshield_alerts.csv", "text/csv"
            )

            st.divider()
            tp = int(((preds==1)&(y==1)).sum())
            fp = int(((preds==1)&(y==0)).sum())
            pct = f"{tp/(tp+fp)*100:.1f}%" if (tp+fp)>0 else "N/A"
            st.markdown(f"""
            **Detection breakdown:**
            - Real attacks correctly caught (TP): **{tp:,}**
            - Normal events falsely flagged (FP): **{fp:,}**
            - Alert accuracy: **{pct}** of alerts are genuine attacks
            """)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 4 — SHAP EXPLAINABILITY
# ─────────────────────────────────────────────────────────────────────────────
with tab4:
    if not st.session_state["trained"]:
        st.info("Run Detection first.")
    elif st.session_state["shap_values"] is None:
        err = st.session_state.get("run_error","")
        st.warning(f"SHAP unavailable. {err}")
        st.info("All other tabs still work. SHAP requires more memory — try reducing sample size to 10000.")
    else:
        sv        = st.session_state["shap_values"]
        X_shap    = st.session_state["X_shap"]
        explainer = st.session_state["explainer"]
        result    = st.session_state["result"]

        c1, c2 = st.columns([1.2, 1])

        with c1:
            st.markdown("#### Global Feature Importance (SHAP)")
            fig = plot_shap_summary(sv, X_shap)
            st.pyplot(fig); plt.close(fig)
            st.caption(
                "Features with higher mean |SHAP| have greater impact on "
                "the anomaly score across all detected events."
            )

        with c2:
            st.markdown("#### Explain a Single Flagged Event")

            # Find flagged events within the SHAP sample
            shap_preds = result["predictions"]
            shap_subset_preds = []
            for i in range(len(X_shap)):
                orig_idx = X_shap.index[i] if hasattr(X_shap.index,'__getitem__') else i
                try:
                    shap_subset_preds.append(int(result["predictions"][orig_idx]))
                except Exception:
                    shap_subset_preds.append(0)
            shap_subset_preds = np.array(shap_subset_preds)

            # Compute scores for shap subset
            try:
                shap_scores = result["fused_scores"][
                    [X_shap.index[i] for i in range(len(X_shap))]
                    if hasattr(X_shap,"index") else range(len(X_shap))
                ]
            except Exception:
                shap_scores = result["fused_scores"][:len(X_shap)]

            flagged_in_shap = np.where(shap_scores > result["threshold"])[0]

            if len(flagged_in_shap) == 0:
                st.info("No flagged events in the SHAP sample. Increase contamination and re-run.")
            else:
                max_show = min(20, len(flagged_in_shap))
                opts = {
                    f"Event #{i}  (score: {shap_scores[flagged_in_shap[i]]:.4f})": i
                    for i in range(max_show)
                }
                chosen_label = st.selectbox("Select event:", list(opts.keys()))
                chosen_pos   = opts[chosen_label]
                chosen_idx   = flagged_in_shap[chosen_pos]

                sv_single  = sv[chosen_idx]
                feat_vals  = X_shap.values[chosen_idx]
                feat_names = list(X_shap.columns)

                fig = plot_shap_waterfall(sv_single, feat_names, feat_vals)
                st.pyplot(fig); plt.close(fig)

                # Textual explanation
                st.markdown("**Why this event was flagged:**")
                top5 = np.argsort(np.abs(sv_single))[-5:][::-1]
                for i in top5:
                    name = feat_names[i]
                    val  = feat_vals[i]
                    shv  = sv_single[i]
                    direction = "🔴 pushed toward anomaly" if shv > 0 else "🟢 pushed toward normal"
                    st.markdown(
                        f"- **{name}** = `{val:.4f}` → {direction} "
                        f"(SHAP contribution: `{shv:+.4f}`)"
                    )


# ─────────────────────────────────────────────────────────────────────────────
# TAB 5 — PARAMETER TUNING
# ─────────────────────────────────────────────────────────────────────────────
with tab5:
    st.markdown("### What is contamination tuning?")
    st.markdown("""
    The **contamination** parameter tells Isolation Forest what fraction of the data
    to treat as anomalous. Too low = miss attacks (low recall).
    Too high = too many false alarms (low precision).

    Click **🔧 Run Tuning Sweep** in the sidebar to automatically find the best value.
    """)

    if st.session_state["tuning_df"] is None:
        if st.session_state.get("tune_error"):
            st.error(f"Tuning failed: {st.session_state['tune_error']}")
        else:
            st.info("Click **🔧 Run Tuning Sweep** in the sidebar after running detection.")
    else:
        tdf  = st.session_state["tuning_df"]
        best = tdf.loc[tdf["f1_score"].idxmax()]

        st.success(
            f"✅ Best contamination = **{best['contamination']}**  →  "
            f"F1 = **{best['f1_score']}**,  "
            f"Precision = **{best['precision']}**,  "
            f"Recall = **{best['recall']}**"
        )

        st.markdown("#### Tuning Chart")
        fig = plot_contamination_tuning(tdf)
        st.pyplot(fig); plt.close(fig)

        st.markdown("#### Full Results Table")
        st.dataframe(
            tdf.style.highlight_max(subset=["f1_score"], color="#d4f5e4")
               .highlight_min(subset=["fpr"],            color="#d4f5e4"),
            hide_index=True, use_container_width=True
        )
        st.caption(
            f"Set contamination slider to **{best['contamination']}** "
            "and re-run detection for optimal results."
        )
