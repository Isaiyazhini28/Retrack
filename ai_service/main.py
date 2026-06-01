from flask import Flask, request, jsonify
import spacy
import math
import re
import random

app = Flask(__name__)
nlp = spacy.load("en_core_web_sm")

# ---------------------------
# Resume Keyword Scoring
# ---------------------------

def extract_keywords(text):
    doc = nlp(text.lower())
    return set([
        token.lemma_
        for token in doc
        if not token.is_stop and token.is_alpha and len(token.text) > 2
    ])

def calculate_resume_score(resume_text, job_description):
    job_keywords = extract_keywords(job_description)
    resume_keywords = extract_keywords(resume_text)

    if not job_keywords:
        return 0

    matched = job_keywords.intersection(resume_keywords)
    score = (len(matched) / len(job_keywords)) * 100
    return math.floor(score)

def experience_bonus(years):
    if years >= 8: return 15
    if years >= 5: return 10
    if years >= 2: return 5
    return 0


# ---------------------------
# KEYWORD SCORE (raw text → numeric score)
# Called by aiScore.js as the first step before /score
# ---------------------------

@app.route("/keyword-score", methods=["POST"])
def keyword_score():
    data = request.json
    resume_text = data.get("resume_text", "")
    job_description = data.get("job_description", "")

    if not resume_text or not job_description:
        return jsonify({"error": "resume_text and job_description are required"}), 400

    score = calculate_resume_score(resume_text, job_description)
    return jsonify({"score": score})


# ---------------------------
# FINAL AI SCORE
# Expects pre-computed numeric scores, not raw text
# ---------------------------

@app.route("/score", methods=["POST"])
def final_score():
    data = request.json

    resume = float(data.get("resume_score", 0))
    aptitude = float(data.get("aptitude_score", 0))
    tech = float(data.get("tech_score", 0))
    hr = float(data.get("hr_score", 0))
    experience = int(data.get("experience_years", 0))

    # Only average scores that were actually provided (non-zero).
    # Without this: resume=80, rest=0 → (80+0+0+0)/4 = 20 → wrongly rejected.
    provided = [s for s in [resume, aptitude, tech, hr] if s > 0]
    base = (sum(provided) / len(provided)) if provided else 0
    final = min(base + experience_bonus(experience), 100)

    if final >= 85:
        track = "Senior"
    elif final >= 70:
        track = "Standard"
    else:
        track = "Junior"

    return jsonify({
        "final_score": round(final, 2),
        "track": track
    })


# ---------------------------
# TRAINER AI
# ---------------------------

@app.route("/assign-trainer", methods=["POST"])
def assign_trainer():
    trainers = ["Rahul", "Priya", "Ankit", "Sonal"]
    return jsonify({"trainer": random.choice(trainers)})


# ---------------------------
# SPRINT AI
# ---------------------------

@app.route("/assign-sprint", methods=["POST"])
def assign_sprint():
    sprints = ["Sprint Alpha", "Sprint Beta", "Sprint Gamma"]
    return jsonify({"sprint": random.choice(sprints)})

# =====================================
# AI TASK SUGGESTION
# =====================================

@app.route("/suggest-task", methods=["POST"])
def suggest_task():
    data = request.json

    track = data.get("track", "Standard")
    progress = data.get("progress", 0)

    if progress < 30:
        tasks = [
            "Complete Documentation",
            "Setup Development Environment",
            "Attend Orientation Session"
        ]
    elif progress < 70:
        tasks = [
            "Submit Weekly Progress Report",
            "Attend Team Sprint Planning",
            "Code Review Session"
        ]
    else:
        tasks = [
            "Final Assessment",
            "Project Demo",
            "Feedback Submission"
        ]

    return jsonify({
        "suggested_task": random.choice(tasks),
        "priority": random.choice(["Low", "Medium", "High"])
    })


# =====================================
# TASK DELAY PREDICTION
# =====================================

