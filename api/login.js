import { list } from '@vercel/blob';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRY = '7d'; // Token expires in 7 days

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

async function findUser(scoutName, password) {
  // Check admins.csv first, then scorers.csv
  // If user exists in both, admin takes priority
  const files = [
    { path: 'admins.csv', type: 'admin' },
    { path: 'scorers.csv', type: 'scorer' }
  ];

  for (const file of files) {
    const csv = await readCSV(file.path);
    if (!csv) continue;

    const rows = parseCSV(csv);
    const headerRow = rows[0] || [];
    const headerIndex = headerRow.map(h => h.toLowerCase().replace(/^"|"$/g, ''));
    
    const scoutNameIdx = headerIndex.indexOf('scout_name');
    const passwordHashIdx = headerIndex.indexOf('password_hash');
    
    if (scoutNameIdx === -1 || passwordHashIdx === -1) continue;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowScoutName = (row[scoutNameIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '"');
      const rowPasswordHash = (row[passwordHashIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '"');
      
      if (rowScoutName.toLowerCase() === scoutName.toLowerCase() && rowPasswordHash) {
        const passwordMatch = await bcrypt.compare(password, rowPasswordHash);
        if (passwordMatch) {
          return {
            scoutName: rowScoutName,
            realName: (row[headerIndex.indexOf('real_name')] || '').replace(/^"|"$/g, '').replace(/""/g, '"'),
            scoutGroup: (row[headerIndex.indexOf('scout_group')] || '').replace(/^"|"$/g, '').replace(/""/g, '"'),
            userType: file.type,
          };
        }
      }
    }
  }
  return null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scoutName, password } = req.body || {};
    
    if (!scoutName || !password) {
      return res.status(400).json({ error: 'scoutName and password are required' });
    }

    const user = await findUser(scoutName, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        scoutName: user.scoutName,
        realName: user.realName,
        scoutGroup: user.scoutGroup,
        userType: user.userType,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.status(200).json({
      token,
      user: {
        scoutName: user.scoutName,
        realName: user.realName,
        scoutGroup: user.scoutGroup,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
