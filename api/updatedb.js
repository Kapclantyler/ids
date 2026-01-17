const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Set this in Vercel environment variables
});

const REPO_OWNER = "Kapclantyler";
const REPO_NAME = "ids";
const FILE_PATH = "api/userids.json";
const BRANCH = "main";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userid, username, displayname, testing } = req.body;

    if (!userid) {
      return res.status(400).json({ error: "Missing userid" });
    }

    // Get current file content
    let currentData = { userids: {} };
    let fileSha = null;

    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: FILE_PATH,
        ref: BRANCH,
      });

      fileSha = fileData.sha;
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      currentData = JSON.parse(content);
    } catch (error) {
      // File doesn't exist yet, will create it
      console.log("File doesn't exist, creating new one");
    }

    // Check if userid already exists
    if (currentData.userids && currentData.userids[userid]) {
      // Check if testing status needs to be updated
      const currentTesting = currentData.userids[userid].testing || false;
      const newTesting = testing || false;
      
      if (currentTesting !== newTesting) {
        // Update the testing field
        currentData.userids[userid].testing = newTesting;
        currentData.userids[userid].last_updated = new Date().toISOString();
        
        // Update file on GitHub
        const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString("base64");
        
        await octokit.repos.createOrUpdateFileContents({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: FILE_PATH,
          message: `Update testing status for UserID: ${userid} (${username || "Unknown"})`,
          content: newContent,
          branch: BRANCH,
          sha: fileSha,
        });
        
        return res.status(200).json({ 
          message: "Testing status updated",
          userid: userid,
          alreadyExists: true,
          updated: true,
          testing: newTesting
        });
      }
      
      return res.status(200).json({ 
        message: "UserID already tracked",
        userid: userid,
        alreadyExists: true,
        updated: false,
        testing: currentTesting
      });
    }

    // Add new userid with metadata
    if (!currentData.userids) {
      currentData.userids = {};
    }

    currentData.userids[userid] = {
      username: username || "Unknown",
      displayname: displayname || username || "Unknown",
      first_seen: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      testing: testing || false,
    };

    // Update file on GitHub
    const newContent = Buffer.from(JSON.stringify(currentData, null, 2)).toString("base64");
    
    const updateParams = {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Add UserID: ${userid} (${username || "Unknown"})`,
      content: newContent,
      branch: BRANCH,
    };

    if (fileSha) {
      updateParams.sha = fileSha;
    }

    await octokit.repos.createOrUpdateFileContents(updateParams);

    return res.status(200).json({ 
      message: "UserID added successfully",
      userid: userid,
      username: username || "Unknown",
      testing: testing || false
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
}
