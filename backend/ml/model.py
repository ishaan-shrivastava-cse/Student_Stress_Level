import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR / "models"

ARCH = json.loads((MODEL_DIR / "dataset_a_multitask_nn_arch.json").read_text(encoding="utf-8"))
SCALER = joblib.load(MODEL_DIR / "dataset_a_scaler.joblib")
LABEL_ENCODER = joblib.load(MODEL_DIR / "dataset_a_label_encoder.joblib")
KMEANS = joblib.load(MODEL_DIR / "dataset_a_kmeans.joblib")

FEATURES = list(SCALER.feature_names_in_)

# Defaults are the training-set mode for Gender and rounded training-set medians
# for the numeric survey fields, generated from the supplied training notebook/data.
DEFAULTS = {
    "Gender": 0,
    "Age": 19,
    "Have you recently experienced stress in your life?": 3,
    "Have you noticed a rapid heartbeat or palpitations?": 3,
    "Have you been dealing with anxiety or tension recently?": 2,
    "Do you face any sleep problems or difficulties falling asleep?": 3,
    "Have you been dealing with anxiety or tension recently?.1": 2,
    "Have you been getting headaches more often than usual?": 3,
    "Do you get irritated easily?": 3,
    "Do you have trouble concentrating on your academic tasks?": 3,
    "Have you been feeling sadness or low mood?": 2,
    "Have you been experiencing any illness or health issues?": 2,
    "Do you often feel lonely or isolated?": 2,
    "Do you feel overwhelmed with your academic workload?": 2,
    "Are you in competition with your peers, and does it affect you?": 2,
    "Do you find that your relationship often causes you stress?": 2,
    "Are you facing any difficulties with your professors or instructors?": 2,
    "Is your working environment unpleasant or stressful?": 2,
    "Do you struggle to find time for relaxation and leisure activities?": 2,
    "Is your hostel or home environment causing you difficulties?": 2,
    "Do you lack confidence in your academic performance?": 2,
    "Do you lack confidence in your choice of academic subjects?": 3,
    "Academic and extracurricular activities conflicting for you?": 3,
    "Do you attend classes regularly?": 3,
    "Have you gained/lost weight?": 2,
}

EDITABLE_FIELDS = [
    "Gender",
    "Age",
    "Have you recently experienced stress in your life?",
    "Have you been dealing with anxiety or tension recently?",
    "Do you face any sleep problems or difficulties falling asleep?",
    "Have you been getting headaches more often than usual?",
    "Do you get irritated easily?",
    "Do you feel overwhelmed with your academic workload?",
]

DISPLAY_NAMES = {
    "Gender": "Gender",
    "Age": "Age",
    "Have you recently experienced stress in your life?": "Recent stress",
    "Have you been dealing with anxiety or tension recently?": "Anxiety / tension",
    "Do you face any sleep problems or difficulties falling asleep?": "Sleep problems",
    "Have you been getting headaches more often than usual?": "Headaches",
    "Do you get irritated easily?": "Irritability",
    "Do you feel overwhelmed with your academic workload?": "Academic workload",
}

class MultiTaskMLP(nn.Module):
    def __init__(self, input_dim, hidden_dim, n_classes, n_tasks):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
        )
        self.heads = nn.ModuleList(
            [nn.Linear(hidden_dim, n_classes) for _ in range(n_tasks)]
        )

    def forward(self, x, task_ids):
        feat = self.shared(x)
        all_logits = torch.stack([head(feat) for head in self.heads], dim=1)
        idx = torch.arange(x.size(0), device=x.device)
        return all_logits[idx, task_ids]

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL = MultiTaskMLP(**ARCH).to(DEVICE)
MODEL.load_state_dict(
    torch.load(MODEL_DIR / "dataset_a_multitask_nn.pt", map_location=DEVICE, weights_only=True)
)
MODEL.eval()

def build_input(user_values: dict) -> pd.DataFrame:
    values = DEFAULTS.copy()
    for key in EDITABLE_FIELDS:
        if key in user_values:
            values[key] = user_values[key]

    # Coerce and validate all model inputs.
    values["Gender"] = int(values["Gender"])
    values["Age"] = int(values["Age"])
    for key in FEATURES:
        if key not in ("Gender", "Age"):
            values[key] = int(values[key])
    return pd.DataFrame([[values[f] for f in FEATURES]], columns=FEATURES)

def predict(user_values: dict) -> dict:
    df = build_input(user_values)
    scaled = SCALER.transform(df)

    # The original training pipeline used K-Means cluster ID as the task ID.
    task_id = int(KMEANS.predict(scaled)[0])
    x = torch.tensor(scaled, dtype=torch.float32, device=DEVICE)
    task = torch.tensor([task_id], dtype=torch.long, device=DEVICE)

    with torch.inference_mode():
        logits = MODEL(x, task)
        probs = torch.softmax(logits, dim=1)[0].detach().cpu().numpy()

    pred_idx = int(np.argmax(probs))
    label = str(LABEL_ENCODER.inverse_transform([pred_idx])[0])

    short_label = {
        "Distress (Negative Stress) - Stress that causes anxiety and impairs well-being.": "Distress",
        "Eustress (Positive Stress) - Stress that motivates and enhances performance.": "Eustress",
        "No Stress - Currently experiencing minimal to no stress.": "No Stress",
    }.get(label, label)

    return {
        "stress_level": short_label,
        "full_label": label,
        "class_index": pred_idx,
        "confidence": round(float(probs[pred_idx]) * 100, 1),
        "probabilities": [
            {"label": "Distress", "value": round(float(probs[0]) * 100, 1)},
            {"label": "Eustress", "value": round(float(probs[1]) * 100, 1)},
            {"label": "No Stress", "value": round(float(probs[2]) * 100, 1)},
        ],
        "task_id": task_id,
        "device": str(DEVICE),
        "defaults_used": len(FEATURES) - len([k for k in user_values if k in EDITABLE_FIELDS]),
    }
