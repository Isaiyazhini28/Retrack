import fs from "fs";
import * as pdf from "pdf-parse";

export const parseResume = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
};