@app.route("/task-risk", methods=["POST"])
def task_risk():
    data = request.json
    completion_rate = data.get("completion_rate", 50)

    if completion_rate < 40:
        risk = "High"
    elif completion_rate < 70:
        risk = "Medium"
    else:
        risk = "Low"

    return jsonify({"risk_level": risk})


@app.route("/sprint-analysis", methods=["POST"])
def sprint_analysis():
    data = request.json
    velocity = data.get("velocity", 50)

    if velocity < 40:
        status = "Behind Schedule"
    elif velocity < 70:
        status = "Stable"
    else:
        status = "High Performance"

    return jsonify({
        "sprint_status": status,
        "next_focus": "Improve Code Quality"
    })


@app.route("/process-intelligence", methods=["POST"])
def process_intelligence():
    data = request.json

    task_completion = data.get("task_completion", 50)
    sprint_status = data.get("sprint_status", "Stable")

    risk_score = 100 - task_completion
    if sprint_status == "Behind Schedule":
        risk_score += 20

    recommendation = "On Track"
    if risk_score > 80:
        recommendation = "Critical Attention Needed"
    elif risk_score > 60:
        recommendation = "Monitor Closely"

    return jsonify({
        "risk_score": risk_score,
        "recommendation": recommendation
    })


# ---------------------------
# ADVANCED BACKGROUND VERIFICATION AI
# ---------------------------

def normalize_text(text):
    return re.sub(r'\s+', ' ', text.strip().lower())

def extract_name(text):
    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return normalize_text(ent.text)
    return ""

def extract_experience_years(text):
    matches = re.findall(r'(\d+)\s*(year|years)', text.lower())
    if matches:
        years = [int(m[0]) for m in matches]
        return max(years)
    return 0

def detect_employment_gaps(text):
    years = re.findall(r'(20\d{2})', text)
    if len(years) >= 2:
        years = sorted([int(y) for y in years])
        gap = years[-1] - years[0]
        if gap > 10:
            return True
    return False

def calculate_verification_risk(resume_text, document_text):
    flags = []
    score_penalty = 0

    resume_text = normalize_text(resume_text)
    document_text = normalize_text(document_text)

    resume_name = extract_name(resume_text)
    document_name = extract_name(document_text)

    if resume_name and document_name and resume_name != document_name:
        flags.append("Name mismatch between resume and documents")
        score_penalty += 25

    resume_exp = extract_experience_years(resume_text)
    document_exp = extract_experience_years(document_text)

    if abs(resume_exp - document_exp) >= 2:
        flags.append("Experience mismatch detected")
        score_penalty += 20

    if detect_employment_gaps(resume_text):
        flags.append("Large employment timeline gap detected")
        score_penalty += 15

    keyword_score = calculate_resume_score(resume_text, document_text)
    base_risk = 100 - keyword_score
    risk_score = min(max(base_risk + score_penalty, 0), 100)

    if risk_score >= 80:
        decision = "High Risk"
    elif risk_score >= 50:
        decision = "Medium Risk"
    else:
        decision = "Low Risk"

    summary = f"""
    Verification completed.
    Risk Level: {decision}.
    Resume Experience: {resume_exp} years.
    Document Experience: {document_exp} years.
    """

    if flags:
        summary += "Issues found: " + ", ".join(flags)
    else:
        summary += "No discrepancies detected."

    return {
        "risk_score": risk_score,
        "risk_level": decision,
        "flags": flags,
        "summary": summary.strip()
    }


@app.route("/ai-verification", methods=["POST"])
def ai_verification():
    data = request.json

    resume_text = data.get("resume_text", "")
    document_text = data.get("document_text", "")

    if not resume_text or not document_text:
        return jsonify({"error": "Resume and document text required"}), 400

    result = calculate_verification_risk(resume_text, document_text)
    return jsonify(result)


if __name__ == "__main__":
    app.run(port=8000)