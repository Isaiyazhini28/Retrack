import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateTasks(requirementText) {

const prompt = `
You are a project manager.

Convert the requirement into tasks.

Return JSON:

{
 "project_name":"",
 "tasks":[
   {
    "task_name":"",
    "skill_required":"",
    "priority":"",
    "estimated_hours":0
   }
 ]
}

Requirement:
${requirementText}
`;

const response = await client.chat.completions.create({
  model: "gpt-4.1-mini",
  messages: [{ role: "user", content: prompt }]
});

return JSON.parse(response.choices[0].message.content);

}