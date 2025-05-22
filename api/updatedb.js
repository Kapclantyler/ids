const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { jobid, placeversion } = req.body;

    if (!jobid || !placeversion) {
      return res.status(400).json({ message: "Missing jobid or placeversion" });
    }

    // 1. Get current jobids.json content and sha
    const { data: fileData } = await octokit.repos.getContent({
      owner: "Kapclantyler",
      repo: "ids",
      path: "api/jobids.json",
    });

    // 2. Decode base64 content
    const content = Buffer.from(fileData.content, "base64").toString("utf8");
    let json = {};
    try {
      json = JSON.parse(content);
    } catch {
      json = {};
    }

    // Ensure jobids key exists
    json.jobids = json.jobids || {};

    // 3. Add or update the jobid with placeversion
    json.jobids[jobid] = placeversion;

    // 4. Encode updated JSON back to base64
    const updatedContent = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");

    // 5. Commit updated file to GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner: "Kapclantyler",
      repo: "ids",
      path: "api/jobids.json",
      message: `Update jobid ${jobid} with placeversion ${placeversion}`,
      content: updatedContent,
      sha: fileData.sha,
    });

    res.status(200).json({ message: "Job ID updated successfully" });
  } catch (error) {
    console.error("Error updating jobid:", error);
    res.status(500).json({ message: "Failed to update jobid", error: error.message });
  }
};
