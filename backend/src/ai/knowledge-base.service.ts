import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { Cron } from '@nestjs/schedule';

const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

import { Document } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';

interface VectorChunk {
    documentId: string;
    versionId: string;
    file: string; // original filename for reference
    text: string;
    embedding: number[];
}

@Injectable()
export class KnowledgeBaseService {
    private readonly logger = new Logger(KnowledgeBaseService.name);
    private readonly ollamaUrl: string;
    private readonly kbDir: string;
    private readonly vectorStorePath: string;
    private vectorStore: VectorChunk[] = [];

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @InjectRepository(Document)
        private readonly docRepo: Repository<Document>,
        @InjectRepository(DocumentVersion)
        private readonly versionRepo: Repository<DocumentVersion>,
    ) {
        this.ollamaUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
        
        // Base paths relative to the current workspace cwd
        this.kbDir = path.join(process.cwd(), 'knowledge_base');
        this.vectorStorePath = path.join(this.kbDir, 'vector_store.json');
        
        this.ensureDirectories();
        this.loadVectorStore();
    }

    private ensureDirectories() {
        try {
            if (!fs.existsSync(this.kbDir)) {
                fs.mkdirSync(this.kbDir, { recursive: true });
                this.logger.log(`Created knowledge_base folder at: ${this.kbDir}`);
            }
        } catch (e) {
            this.logger.error('Failed to create knowledge base directory', e.message);
        }
    }

    private loadVectorStore() {
        try {
            if (fs.existsSync(this.vectorStorePath)) {
                const raw = fs.readFileSync(this.vectorStorePath, 'utf8');
                this.vectorStore = JSON.parse(raw);
                this.logger.log(`Loaded ${this.vectorStore.length} chunks from vector store.`);
            } else {
                this.vectorStore = [];
                this.logger.log('No existing vector store found. Ready for reindexing.');
            }
        } catch (e) {
            this.logger.error('Failed to load vector store file', e.message);
            this.vectorStore = [];
        }
    }

    /**
     * Extracts text from PDF files using pdf-parse
     */
    private async extractPdfText(filePath: string): Promise<string> {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const parser = new PDFParse({ data: dataBuffer });
            const parsed = await parser.getText();
            await parser.destroy();
            return parsed.text || '';
        } catch (e) {
            this.logger.error(`Failed to extract text from PDF file at ${filePath}: ${e.message}`);
            return '';
        }
    }

    /**
     * Extracts text from DOCX files using mammoth
     */
    private async extractDocxText(filePath: string): Promise<string> {
        try {
            const parsed = await mammoth.extractRawText({ path: filePath });
            return parsed.value || '';
        } catch (e) {
            this.logger.error(`Failed to extract text from Word file at ${filePath}: ${e.message}`);
            return '';
        }
    }

    /**
     * Chunk text using sliding window of characters
     */
    private chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
        // Normalize newlines and excess whitespace
        const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        
        // If the text is smaller than or equal to the chunk size, return it as a single chunk
        if (cleanText.length <= chunkSize) {
            return [cleanText.trim()].filter(c => c.length > 20);
        }

        const chunks: string[] = [];
        let index = 0;

        while (index < cleanText.length) {
            // Grab a chunk of text
            let chunk = cleanText.substring(index, index + chunkSize);
            
            // Adjust to prevent cutting off words in the middle
            if (index + chunkSize < cleanText.length) {
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastSpace > chunkSize - 100) {
                    chunk = chunk.substring(0, lastSpace);
                }
            }

            chunks.push(chunk.trim());
            
            // Move index forward. Ensure it always moves by at least 1 even if overlap is somehow larger
            const step = chunk.length - overlap;
            index += step > 0 ? step : chunkSize;

            // Break if the remaining part is smaller than the overlap
            if (index + overlap >= cleanText.length) {
                break;
            }
        }
        return chunks.filter(c => c.length > 20);
    }

    /**
     * Calls Ollama API to generate a 1024-dimension embedding vector
     */
    private async getEmbedding(text: string): Promise<number[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/embeddings`, {
                    model: 'mxbai-embed-large:latest',
                    prompt: text,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000,
                })
            );
            return response.data?.embedding || [];
        } catch (e) {
            this.logger.error(`Ollama embedding generation failed: ${e.message}`);
            throw new Error(`Failed to generate embedding: ${e.message}`);
        }
    }

    /**
     * Scan approved documents in PostgreSQL, parse raw files, chunk, embed new files, and save index
     */
    async rebuildIndex(): Promise<{ success: boolean; filesProcessed: number; totalChunks: number }> {
        this.logger.log('Starting database-integrated RAG reindexing process...');
        this.ensureDirectories();

        // 1. Fetch all APPROVED documents from the database
        const approvedDocs = await this.docRepo.find({
            where: { status: 'approved' as any }
        });

        this.logger.log(`Found ${approvedDocs.length} approved documents in the database.`);
        const newStore: VectorChunk[] = [];
        let filesProcessed = 0;

        for (const doc of approvedDocs) {
            if (!doc.currentVersionId) {
                this.logger.warn(`Document '${doc.title}' has no currentVersionId. Skipping.`);
                continue;
            }

            // 2. Fetch the current document version details
            const version = await this.versionRepo.findOne({
                where: { id: doc.currentVersionId }
            });

            if (!version) {
                this.logger.warn(`Version details not found for document ID '${doc.id}'. Skipping.`);
                continue;
            }

            // Path to the file stored on disk
            const relativePath = version.filePath;
            const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath);

            if (!fs.existsSync(fullPath)) {
                this.logger.error(`Physical file not found on disk at: ${fullPath} for document '${doc.title}'. Skipping.`);
                continue;
            }

            filesProcessed++;

            // 3. Incremental Indexing Check
            // If the versionId matches what we already have indexed, copy the existing vectors
            const existingChunks = this.vectorStore.filter(c => c.versionId === version.id);
            if (existingChunks.length > 0) {
                this.logger.log(`Document version '${version.id}' ('${version.fileName}') is already indexed. Reusing ${existingChunks.length} chunks.`);
                newStore.push(...existingChunks);
                continue;
            }

            // 4. If it's a new or updated version, extract its text content
            this.logger.log(`Indexing new/updated file version '${version.id}' (${version.fileName})...`);
            let fileText = '';
            const lowerName = version.fileName.toLowerCase();

            try {
                if (lowerName.endsWith('.pdf')) {
                    fileText = await this.extractPdfText(fullPath);
                } else if (lowerName.endsWith('.docx')) {
                    fileText = await this.extractDocxText(fullPath);
                } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
                    fileText = fs.readFileSync(fullPath, 'utf8');
                } else {
                    this.logger.warn(`Unsupported file format for '${version.fileName}'. Skipping content extraction.`);
                    continue;
                }

                if (!fileText.trim()) {
                    this.logger.warn(`No text could be extracted from '${version.fileName}'. Skipping.`);
                    continue;
                }

                // 5. Chunk the text
                const chunks = this.chunkText(fileText);
                this.logger.log(`Extracted text from '${version.fileName}' split into ${chunks.length} chunks.`);

                // 6. Generate embeddings for each chunk
                for (let i = 0; i < chunks.length; i++) {
                    const chunkText = chunks[i];
                    this.logger.log(`Embedding chunk ${i + 1}/${chunks.length} for ${version.fileName}...`);
                    const embedding = await this.getEmbedding(chunkText);
                    
                    if (embedding && embedding.length > 0) {
                        newStore.push({
                            documentId: doc.id,
                            versionId: version.id,
                            file: version.fileName,
                            text: chunkText,
                            embedding,
                        });
                    }
                }
            } catch (error) {
                this.logger.error(`Error processing file '${version.fileName}':`, error.message);
            }
        }

        // 7. Save vector store to json
        try {
            fs.writeFileSync(this.vectorStorePath, JSON.stringify(newStore, null, 2), 'utf8');
            this.vectorStore = newStore;
            this.logger.log(`Successfully saved ${newStore.length} chunks to vector store.`);
            return {
                success: true,
                filesProcessed,
                totalChunks: newStore.length
            };
        } catch (e) {
            this.logger.error('Failed to write vector store json file', e.message);
            return { success: false, filesProcessed, totalChunks: 0 };
        }
    }

    /**
     * Compute cosine similarity/dot product between two vectors
     */
    private calculateSimilarity(vecA: number[], vecB: number[]): number {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Query vectors to find the top relevant chunks
     */
    async search(query: string, limit = 3): Promise<string[]> {
        if (this.vectorStore.length === 0) {
            // Load if not loaded
            this.loadVectorStore();
            if (this.vectorStore.length === 0) {
                return [];
            }
        }

        try {
            const queryEmbedding = await this.getEmbedding(query);
            if (!queryEmbedding || queryEmbedding.length === 0) return [];

            const scoredChunks = this.vectorStore.map(chunk => {
                const score = this.calculateSimilarity(queryEmbedding, chunk.embedding);
                return { text: chunk.text, file: chunk.file, score };
            });

            // Sort descending by score
            scoredChunks.sort((a, b) => b.score - a.score);

            // Filter chunks with a reasonable threshold
            const matches = scoredChunks
                .filter(c => c.score > 0.4) // minimum similarity threshold
                .slice(0, limit)
                .map(c => `[Source Document: ${c.file}]\n${c.text}`);

            return matches;
        } catch (e) {
            this.logger.error('RAG vector search query failed', e.message);
            return [];
        }
    }

    /**
     * Rebuild the vector store index automatically at 11:30 PM every night
     */
    @Cron('0 30 23 * * *')
    async handleScheduledRebuild() {
        this.logger.log('Triggering scheduled daily knowledge base rebuild...');
        try {
            const result = await this.rebuildIndex();
            this.logger.log(`Scheduled rebuild complete. Processed files: ${result.filesProcessed}, Chunks: ${result.totalChunks}`);
        } catch (err) {
            this.logger.error(`Scheduled rebuild failed: ${err.message}`);
        }
    }
}
