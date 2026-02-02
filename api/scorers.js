import { put, list } from '@vercel/blob';
import bcrypt from 'bcryptjs';

const BLOB_PATH = 'scorers.csv';
const CSV_HEADER = 'scout_name,real_name,scout_group,password_hash';

function csvEscape(value) {
  if (value == null) return '""';
  const s = String(value).replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : `"${s}"`;
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
  const headerRow = rows[0] || [];
  const headerIndex = headerRow.map(h => h.toLowerCase().replace(/^"|"$/g, ''));
  const scoutNameIdx = headerIndex.indexOf('scout_name');
  const realNameIdx = headerIndex.indexOf('real_name');
  const scoutGroupIdx = headerIndex.indexOf('scout_group');
  const passwordHashIdx = headerIndex.indexOf('password_hash');
  
  const dataRows = scoutNameIdx >= 0 ? rows.slice(1) : rows;
  return dataRows.map((row, index) => ({
    id: index,
    scoutName: (row[scoutNameIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '"'),
    realName: (row[realNameIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '"'),
    scoutGroup: (row[scoutGroupIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '"'),
    passwordHash: (row[passwordHashIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '"'),
  }));
}

function toCSV(scorers) {
  const header = CSV_HEADER;
  const rows = scorers.map(s =>
    [csvEscape(s.scoutName), csvEscape(s.realName), csvEscape(s.scoutGroup), csvEscape(s.passwordHash || '')].join(',')
  );
  return [header, ...rows].join('\n');
}

async function readBlobContent() {
  const { blobs } = await list({ prefix: '' });
  const scorersBlob = blobs.find(b => b.pathname === BLOB_PATH);
  if (!scorersBlob) return null;
  const res = await fetch(scorersBlob.url);
  return res.text();
}

async function writeBlobContent(csv) {
  await put(BLOB_PATH, csv, {
    access: 'public',
    contentType: 'text/csv',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
      message: 'Add BLOB_READ_WRITE_TOKEN in Vercel project settings and create a Blob store.',
    });
  }

  try {
    if (req.method === 'GET') {
      let csv = await readBlobContent();
      if (csv == null || csv.trim() === '' || csv.trim() === CSV_HEADER) {
        csv = CSV_HEADER + '\n';
        await writeBlobContent(csv);
      }
      const scorers = parseCSV(csv);
      // Don't return password hashes to frontend
      const scorersWithoutPasswords = scorers.map(({ passwordHash, ...rest }) => rest);
      return res.status(200).json(scorersWithoutPasswords);
    }

    if (req.method === 'POST') {
      const { scoutName, realName, scoutGroup, password } = req.body || {};
      if (!scoutName?.trim() || !realName?.trim() || !scoutGroup?.trim()) {
        return res.status(400).json({ error: 'scoutName, realName, and scoutGroup are required' });
      }
      if (!password?.trim()) {
        return res.status(400).json({ error: 'password is required' });
      }
      let csv = await readBlobContent();
      if (csv == null || csv.trim() === '') {
        csv = CSV_HEADER + '\n';
      }
      const scorers = parseCSV(csv);
      const passwordHash = await bcrypt.hash(String(password).trim(), 10);
      scorers.push({
        id: scorers.length,
        scoutName: String(scoutName).trim(),
        realName: String(realName).trim(),
        scoutGroup: String(scoutGroup).trim(),
        passwordHash,
      });
      const newCsv = toCSV(scorers);
      await writeBlobContent(newCsv);
      const scorersWithoutPasswords = scorers.map(({ passwordHash, ...rest }) => rest);
      return res.status(200).json(scorersWithoutPasswords);
    }

    if (req.method === 'PUT') {
      const { id, scoutName, realName, scoutGroup, password } = req.body || {};
      const index = typeof id === 'number' ? id : parseInt(id, 10);
      if (Number.isNaN(index) || index < 0) {
        return res.status(400).json({ error: 'Valid id is required' });
      }
      if (!scoutName?.trim() || !realName?.trim() || !scoutGroup?.trim()) {
        return res.status(400).json({ error: 'scoutName, realName, and scoutGroup are required' });
      }
      let csv = await readBlobContent();
      if (!csv) return res.status(404).json({ error: 'No scorers file found' });
      const scorers = parseCSV(csv);
      if (index >= scorers.length) return res.status(404).json({ error: 'Scorer not found' });
      
      // If password provided, hash it; otherwise keep existing hash
      let passwordHash = scorers[index].passwordHash;
      if (password?.trim()) {
        passwordHash = await bcrypt.hash(String(password).trim(), 10);
      }
      
      scorers[index] = {
        id: index,
        scoutName: String(scoutName).trim(),
        realName: String(realName).trim(),
        scoutGroup: String(scoutGroup).trim(),
        passwordHash,
      };
      await writeBlobContent(toCSV(scorers));
      const scorersWithoutPasswords = scorers.map(({ passwordHash, ...rest }) => rest);
      return res.status(200).json(scorersWithoutPasswords);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const index = typeof id === 'string' ? parseInt(id, 10) : id;
      if (Number.isNaN(index) || index < 0) {
        return res.status(400).json({ error: 'Valid id query is required' });
      }
      let csv = await readBlobContent();
      if (!csv) return res.status(404).json({ error: 'No scorers file found' });
      const scorers = parseCSV(csv);
      if (index >= scorers.length) return res.status(404).json({ error: 'Scorer not found' });
      scorers.splice(index, 1);
      const reindexed = scorers.map((s, i) => ({ ...s, id: i }));
      await writeBlobContent(toCSV(reindexed));
      const reindexedWithoutPasswords = reindexed.map(({ passwordHash, ...rest }) => rest);
      return res.status(200).json(reindexedWithoutPasswords);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
