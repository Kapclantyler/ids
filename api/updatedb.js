import { Octokit } from "@octokit/rest";
import { config } from "dotenv";

config(); // Load env variables (if using local testing or Vercel)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { jobid } = req.body;

  if (!jobid || typeof jobid !== "string") {
    return res.status(400).json({ success: false, message: "Missing or invalid jobid" });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const owner = "Kapclantyler";
  const repo = "ids";
  const path = "api/jobids.json";

  try {
    // Get the current contents of jobids.json
    const { data: fileData } = await octokit.repos.getContent({ owner, repo, path });
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
    const json = JSON.parse(content);

    if (!Array.isArray(json)) {
      throw new Error("Invalid JSON format: expected an array");
    }

    // Avoid duplicates
    if (!json.includes(jobid)) {
      json.push(jobid);
    }

    // Update the file
    const updatedContent = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Add jobid ${jobid}`,
      content: updatedContent,
      sha: fileData.sha
    });

    res.status(200).json({ success: true, message: "JobId stored in jobids.json" });
  } catch (err) {
    console.error("GitHub update failed:", err);
    res.status(500).json({ success: false, message: "GitHub update failed", error: err.message });
  }
}
