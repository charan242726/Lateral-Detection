# 🛡️ LateralShield
**Context-Aware Lateral Movement Detection**
VisionX 2026 · Swarnandhra College of Engineering & Technology

---

## Files
```
lateralshield/
├── dashboard.py          ← Run this (Streamlit app)
├── requirements.txt      ← All libraries
├── src/
│   ├── model.py          ← ML pipeline (Isolation Forest + SHAP)
│   ├── data_generator.py ← Synthetic data for demo
│   └── visualizations.py ← All 8 plots
└── README.md
```

---

## Setup (ONE TIME before hackathon)

**Step 1 — Install Python 3.10 or 3.11**
- Download: python.org
- Tick "Add Python to PATH" during install
- Verify: open terminal → type `python --version`

**Step 2 — Open terminal in this folder**
```
cd lateralshield
```

**Step 3 — Install libraries**
```
pip install -r requirements.txt
```
Takes 5–10 minutes. Let it finish completely.

**Step 4 — Verify**
```
python src/data_generator.py
```
Should print: `Generated: 48000 samples | Normal: 40000 | Attack: 8000`

**Step 5 — Run**
```
streamlit run dashboard.py
```
Browser opens at http://localhost:8501

---

## Using the Dashboard

1. Sidebar → choose "Synthetic Demo Data" (works immediately, no download)
2. Leave contamination at 0.10
3. Click **Run Detection**
4. Watch all 5 tabs fill with results

### Tabs explained
- **Overview** → Score distribution + event timeline
- **Results & Metrics** → Confusion matrix, ROC curve, comparison table
- **Flagged Alerts** → Table of all detected events, download CSV
- **SHAP Explainability** → Why each alert fired (judges love this)
- **Parameter Tuning** → Click "Run Tuning Sweep" in sidebar first

---

## Real Dataset (UNSW-NB15)

Download from Kaggle (faster than university site):
1. Go to: kaggle.com → search "UNSW-NB15"
2. Download UNSW-NB15_1.csv
3. In dashboard sidebar → select "Upload UNSW-NB15 CSV"
4. Upload the file

---

## Demo Script (Hackathon Presentation)

**M5 presents:**
> "Let me show you LateralShield live."

1. Open http://localhost:8501
2. "This is UNSW-NB15 — real network traffic data, 20,000 events"
3. Click Run Detection
4. Show Overview: "Red cluster = attack traffic. Blue = normal. Our model separates them."
5. Show Results: "F1 of [X], AUC of [X] — real numbers from real experiment"
6. Go to Flagged Alerts: "Every detected event with severity level. Download CSV."
7. Go to SHAP: click one event
   → "This event was flagged because sbytes is 40x above normal,
      connection reuse is extremely high, packet loss is elevated —
      classic lateral movement via SMB"

**M6 defends judge questions:**

Q: Why not supervised learning?
A: "Labeled attack data doesn't exist in real enterprise environments.
    99% of logs are normal. Isolation Forest learns normal behavior —
    anything that deviates gets flagged. No labels needed."

Q: What dataset?
A: "UNSW-NB15 from UNSW Canberra. 2.5 million records, 9 attack categories.
    Cited in 50+ IEEE papers from 2021–2024. We used 20,000 sample for demo."

Q: What is contamination?
A: "It's how much of the data we expect to be anomalous.
    We tuned it — see the Parameter Tuning tab. Best F1 at [value]."

Q: What makes this better than existing IDS?
A: "Existing systems need labeled signatures — they miss zero-day attacks.
    Ours needs no labels, and we explain every single alert.
    A SOC analyst can act immediately instead of investigating blind."

---

## Real-World Impact
- AIIMS Delhi Hospital (Nov 2022) — ransomware via undetected lateral movement
- SolarWinds (2020) — 9 months undetected lateral movement
- WannaCry (2017) — $4–8B damage via SMB lateral movement

---

## References
1. Smiliotopoulos et al. (2024). Assessing detection of lateral movement
   through unsupervised learning. Computers & Security.
2. Xu et al. (2023). Deep Isolation Forest for anomaly detection.
   IEEE TKDE.
3. UNSW-NB15 Dataset. UNSW Canberra, Australian Cyber Security Centre.

SDG 9 — Secure digital infrastructure
SDG 16 — Protect institutions from cyber threats
