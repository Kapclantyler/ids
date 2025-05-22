const axios = require('axios');

const token = const token = process.env.GITHUB_TOKEN;
const owner = 'Kapclantyler';
const repo = 'ids';

const getFileData = async (filePath) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: { Authorization: `token ${token}` },
    });
    return { sha: response.data.sha, content: JSON.parse(Buffer.from(response.data.content, 'base64').toString()) };
  } catch (error) {
    console.error('Error fetching file data:', error.message);
    return { sha: null, content: [] }; // Always return success: false instead of 404
  }
};

const updateFile = async (filePath, content, sha, message) => {
  try {
    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        message,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha,
      },
      { headers: { Authorization: `token ${token}` } }
    );
  } catch (error) {
    console.error('Error updating file:', error.message);
    throw error;
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const { action, database, key } = req.body;

  if (!['create', 'edit', 'delete', 'addDatabase', 'getDatabase'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  if (!database) return res.status(400).json({ success: false, error: 'Database name not provided' });
  
  const filePath = `api/${database}.json`;

  try {
    if (action === 'addDatabase') {
      const existing = await getFileData(filePath);
      if (existing.sha) return res.status(400).json({ success: false, error: 'Database already exists' });

      await updateFile(filePath, [], null, `Create new database: ${database}`);
      return res.status(201).json({ success: true, message: `Database ${database} created successfully` });
    }

    if (action === 'getDatabase') {
      const { content } = await getFileData(filePath);

      if (key) {
        const entry = content.find((item) => item.key === key);
        if (!entry) return res.status(200).json({ success: false, error: 'Key not found' });
        return res.status(200).json({ success: true, data: entry });
      }

      return res.status(200).json({ success: true, data: content });
    }

    const { sha, content } = await getFileData(filePath);

    if (action === 'create') {
      if (content.some((item) => item.key === req.body.entry.key)) {
        return res.status(400).json({ success: false, error: 'Key already exists' });
      }
      content.push(req.body.entry);
      await updateFile(filePath, content, sha, `Add entry to ${database}`);
    } else if (action === 'edit') {
      const index = content.findIndex((item) => item.key === req.body.entry.key);
      if (index === -1) {
        return res.status(200).json({ success: false, error: 'Entry not found' });
      }
      content[index] = { ...content[index], ...req.body.entry };
      await updateFile(filePath, content, sha, `Edit entry in ${database}`);
    } else if (action === 'delete') {
      const newContent = content.filter((item) => item.key !== req.body.entry.key);
      if (newContent.length === content.length) {
        return res.status(200).json({ success: false, error: 'Entry not found' });
      }
      await updateFile(filePath, newContent, sha, `Delete entry from ${database}`);
    }

    return res.status(200).json({ success: true, message: `Entry ${action}d successfully in ${database}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
