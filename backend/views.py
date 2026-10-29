import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ml.model import EDITABLE_FIELDS, DEFAULTS, DISPLAY_NAMES, predict, DEVICE

@csrf_exempt
def health(request):
    return JsonResponse({
        "status": "ok",
        "model": "Multi-Task Neural Network",
        "device": str(DEVICE),
        "editable_parameters": len(EDITABLE_FIELDS),
        "total_features": len(DEFAULTS),
    })

@csrf_exempt
def metadata(request):
    fields = []
    for name in EDITABLE_FIELDS:
        if name == "Gender":
            fields.append({
                "name": name, "label": DISPLAY_NAMES[name], "type": "select",
                "options": [{"value": 0, "label": "Female"}, {"value": 1, "label": "Male"}],
                "default": DEFAULTS[name]
            })
        elif name == "Age":
            fields.append({
                "name": name, "label": DISPLAY_NAMES[name], "type": "number",
                "min": 14, "max": 100, "default": DEFAULTS[name]
            })
        else:
            fields.append({
                "name": name, "label": DISPLAY_NAMES[name], "type": "likert",
                "min": 1, "max": 5, "default": DEFAULTS[name],
                "help": "1 = low / never · 5 = high / very often"
            })
    return JsonResponse({
        "model": "Multi-Task Neural Network",
        "parameters": fields,
        "defaults_note": "The remaining 17 survey inputs use training-set defaults.",
        "classes": ["Distress", "Eustress", "No Stress"],
    })

@csrf_exempt
def predict_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required."}, status=405)
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        result = predict(payload)
        return JsonResponse(result)
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=400)
