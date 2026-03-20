import os
import sys

# Add src directory to path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import pandas as pd
import numpy as np
import io
import json

from src.model import (
    train_model, predict, evaluate,
    tune_contamination, get_shap_explainer,
    get_shap_values, get_base_value, load_dataset
)
from src.data_generator import generate_dataset

app = FastAPI(title="LateralShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session state
class SessionState:
    X: pd.DataFrame = None
    y: pd.Series = None
    model = None
    result: dict = None
    trained: bool = False
    
state = SessionState()

@app.post("/api/run-detection")
async def run_detection(
    data_source: str = Form("synthetic"),
    file: UploadFile = File(None),
    contamination: float = Form(0.10),
    context_weight: float = Form(0.25),
    sample_size: int = Form(20000)
):
    try:
        # Load Data
        if data_source == "file" and file is not None:
            content = await file.read()
            # We must decode to string because pandas read_csv needs path or buffer
            # Actually bytesio is fine for pandas
            data_io = io.BytesIO(content)
            X, y, scaler, feats = load_dataset(data_io, sample_size)
        else:
            n_atk = int(sample_size * 0.20)
            n_norm = sample_size - n_atk
            X, y, scaler = generate_dataset(n_norm, n_atk)
            
        state.X = X
        state.y = y
        
        # Train & Predict
        model = train_model(X, y, contamination=contamination)
        state.model = model
        result = predict(model, X, context_weight=context_weight)
        state.result = result
        metrics = evaluate(y, result)
        
        # Format Alerts
        preds = result["predictions"]
        scores = result["fused_scores"]
        flagged = np.where(preds == 1)[0]
        alerts = []
        
        if len(flagged) > 0:
            f_scores = scores[flagged]
            p75 = np.percentile(f_scores, 75)
            p40 = np.percentile(f_scores, 40)
            
            alert_df = X.iloc[flagged].copy().reset_index(drop=True)
            alert_df["anomaly_score"] = np.round(f_scores, 4)
            alert_df["true_label"] = y.iloc[flagged].values
            
            def get_sev(s):
                if s > p75: return "High"
                elif s > p40: return "Medium"
                return "Low"
                
            alert_df["severity"] = alert_df["anomaly_score"].apply(get_sev)
            alert_df = alert_df.sort_values("anomaly_score", ascending=False).head(50)
            alert_df = alert_df.fillna(0)
            alerts = alert_df.to_dict(orient="records")
            
        metrics["confusion_matrix"] = metrics["confusion_matrix"].tolist()
        timeline = {
            "scores": scores[:1000].tolist(), # Send max 1000 for frontend speed
            "labels": y.iloc[:1000].tolist() if hasattr(y, 'iloc') else y[:1000].tolist(),
            "threshold": result["threshold"]
        }
        
        state.trained = True
        return {
            "status": "success",
            "metrics": metrics,
            "alerts": alerts,
            "timeline": timeline,
            "total_events": len(X),
            "flagged_events": int(preds.sum())
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tune")
async def tune():
    if not state.trained:
        raise HTTPException(status_code=400, detail="Must run detection first")
    try:
        tdf = tune_contamination(state.X, state.y)
        return {"status": "success", "tuning_results": tdf.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/shap")
async def shap_explain():
    if not state.trained:
        raise HTTPException(status_code=400, detail="Must run detection first")
    try:
        shap_n = min(300, len(state.X))
        X_shap = state.X.sample(shap_n, random_state=42).reset_index(drop=True)
        explainer = get_shap_explainer(state.model, X_shap)
        shap_vals = get_shap_values(explainer, X_shap)
        
        mean_shap = np.abs(shap_vals).mean(axis=0)
        feature_names = list(X_shap.columns)
        global_importance = [{"feature": f, "importance": float(v)} for f, v in zip(feature_names, mean_shap)]
        global_importance = sorted(global_importance, key=lambda x: x["importance"], reverse=True)[:15] # Top 15
        
        shap_res = predict(state.model, X_shap)
        flagged_idx = np.where(shap_res["fused_scores"] > shap_res["threshold"])[0]
        
        waterfall = None
        if len(flagged_idx) > 0:
            chosen = flagged_idx[0]
            sv_single = shap_vals[chosen]
            feat_vals = X_shap.values[chosen]
            
            waterfall_data = []
            for i, name in enumerate(feature_names):
                waterfall_data.append({
                    "feature": name,
                    "value": float(feat_vals[i]),
                    "contribution": float(sv_single[i])
                })
            
            waterfall = {
                "event_index": int(chosen),
                "score": float(shap_res["fused_scores"][chosen]),
                "features": sorted(waterfall_data, key=lambda x: abs(x["contribution"]), reverse=True)[:10] # Top 10
            }
            
        return {"status": "success", "global_importance": global_importance, "waterfall": waterfall}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
