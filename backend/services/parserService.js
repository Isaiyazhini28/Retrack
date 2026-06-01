import fs from "fs";
import { SKILL_DICT, PRIORITY_DICT, ESTIMATION_RULES } from "./aiDictionary.js";

// Read uploaded file
export const parseTextFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .map(l => l.trim())
    .filter(l => l);
};

// Match helper
const getBestMatch = (text, dict) => {
  let best = null;
  let max = 0;
  for (let key in dict) {
    let score = 0;
    dict[key].forEach(word => { if (text.toLowerCase().includes(word.toLowerCase())) score++; });
    if (score > max) { max = score; best = key; }
  }
  return best;
};

// Extract tasks as objects
export const extractTasks = (lines) => {
  return lines.map(line => {
    const skill = getBestMatch(line, SKILL_DICT) || "General";
    const priority = getBestMatch(line, PRIORITY_DICT) || "Medium";
    const estimated_hours = ESTIMATION_RULES[priority] || 6;

    return {
      task_name: line,
      skill_required: skill,
      priority,
      estimated_hours
    };
  });
};