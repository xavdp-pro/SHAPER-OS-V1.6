import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '../lib/chunker.js';
import { generateLocalEmbedding, VECTOR_SIZE } from '../lib/embedder.js';
import { extractTextFromFile } from '../lib/extractor.js';
import fs from 'node:fs';
import path from 'node:path';

describe('RAG Chunker & Embedder', () => {
  test('chunkText decoupe le texte en morceaux avec overlap', () => {
    const longText = 'Premier paragraphe concernant le projet SHAPER OS.\n\n' +
      'Deuxième paragraphe détaillant l\'architecture vectorielle et le RAG Qdrant.\n\n' +
      'Troisième paragraphe expliquant l\'intégration de la file asynchrone et des workers.';

    const chunks = chunkText(longText, { maxChunkSize: 100, overlap: 20 });
    assert.ok(chunks.length >= 2, 'Doit produire au moins 2 chunks');
    assert.equal(chunks[0].chunkIndex, 0);
    assert.ok(chunks[0].text.length > 0);
  });

  test('generateLocalEmbedding produit un vecteur unitaire de taille 384', () => {
    const vec = generateLocalEmbedding('Intelligence Artificielle et Base Vectorielle');
    assert.equal(vec.length, VECTOR_SIZE);
    
    // Calcul de la norme L2
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    assert.ok(Math.abs(norm - 1.0) < 0.001, 'La norme du vecteur doit être égale à 1.0');
  });

  test('extractTextFromFile lit les fichiers textes et markdown', async () => {
    const tmpFile = path.join('/tmp', 'test_rag_doc.md');
    fs.writeFileSync(tmpFile, '# Document de test\nContenu sémantique pour indexation.');
    
    const extracted = await extractTextFromFile(tmpFile);
    assert.equal(extracted.filename, 'test_rag_doc.md');
    assert.equal(extracted.format, 'md');
    assert.ok(extracted.text.includes('Contenu sémantique'));
    
    fs.unlinkSync(tmpFile);
  });
});
