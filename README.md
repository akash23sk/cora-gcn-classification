<div align="center">

# 🕸️ Cora Citation Network Classifier

**Guess what a research paper is about — just from its words and who it cites.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PyTorch Geometric](https://img.shields.io/badge/PyTorch%20Geometric-GCN-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch-geometric.readthedocs.io/)
[![ONNX](https://img.shields.io/badge/ONNX-Runtime-005CED?logo=onnx&logoColor=white)](https://onnxruntime.ai/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?logo=render&logoColor=white)](https://cora-gcn-classification.onrender.com)

[**🚀 Live Demo**](https://cora-gcn-classification.onrender.com) · [How it works](#-how-it-works) · [Tech stack](#-tech-stack)

</div>

---

## ✨ What is this?

A simple Graph Neural Network (GNN) project using the Cora Citation Dataset.

This project takes research papers and their citation connections and uses a Graph Convolutional Network (GCN) to predict the topic/class of a paper**

### 🤔 What even is a GCN? (in plain English)

Imagine you're trying to guess someone's job, but you can't ask them directly. What would you do? You'd probably look at **their friends** — if most of their friends are doctors, there's a good chance they work in healthcare too.

A GCN does the same thing, but for research papers:

> 📄 **Paper A** doesn't just get judged by its own words.
> It also looks at the papers it **cites** — and the papers *those* papers cite.
> If most of its "citation friends" are about Neural Networks, Paper A probably is too.

That's the whole trick — mixing "what a paper says" with "who it hangs out with."

## 🔎 Example

```
Paper #3 → Case Based  (100.0% confidence)
```

## 🧠 How it works

<details>
<summary><strong>Click to see how I built this, step by step</strong></summary>

<br>

| Step | What I did |
|---|---|
| 📚 **1. Got the data** | Used Cora — 2,708 real papers, 5,429 citation links, 7 known topics |
| 🌲 **2. Started simple** | Trained a basic model using just paper text, no citations, as a baseline |
| 🕸️ **3. Built the GCN** | Made a 2-layer Graph Neural Network that also looks at citation links |
| 🏆 **4. Compared results** | The GCN did better — proving citations really do help |
| 📦 **5. Exported the model** | Saved it as **ONNX**, a lighter format that runs fast anywhere |
| ⚙️ **6. Built the backend** | Made a **FastAPI** server that loads the model and answers requests |
| 🎨 **7. Built the frontend** | A simple dark-themed webpage — plain HTML, CSS, JS, no fancy framework |
| ☁️ **8. Deployed it** | Put it online for free using **Render**, connected straight to GitHub |

</details>

## 🛠 Tech stack

<div align="center">

| Layer | Tools |
|---|---|
| **Model** | PyTorch · PyTorch Geometric · scikit-learn · ONNX Runtime |
| **Backend** | FastAPI · Uvicorn |
| **Frontend** | HTML · CSS · JavaScript |
| **Data** | Cora citation network (`torch_geometric.datasets.Planetoid`) |
| **Hosting** | Render |

</div>

## 🔗 Try it

<div align="center">

### [👉 cora-gcn-classification.onrender.com](https://cora-gcn-classification.onrender.com)

*Free hosting — first load can take ~30–60s to wake up. Worth the wait.* ⏳

</div>
