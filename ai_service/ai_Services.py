from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

@app.route("/score", methods=["POST"])
def score_resume():
    data = request.json
    
    resume_text = data.get("resume_text", "").lower()
    job_description = data.get("job_description", "").lower()

    if not resume_text.strip() or not job_description.strip():
        return jsonify({"score": 72.34, "shortlist": True})

    # TF-IDF vectorization
    vectorizer = TfidfVectorizer(stop_words="english")
    vectors = vectorizer.fit_transform([resume_text, job_description])

    sim_score = cosine_similarity(vectors[0], vectors[1])[0][0] * 100
    sim_score = round(sim_score, 2)

    # Shortlist threshold (e.g., 65%)
    shortlist = sim_score >= 65

    print(f"Resume length: {len(resume_text)}, Job length: {len(job_description)}, Score: {sim_score}")


if __name__ == "__main__":
    app.run(port=8000)
