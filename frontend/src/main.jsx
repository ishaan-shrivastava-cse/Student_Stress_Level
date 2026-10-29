import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Gauge,
  Info,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import "./styles.css";

// Backend URL for the deployed application.
// Vercel uses the environment variable; the URL below is the fallback.
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://stresslens-api.onrender.com"
).replace(/\/$/, "");

const LIKERT = [
  { v: 1, t: "Very low" },
  { v: 2, t: "Low" },
  { v: 3, t: "Moderate" },
  { v: 4, t: "High" },
  { v: 5, t: "Very high" },
];

function App() {
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load the model input metadata when the application starts.
  useEffect(() => {
    let cancelled = false;

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 15000);

    async function loadMetadata() {
      try {
        const response = await fetch(`${API_BASE}/api/metadata/`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Metadata request failed with status ${response.status}.`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.parameters)) {
          throw new Error(
            "The backend response does not contain the expected parameters."
          );
        }

        if (cancelled) {
          return;
        }

        const initial = {};

        data.parameters.forEach((parameter) => {
          initial[parameter.name] = parameter.default;
        });

        setMeta(data);
        setForm(initial);
        setError("");
      } catch (err) {
        if (!cancelled) {
          if (err.name === "AbortError") {
            setError(
              "The backend took too long to respond. Please retry."
            );
          } else {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load StressLens metadata."
            );
          }
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    loadMetadata();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  // Update an individual form input.
  const setValue = (name, value) => {
    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // Submit the form and request a stress prediction.
  const submit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/predict/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Prediction failed.");
      }

      setResult(data);

      window.setTimeout(() => {
        document
          .getElementById("result")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 50);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the prediction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Restore the model's default input values.
  const reset = () => {
    if (!meta) {
      return;
    }

    const initial = {};

    meta.parameters.forEach((parameter) => {
      initial[parameter.name] = parameter.default;
    });

    setForm(initial);
    setResult(null);
    setError("");
  };

  // Display a helpful message instead of an indefinite loading screen.
  if (!meta) {
    return (
      <div className="boot">
        <div className="boot-card">
          <Sparkles />

          <span>
            {error ? "Unable to load StressLens" : "Loading StressLens…"}
          </span>

          {error && (
            <>
              <p>{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <BrainCircuit size={20} />
          </div>

          <div>
            <strong>StressLens</strong>
            <span>Multi-Task Neural Network</span>
          </div>
        </div>

        <div className="status">
          <span className="pulse" />
          Local inference
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <Sparkles size={14} />
            AI-ASSISTED STUDENT WELLBEING
          </div>

          <h1>
            Understand your stress profile
            <br />
            <em>in a few signals.</em>
          </h1>

          <p>
            Enter 8 key survey signals. The remaining inputs are
            automatically held at training-set defaults so the trained
            model can produce a complete 25-feature prediction.
          </p>

          <div className="hero-meta">
            <span>
              <ShieldCheck size={15} />
              Runs locally
            </span>

            <span>
              <Gauge size={15} />
              25-feature model
            </span>

            <span>
              <Activity size={15} />
              3 outcomes
            </span>
          </div>
        </section>

        <section className="workspace">
          <form className="panel form-panel" onSubmit={submit}>
            <div className="panel-head">
              <div>
                <span className="section-kicker">01 / INPUT</span>
                <h2>Your signals</h2>
              </div>

              <button
                type="button"
                className="ghost-btn"
                onClick={reset}
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>

            <div className="fields">
              {meta.parameters.map((parameter, index) => (
                <div className="field" key={parameter.name}>
                  <div className="field-title">
                    <label>{parameter.label}</label>

                    <span className="field-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {parameter.type === "number" && (
                    <div className="number-wrap">
                      <input
                        type="number"
                        min={parameter.min}
                        max={parameter.max}
                        value={
                          form[parameter.name] ?? parameter.default
                        }
                        onChange={(event) =>
                          setValue(
                            parameter.name,
                            Number(event.target.value)
                          )
                        }
                      />

                      <span>years</span>
                    </div>
                  )}

                  {parameter.type === "select" && (
                    <div className="segmented">
                      {parameter.options.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          className={
                            Number(form[parameter.name]) === option.value
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            setValue(
                              parameter.name,
                              option.value
                            )
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {parameter.type === "likert" && (
                    <div className="likert">
                      {LIKERT.map((option) => (
                        <button
                          type="button"
                          key={option.v}
                          className={
                            Number(form[parameter.name]) === option.v
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            setValue(parameter.name, option.v)
                          }
                        >
                          <b>{option.v}</b>
                          <small>{option.t}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="auto-note">
              <Info size={16} />

              <div>
                <b>17 other features are automatic.</b>

                <span>
                  They use defaults derived from the model's training
                  data. You only control the 8 displayed parameters.
                </span>
              </div>
            </div>

            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}

            <button
              className="predict-btn"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={18} />
                  Running model…
                </>
              ) : (
                <>
                  Predict stress level
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <section className="panel result-panel" id="result">
            <div className="panel-head">
              <div>
                <span className="section-kicker">02 / OUTPUT</span>
                <h2>Prediction</h2>
              </div>

              <div className="model-chip">MT-NN</div>
            </div>

            {!result ? (
              <div className="empty-state">
                <div className="orb">
                  <BrainCircuit size={34} />
                </div>

                <h3>Your result will appear here</h3>

                <p>
                  Complete the signals on the left and run the neural
                  network.
                </p>
              </div>
            ) : (
              <div className="result-content">
                <div
                  className={
                    "result-card " +
                    result.stress_level.toLowerCase().replace(/\s+/g, "-")
                  }
                >
                  <div className="result-label">
                    Predicted profile
                  </div>

                  <div className="result-main">
                    <h3>{result.stress_level}</h3>

                    <div className="confidence">
                      {result.confidence}%
                      <span>model confidence</span>
                    </div>
                  </div>

                  <div className="result-line">
                    <span>Task head</span>
                    <b>Cluster {result.task_id + 1}</b>
                  </div>
                </div>

                <div className="prob-block">
                  <div className="subhead">
                    <span>Class distribution</span>
                    <span>Probability</span>
                  </div>

                  {result.probabilities.map((probability) => (
                    <div className="prob" key={probability.label}>
                      <div className="prob-top">
                        <span>{probability.label}</span>
                        <b>{probability.value}%</b>
                      </div>

                      <div className="bar">
                        <i
                          style={{
                            width: `${probability.value}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="tech-grid">
                  <div>
                    <span>Engine</span>
                    <b>PyTorch</b>
                  </div>

                  <div>
                    <span>Inference</span>
                    <b>Local</b>
                  </div>

                  <div>
                    <span>Device</span>
                    <b>
                      {result.device?.includes("cuda")
                        ? "RTX GPU"
                        : "CPU"}
                    </b>
                  </div>

                  <div>
                    <span>Features</span>
                    <b>25</b>
                  </div>
                </div>

                <div className="notice">
                  <Info size={15} />

                  <span>
                    This is a model prediction for educational/project
                    use, not a medical diagnosis.
                  </span>
                </div>
              </div>
            )}
          </section>
        </section>
      </main>

      <footer>
        <span>StressLens · Student Stress Prediction</span>

        <span>
          Private local inference · No data leaves your machine
        </span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);