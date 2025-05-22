import { Octokit } from "@octokit/rest";

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
    // 1. Get current file data
    const { data: fileData } = await octokit.repos.getContent({ owner, repo, path });
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    // 2. Parse JSON content
    let json = [];
    try {
      json = JSON.parse(content);
      if (!Array.isArray(json)) json = [];
    } catch {
      json = [];
    }

    // 3. Add new jobid if missing
    if (!json.includes(jobid)) {
      json.push(jobid);
    }

    // 4. Encode updated JSON
    const updatedContent = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");

    // 5. Commit updated file to GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Add jobid ${jobid}`,
      content: updatedContent,
      sha: fileData.sha,
    });

    return res.status(200).json({ success: true, message: "JobId stored" });
  } catch (error) {
    console.error("GitHub update error:", error);
    return res.status(500).json({ success: false, message: "GitHub update failed", error: error.message });
  }
}
