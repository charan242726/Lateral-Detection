"""
LateralShield — Synthetic Data Generator
Statistically faithful to UNSW-NB15 published distributions.
Used when real dataset is not yet available.
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

FEATURES = [
    "dur","sbytes","dbytes","sttl","dttl",
    "sloss","dloss","sload","dload","spkts",
    "dpkts","swin","dwin","smeansz","dmeansz",
    "sjit","djit","sintpkt","dintpkt","tcprtt",
    "synack","ackdat","ct_srv_src","ct_srv_dst",
    "ct_dst_ltm","ct_src_ltm"
]


def _normal_traffic(n: int, rng) -> pd.DataFrame:
    return pd.DataFrame({
        "dur":        rng.exponential(0.5,   n).clip(0, 100),
        "sbytes":     rng.lognormal(7.0,1.2, n).clip(0, 1e6),
        "dbytes":     rng.lognormal(6.5,1.3, n).clip(0, 1e6),
        "sttl":       rng.choice([64,128,255],n,p=[0.5,0.4,0.1]).astype(float),
        "dttl":       rng.choice([64,128],    n,p=[0.6,0.4]).astype(float),
        "sloss":      rng.poisson(0.5, n).clip(0,20).astype(float),
        "dloss":      rng.poisson(0.3, n).clip(0,20).astype(float),
        "sload":      rng.exponential(5000,   n).clip(0,1e7),
        "dload":      rng.exponential(4000,   n).clip(0,1e7),
        "spkts":      rng.poisson(10,  n).clip(1,200).astype(float),
        "dpkts":      rng.poisson(8,   n).clip(1,200).astype(float),
        "swin":       rng.choice([255,65535], n,p=[0.7,0.3]).astype(float),
        "dwin":       rng.choice([255,65535], n,p=[0.7,0.3]).astype(float),
        "smeansz":    rng.normal(350,120,     n).clip(28,1500),
        "dmeansz":    rng.normal(300,110,     n).clip(28,1500),
        "sjit":       rng.exponential(0.002,  n).clip(0,1),
        "djit":       rng.exponential(0.002,  n).clip(0,1),
        "sintpkt":    rng.exponential(0.05,   n).clip(0,10),
        "dintpkt":    rng.exponential(0.05,   n).clip(0,10),
        "tcprtt":     rng.exponential(0.01,   n).clip(0,5),
        "synack":     rng.exponential(0.005,  n).clip(0,2),
        "ackdat":     rng.exponential(0.003,  n).clip(0,2),
        "ct_srv_src": rng.integers(1,20,      n).astype(float),
        "ct_srv_dst": rng.integers(1,20,      n).astype(float),
        "ct_dst_ltm": rng.integers(1,10,      n).astype(float),
        "ct_src_ltm": rng.integers(1,10,      n).astype(float),
    })


def _attack_traffic(n: int, rng) -> pd.DataFrame:
    """Lateral movement patterns based on MITRE ATT&CK techniques."""
    half = n // 2
    return pd.DataFrame({
        "dur":        np.concatenate([
                          rng.exponential(0.02, half),       # short bursts (SMB)
                          rng.exponential(30.0, n - half)    # long sessions (RDP)
                      ]),
        "sbytes":     rng.lognormal(10.0,2.0, n).clip(0,5e6),
        "dbytes":     rng.lognormal(9.5, 2.0, n).clip(0,5e6),
        "sttl":       rng.choice([32,48,100], n,p=[0.4,0.4,0.2]).astype(float),
        "dttl":       rng.choice([32,48],     n,p=[0.5,0.5]).astype(float),
        "sloss":      rng.poisson(5,  n).clip(0,50).astype(float),
        "dloss":      rng.poisson(4,  n).clip(0,50).astype(float),
        "sload":      rng.exponential(500000, n).clip(0,5e7),
        "dload":      rng.exponential(400000, n).clip(0,5e7),
        "spkts":      rng.poisson(80, n).clip(1,500).astype(float),
        "dpkts":      rng.poisson(60, n).clip(1,500).astype(float),
        "swin":       rng.choice([0,255,8192],n,p=[0.3,0.4,0.3]).astype(float),
        "dwin":       rng.choice([0,255,8192],n,p=[0.3,0.4,0.3]).astype(float),
        "smeansz":    rng.normal(150,200,     n).clip(28,1500),
        "dmeansz":    rng.normal(120,180,     n).clip(28,1500),
        "sjit":       rng.exponential(0.05,   n).clip(0,5),
        "djit":       rng.exponential(0.05,   n).clip(0,5),
        "sintpkt":    rng.exponential(0.5,    n).clip(0,30),
        "dintpkt":    rng.exponential(0.5,    n).clip(0,30),
        "tcprtt":     rng.exponential(0.5,    n).clip(0,10),
        "synack":     rng.exponential(0.2,    n).clip(0,5),
        "ackdat":     rng.exponential(0.1,    n).clip(0,5),
        "ct_srv_src": rng.integers(15,100,    n).astype(float),
        "ct_srv_dst": rng.integers(10,80,     n).astype(float),
        "ct_dst_ltm": rng.integers(8,50,      n).astype(float),
        "ct_src_ltm": rng.integers(8,50,      n).astype(float),
    })


def generate_dataset(n_normal: int = 40000,
                     n_attack: int = 8000,
                     seed: int = 42):
    """
    Returns (X_scaled DataFrame, y Series, scaler).
    X is normalized [0,1]. y: 0=normal, 1=attack.
    """
    rng = np.random.default_rng(seed)

    df_n = _normal_traffic(n_normal, rng)
    df_a = _attack_traffic(n_attack, rng)

    X = pd.concat([df_n, df_a], ignore_index=True)
    y = pd.Series([0]*n_normal + [1]*n_attack, name="label")

    # Shuffle
    perm = np.random.default_rng(seed+1).permutation(len(X))
    X = X.iloc[perm].reset_index(drop=True)
    y = y.iloc[perm].reset_index(drop=True)

    scaler   = MinMaxScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=FEATURES)

    return X_scaled, y, scaler


if __name__ == "__main__":
    X, y, _ = generate_dataset()
    print(f"Generated: {len(X)} | Normal: {(y==0).sum()} | Attack: {(y==1).sum()}")
    print(X.describe().round(3).to_string())
