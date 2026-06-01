export const SKILL_DICT = {
  "Node.js": ["api", "backend", "server", "database"],
  "React": ["ui", "frontend", "component", "design"],
  "Tester": ["test", "qa", "bug", "fix"],
  "DevOps": ["ci/cd", "deploy", "pipeline", "docker"],
  "Security": ["auth", "security", "encryption"]
};

export const PRIORITY_DICT = {
  Critical: ["critical", "blocker", "security", "payment"],
  High: ["urgent", "asap", "important", "bug"],
  Medium: ["improve", "enhance"],
  Low: ["minor", "optional"]
};

export const ESTIMATION_RULES = {
  Critical: 4,
  High: 6,
  Medium: 8,
  Low: 10
};