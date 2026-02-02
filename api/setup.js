import { list } from '@vercel/blob';
import bcrypt from 'bcryptjs';
import { put } from '@vercel/blob';

async function readCSV(blobPath) {
  const { blobs } = await list({ prefix: '' });
  const blob = blobs.find(b => b.pathname === blobPath);
  if (!blob) return null;
  const res = await fetch(blob.url);
  return res.text();
}

function parseCSV(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = [];
    let field = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        if (inQuotes && line[j + 1] === '"') {
          field += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (inQuotes) {
        field += c;
      } else if (c === ',') {
        parsed.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    parsed.push(field.trim());
    rows.push(parsed);
  }
  return rows;
}

function csvEscape(value) {
  if (value == null) return '""';
  const s = String(value).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : `"${s}"`;
}

function toCSV(rows, header) {
  const csvRows = rows.map(row => row.map(cell => csvEscape(cell)).join(','));
  return [header, ...csvRows].join('\n');
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: 'Storage not configured',
      message: 'Add BLOB_READ_WRITE_TOKEN in Vercel project settings.',
    });
  }

  try {
    if (req.method === 'GET') {
      // Check if setup is needed (any admin/scorer has empty password)
      const adminsCsv = await readCSV('admins.csv');
      const scorersCsv = await readCSV('scorers.csv');
      
      let needsSetup = false;
      if (adminsCsv) {
        const rows = parseCSV(adminsCsv);
        const headerIndex = rows[0]?.map(h => h.toLowerCase().replace(/^"|"$/g, '')) || [];
        const passwordHashIdx = headerIndex.indexOf('password_hash');
        if (passwordHashIdx >= 0) {
          for (let i = 1; i < rows.length; i++) {
            const hash = (rows[i][passwordHashIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '');
            if (!hash || hash.trim() === '') {
              needsSetup = true;
              break;
            }
          }
        }
      }
      
      return res.status(200).json({ needsSetup });
    }

    if (req.method === 'POST') {
      const { scoutName, password, userType } = req.body || {};
      
      if (!scoutName || !password || !userType) {
        return res.status(400).json({ error: 'scoutName, password, and userType are required' });
      }

      if (userType !== 'admin' && userType !== 'scorer') {
        return res.status(400).json({ error: 'userType must be "admin" or "scorer"' });
      }

      const blobPath = userType === 'admin' ? 'admins.csv' : 'scorers.csv';
      let csv = await readCSV(blobPath);
      
      if (!csv) {
        return res.status(404).json({ error: 'No users file found' });
      }

      const rows = parseCSV(csv);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No users found in file' });
      }
      
      let headerRow = rows[0] || [];
      const headerIndex = headerRow.map(h => h.toLowerCase().replace(/^"|"$/g, ''));
      
      const scoutNameIdx = headerIndex.indexOf('scout_name');
      if (scoutNameIdx === -1) {
        return res.status(500).json({ error: 'Invalid CSV format: missing scout_name column' });
      }
      
      let passwordHashIdx = headerIndex.indexOf('password_hash');
      
      // If password_hash column doesn't exist, add it to header
      if (passwordHashIdx === -1) {
        headerRow.push('password_hash');
        headerIndex.push('password_hash');
        passwordHashIdx = headerIndex.length - 1;
        
        // Add empty password_hash to all existing rows
        for (let i = 1; i < rows.length; i++) {
          while (rows[i].length <= passwordHashIdx) {
            rows[i].push('');
          }
        }
      }

      // Find the user and check if password is empty
      let found = false;
      for (let i = 1; i < rows.length; i++) {
        // Ensure row has enough columns
        while (rows[i].length <= passwordHashIdx) {
          rows[i].push('');
        }
        
        const rowScoutName = (rows[i][scoutNameIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '');
        const rowPasswordHash = (rows[i][passwordHashIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '');
        
        if (rowScoutName.toLowerCase() === scoutName.toLowerCase()) {
          // Only allow setup if password is empty
          if (rowPasswordHash && rowPasswordHash.trim() !== '') {
            return res.status(403).json({ error: 'Password already set. Use login page instead.' });
          }
          
          // Set the password
          const passwordHash = await bcrypt.hash(String(password).trim(), 10);
          rows[i][passwordHashIdx] = passwordHash;
          found = true;
          break;
        }
      }

      if (!found) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Write back to blob - ensure header includes password_hash
      let header = headerRow.map(h => h.replace(/^"|"$/g, '')).join(',');
      if (!header.toLowerCase().includes('password_hash')) {
        header += ',password_hash';
      }
      const newCsv = toCSV(rows.slice(1), header);
      
      await put(blobPath, newCsv, {
        access: 'public',
        contentType: 'text/csv',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return res.status(200).json({ success: true, message: 'Password set successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
