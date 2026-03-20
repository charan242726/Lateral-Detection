"""
LateralShield — Core ML Pipeline
Tested: sklearn 1.8, numpy 2.4, shap 0.51, pandas 2.3
"""
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
import shap

FEATURES = [
    "dur","sbytes","dbytes","sttl","dttl",
    "sloss","dloss","sload","dload","spkts",
    "dpkts","swin","dwin","smeansz","dmeansz",
    "sjit","djit","sintpkt","dintpkt","tcprtt",
    "synack","ackdat","ct_srv_src","ct_srv_dst",
    "ct_dst_ltm","ct_src_ltm"
]

UNSW_COLUMNS = [
    "srcip","sport","dstip","dsport","proto","state","dur",
    "sbytes","dbytes","sttl","dttl","sloss","dloss","service",
    "sload","dload","spkts","dpkts","swin","dwin","stcpb",
    "dtcpb","smeansz","dmeansz","trans_depth","res_bdy_len",
    "sjit","djit","stime","ltime","sintpkt","dintpkt","tcprtt",
    "synack","ackdat","is_sm_ips_ports","ct_state_ttl",
    "ct_flw_http_mthd","is_ftp_login","ct_ftp_cmd",
    "ct_srv_src","ct_srv_dst","ct_dst_ltm","ct_src_ltm",
    "ct_src_dport_ltm","ct_dst_sport_ltm","ct_dst_src_ltm",
    "attack_cat","label"
]


def load_dataset(filepath, sample_size: int = 50000):
    """Load UNSW-NB15 CSV. Handles header/no-header, bad values, dtypes."""
    try:
        df = pd.read_csv(filepath, low_memory=False)
    except Exception as e:
        raise ValueError(f"Cannot read CSV: {e}")

    if "label" not in df.columns:
        if len(df.columns) == 49:
            df.columns = UNSW_COLUMNS
        elif len(df.columns) == 50:
            df = df.iloc[:, 1:]
            df.columns = UNSW_COLUMNS
        else:
            raise ValueError(f"Expected 49 cols for UNSW-NB15, got {len(df.columns)}")

    df["label"] = pd.to_numeric(df["label"], errors="coerce").fillna(0).astype(int)
    available   = [f for f in FEATURES if f in df.columns]
    if len(available) < 5:
        raise ValueError(f"Only {len(available)} feature cols found. Check CSV format.")

    X_raw = df[available].copy()
    y_raw = df["label"].copy()

    for col in X_raw.columns:
        X_raw[col] = pd.to_numeric(X_raw[col], errors="coerce")

    X_raw.replace([np.inf, -np.inf], np.nan, inplace=True)
    for col in X_raw.columns:
        med = X_raw[col].median()
        X_raw[col] = X_raw[col].fillna(0 if pd.isna(med) else med)
    X_raw.fillna(0, inplace=True)

    for col in X_raw.columns:
        cap = X_raw[col].quantile(0.999)
        if cap > 0:
            X_raw[col] = X_raw[col].clip(upper=cap)

    n_attack     = int(y_raw.sum())
    n_normal     = int((y_raw == 0).sum())
    take_attack  = min(int(sample_size * 0.20), n_attack)
    take_normal  = min(sample_size - take_attack, n_normal)

    if take_attack == 0 or take_normal == 0:
        raise ValueError(f"Not enough samples. Attack={n_attack}, Normal={n_normal}")

    idx_a = y_raw[y_raw == 1].sample(take_attack, random_state=42).index
    idx_n = y_raw[y_raw == 0].sample(take_normal, random_state=42).index
    idx   = idx_a.append(idx_n)

    X_s = X_raw.loc[idx].reset_index(drop=True)
    y_s = y_raw.loc[idx].reset_index(drop=True)

    scaler   = MinMaxScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X_s), columns=available)

    return X_scaled, y_s, scaler, available


def compute_context_scores(X: pd.DataFrame) -> np.ndarray:
    """Per-sample mean robust z-score across all features."""
    scores = np.zeros(len(X), dtype=np.float64)
    for col in X.columns:
        vals   = X[col].values.astype(np.float64)
        median = np.median(vals)
        q75, q25 = np.percentile(vals, [75, 25])
        iqr    = q75 - q25
        if iqr < 1e-9:
            iqr = 1e-9
        scores += np.abs((vals - median) / iqr)
    return scores / max(len(X.columns), 1)


