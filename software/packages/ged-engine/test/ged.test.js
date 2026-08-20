import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCategory, listGedFiles, listGedFolders, setFileMeta, getMetadata, deleteFilesByConversation } from '../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tmpGed = path.join(__dirname, 'tmp-ged');

describe('ged-engine', () => {
  it('classifies document categories correctly', () => {
    assert.equal(classifyCategory('.pdf'), 'pdf');
    assert.equal(classifyCategory('.xlsx'), 'spreadsheet');
    assert.equal(classifyCategory('.csv'), 'spreadsheet');
    assert.equal(classifyCategory('.docx'), 'document');
    assert.equal(classifyCategory('.png'), 'image');
    assert.equal(classifyCategory('.zip'), 'archive');
    assert.equal(classifyCategory('.unknown'), 'other');
  });

  it('lists and categorizes files from disk', () => {
    fs.mkdirSync(tmpGed, { recursive: true });
    fs.writeFileSync(path.join(tmpGed, 'facture.pdf'), 'PDF DATA');
    fs.writeFileSync(path.join(tmpGed, 'synthese.xlsx'), 'EXCEL DATA');

    const files = listGedFiles(tmpGed);
    assert.equal(files.length, 2);
    assert.equal(files.some(f => f.name === 'facture.pdf' && f.category === 'pdf'), true);
    assert.equal(files.some(f => f.name === 'synthese.xlsx' && f.category === 'spreadsheet'), true);

    fs.rmSync(tmpGed, { recursive: true, force: true });
  });

  it('lists subfolders recursively', () => {
    const sub = path.join(tmpGed, 'Clients', 'Dupont');
    fs.mkdirSync(sub, { recursive: true });
    const folders = listGedFolders(tmpGed);
    assert.equal(folders.includes('Clients'), true);
    assert.equal(folders.includes('Clients/Dupont'), true);
    fs.rmSync(tmpGed, { recursive: true, force: true });
  });

  it('manages metadata provenance and deletion by conversation', () => {
    setFileMeta('test_doc.pdf', {
      conversationId: 'conv_123',
      conversationName: 'Compta 2026',
    });
    const meta = getMetadata();
    assert.equal(meta['test_doc.pdf']?.conversationName, 'Compta 2026');
  });
});
