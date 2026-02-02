import { put, list } from '@vercel/blob';
import bcrypt from 'bcryptjs';

const BLOB_PATH = 'admins.csv';
const CSV_HEADER = 'scout_name,real_name,scout_group,password_hash';
const INITIAL_ROW = '"Chip","James Robinson","1st Blackheath",""'; // Empty password - must be set via edit

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

function toCSV(admins) {
  const header = CSV_HEADER;
  const rows = admins.map(a =>
    [csvEscape(a.scoutName), csvEscape(a.realName), csvEscape(a.scoutGroup), csvEscape(a.passwordHash || '')].join(',')
  );
  return [header, ...rows].join('\n');
}

async function readBlobContent() {
  const { blobs } = await list({ prefix: '' });
  const adminsBlob = blobs.find(b => b.pathname === BLOB_PATH);
  if (!adminsBlob) return null;
  const res = await fetch(adminsBlob.url);
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
        csv = [CSV_HEADER, INITIAL_ROW].join('\n');
        await writeBlobContent(csv);
      }
      const admins = parseCSV(csv);
      // Don't return password hashes to frontend
      const adminsWithoutPasswords = admins.map(({ passwordHash, ...rest }) => rest);
      return res.status(200).json(adminsWithoutPasswords);
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
      const admins = parseCSV(csv);
      const passwordHash = await bcrypt.hash(String(password).trim(), 10);
      admins.push({
        id: admins.length,
        scoutName: String(scoutName).trim(),
        realName: String(realName).trim(),
        scoutGroup: String(scoutGroup).trim(),
        passwordHash,
      });
      const newCsv = toCSV(admins);
      await writeBlobContent(newCsv);
      const adminsWithoutPasswords = admins.map(({ passwordHash, ...rest }) => rest);
      return res.status(200).json(adminsWithoutPasswords);
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
      if (!csv) return res.status(404).json({ error: 'No admins file found' });
      const admins = parseCSV(csv);
      if (index >= admins.length) return res.status(404).json({ error: 'Admin not found' });
      
      // If password provided, hash it; otherwise keep existing hash
      let passwordHash = admins[index].passwordHash;
      if (password?.trim()) {
        passwordHash = await bcrypt.hash(String(password).trim(), 10);
      }
      
      admins[index] = {
        id: index,
        scoutName: String(scoutName).trim(),
        realName: String(realName).trim(),
        scoutGroup: String(scoutGroup).trim(),
        passwordHash,
      };
      await writeBlobContent(toCSV(admins));
      const adminsWithoutPasswords = admins.map(({ passwordHash, ...rest }) => rest);
      return res.status(200).json(adminsWithoutPasswords);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const index = typeof id === 'string' ? parseInt(id, 10) : id;
      if (Number.isNaN(index) || index < 0) {
        return res.status(400).json({ error: 'Valid id query is required' });
      }
      let csv = await readBlobContent();
      if (!csv) return res.status(404).json({ error: 'No admins file found' });
      const admins = parseCSV(csv);
      if (index >= admins.length) return res.status(404).json({ error: 'Admin not found' });
      admins.splice(index, 1);
      const reindexed = admins.map((a, i) => ({ ...a, id: i }));
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
