from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import spacy

app = Flask(__name__)

# Load spaCy English model (for lemmatization)
nlp = spacy.load("en_core_web_sm")

# Threshold for shortlisting
SHORTLIST_THRESHOLD = 35.0

# Persistent vectorizer and job description TF-IDF
vectorizer = None
job_vector = None

def preprocess_text(text):
    """Lowercase, lemmatize, and remove stopwords using spaCy."""
    doc = nlp(text.lower())
    tokens = [token.lemma_ for token in doc if not token.is_stop and token.is_alpha]
    return " ".join(tokens)

@app.route("/set_job_description", methods=["POST"])
def set_job_description():
    """
    Preprocess and vectorize the job description once.
    This should be called once per job posting before scoring resumes.
    """
    global vectorizer, job_vector

    data = request.json or {}
    job_description = data.get("job_description", "").strip()
    if not job_description:
        return jsonify({"error": "job_description cannot be empty"}), 400

    processed_job = preprocess_text(job_description)

    # Fit TF-IDF vectorizer on the job description
    vectorizer = TfidfVectorizer()
    job_vector = vectorizer.fit_transform([processed_job])

    return jsonify({"message": "Job description set and vectorized successfully."})

@app.route("/score", methods=["POST"])
def score_resume():
    global vectorizer, job_vector

    if vectorizer is None or job_vector is None:
        return jsonify({"error": "Job description not set. Call /set_job_description first."}), 400

    data = request.json or {}
    resume_text = data.get("resume_text", "").strip()
    if not resume_text:
        return jsonify({"score": 0.0, "shortlist": False})

    processed_resume = preprocess_text(resume_text)

    # Transform resume using the persistent vectorizer
    resume_vector = vectorizer.transform([processed_resume])

    # Compute cosine similarity
    sim_score = cosine_similarity(resume_vector, job_vector)[0, 0] * 100
    sim_score = round(sim_score, 2)

    shortlist = sim_score >= SHORTLIST_THRESHOLD

    print(f"Resume length: {len(resume_text)}, Score: {sim_score}")
    return jsonify({"score": sim_score, "shortlist": shortlist})

if __name__ == "__main__":
    app.run(port=8000)
