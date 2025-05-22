// /api/updatedb.js
import { Octokit } from "@octokit/rest";
import { config } from "dotenv";

config();

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const { jobid } = req.body;

    if (!jobid) {
        return res.status(400).json({ success: false, message: "Missing jobid" });
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    const owner = "Kapclantyler";
    const repo = "ids";
    const path = "api/jobids.txt";

    try {
        // Get the existing file
        const { data: file } = await octokit.repos.getContent({
            owner,
            repo,
            path
        });

        // Decode content
        const content = Buffer.from(file.content, 'base64').toString("utf-8");

        // Append new jobid (if not already present)
        const updated = content.includes(jobid) ? content : content + `\n${jobid}`;

        // Update file
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Add JobId: ${jobid}`,
            content: Buffer.from(updated).toString("base64"),
            sha: file.sha
        });

        res.status(200).json({ success: true, message: "JobId added." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update GitHub." });
    }
}