def train_model(X: pd.DataFrame, y: pd.Series,
                contamination: float = 0.05) -> IsolationForest:
    """Train iForest ONLY on normal traffic. Fully unsupervised."""
    contamination = float(np.clip(contamination, 0.001, 0.499))
    X_normal = X[y == 0]
    if len(X_normal) < 50:
        raise ValueError(f"Need ≥50 normal samples, got {len(X_normal)}")
    model = IsolationForest(
        n_estimators=200, contamination=contamination,
        max_samples="auto", random_state=42, n_jobs=-1
    )
    model.fit(X_normal)
    return model


def predict(model: IsolationForest, X: pd.DataFrame,
            context_weight: float = 0.25) -> dict:
    """Fused anomaly score = (1-cw)*iForest + cw*context. Higher = suspicious."""
    context_weight = float(np.clip(context_weight, 0.0, 0.5))

    raw   = model.score_samples(X.values)
    r_min, r_max = raw.min(), raw.max()
    raw_norm = np.zeros(len(raw)) if r_max - r_min < 1e-9 else \
               1.0 - (raw - r_min) / (r_max - r_min)

    ctx   = compute_context_scores(X)
    c_min, c_max = ctx.min(), ctx.max()
    ctx_norm = np.zeros(len(ctx)) if c_max - c_min < 1e-9 else \
               (ctx - c_min) / (c_max - c_min)

    fused     = (1.0 - context_weight) * raw_norm + context_weight * ctx_norm
    threshold = float(np.percentile(fused, 100.0 * (1.0 - float(model.contamination))))
    preds     = (fused >= threshold).astype(int)

    return {"raw_scores": raw, "context_scores": ctx_norm,
            "fused_scores": fused, "predictions": preds, "threshold": threshold}


def evaluate(y_true: pd.Series, result: dict) -> dict:
    """All metrics with safe fallbacks."""
    preds = result["predictions"]
    fused = result["fused_scores"]
    y_arr = np.array(y_true)

    prec = float(precision_score(y_arr, preds, zero_division=0))
    rec  = float(recall_score(y_arr,    preds, zero_division=0))
    f1   = float(f1_score(y_arr,        preds, zero_division=0))

    cm = confusion_matrix(y_arr, preds, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0,0]), int(cm[0,1]), int(cm[1,0]), int(cm[1,1])
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    try:
        auc = float(roc_auc_score(y_arr, fused))
    except Exception:
        auc = 0.0

    return {"precision": round(prec,4), "recall": round(rec,4),
            "f1_score": round(f1,4),   "fpr": round(fpr,4),
            "auc_roc": round(auc,4),   "tp": tp, "fp": fp,
            "tn": tn, "fn": fn,        "confusion_matrix": cm}


def tune_contamination(X: pd.DataFrame, y: pd.Series,
                        values=None) -> pd.DataFrame:
    """Sweep contamination values. Skips failures gracefully."""
    if values is None:
        values = [0.01, 0.03, 0.05, 0.08, 0.10, 0.15, 0.20]
    rows = []
    for c in values:
        try:
            m   = train_model(X, y, contamination=c)
            res = predict(m, X)
            e   = evaluate(y, res)
            rows.append({"contamination": c, "precision": e["precision"],
                         "recall": e["recall"], "f1_score": e["f1_score"],
                         "fpr": e["fpr"], "auc_roc": e["auc_roc"]})
        except Exception:
            rows.append({"contamination": c, "precision": 0.0, "recall": 0.0,
                         "f1_score": 0.0, "fpr": 1.0, "auc_roc": 0.0})
    return pd.DataFrame(rows)


def get_shap_explainer(model: IsolationForest, X_background: pd.DataFrame):
    """SHAP TreeExplainer. Compatible with shap 0.40+"""
    return shap.TreeExplainer(
        model, data=X_background,
        feature_perturbation="interventional",
        model_output="raw"
    )


def get_shap_values(explainer, X: pd.DataFrame) -> np.ndarray:
    """
    Returns 2D numpy array (n_samples, n_features).
    Handles all shap version quirks.
    """
    sv = explainer.shap_values(X)
    if isinstance(sv, list):
        sv = sv[0]
    if hasattr(sv, "values"):
        sv = sv.values
    sv = np.array(sv, dtype=np.float64)
    if sv.ndim == 3:
        sv = sv[:, :, 0]
    if sv.ndim == 1:
        sv = sv.reshape(1, -1)
    return sv


def get_base_value(explainer) -> float:
    """Safely extract expected_value."""
    try:
        bv = explainer.expected_value
        if hasattr(bv, "__len__"):
            return float(bv[0])
        return float(bv)
    except Exception:
        return 0.0
