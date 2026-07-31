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
    private readonly okfDir: string;
    private readonly vectorStorePath: string;
    private vectorStore: VectorChunk[] = [];
    private okfCache: Map<string, any> = new Map();

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
        this.okfDir = path.join(this.kbDir, 'okf');
        this.vectorStorePath = path.join(this.kbDir, 'vector_store.json');
        
        this.ensureDirectories();
        this.loadVectorStore();
        this.loadOkfCache();
    }

    private ensureDirectories() {
        try {
            if (!fs.existsSync(this.kbDir)) {
                fs.mkdirSync(this.kbDir, { recursive: true });
                this.logger.log(`Created knowledge_base folder at: ${this.kbDir}`);
            }
            if (!fs.existsSync(this.okfDir)) {
                fs.mkdirSync(this.okfDir, { recursive: true });
                this.logger.log(`Created OKF directory at: ${this.okfDir}`);
            }
        } catch (e) {
            this.logger.error('Failed to create knowledge base directories', e.message);
        }
    }

    private loadOkfCache() {
        try {
            this.okfCache.clear();
            if (fs.existsSync(this.okfDir)) {
                const docDirs = fs.readdirSync(this.okfDir);
                for (const docId of docDirs) {
                    const docDirPath = path.join(this.okfDir, docId);
                    if (fs.statSync(docDirPath).isDirectory()) {
                        const metaPath = path.join(docDirPath, 'metadata.json');
                        if (fs.existsSync(metaPath)) {
                            const raw = fs.readFileSync(metaPath, 'utf8');
                            const meta = JSON.parse(raw);
                            this.okfCache.set(docId, meta);
                        }
                    }
                }
                this.logger.log(`Loaded ${this.okfCache.size} OKF metadata items into memory cache.`);
            }
        } catch (e) {
            this.logger.error('Failed to load OKF metadata cache from disk', e.message);
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
     * Smart Section, Paragraph & Table-Aware Semantic Chunking
     */
    private chunkText(text: string, maxChunkSize = 1000, targetChunkSize = 750): string[] {
        if (!text || text.trim().length === 0) {
            return [];
        }

        // Normalize line breaks
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

        if (normalizedText.length <= targetChunkSize) {
            return [normalizedText].filter(c => c.length > 20);
        }

        // Split text into structural blocks (double newlines, markdown headings, or table blocks)
        const rawBlocks = normalizedText.split(/(?=\n#{1,6}\s)|\n\n+/);
        const blocks: string[] = [];

        for (const rawBlock of rawBlocks) {
            const trimmed = rawBlock.trim();
            if (!trimmed) continue;

            // Check if block is a table (lines containing '|')
            const isTable = trimmed.includes('|') && trimmed.split('\n').filter(l => l.includes('|')).length >= 2;

            if (isTable || trimmed.length <= maxChunkSize) {
                blocks.push(trimmed);
            } else {
                // If a single paragraph is larger than maxChunkSize, split cleanly by sentence endings (. , ! , ?)
                const sentences = trimmed.split(/(?<=[.!?])\s+/);
                let currentSentenceGroup = '';
                for (const sentence of sentences) {
                    if ((currentSentenceGroup + ' ' + sentence).length > maxChunkSize) {
                        if (currentSentenceGroup.trim()) {
                            blocks.push(currentSentenceGroup.trim());
                        }
                        currentSentenceGroup = sentence;
                    } else {
                        currentSentenceGroup = currentSentenceGroup ? `${currentSentenceGroup} ${sentence}` : sentence;
                    }
                }
                if (currentSentenceGroup.trim()) {
                    blocks.push(currentSentenceGroup.trim());
                }
            }
        }

        // Merge smaller structural blocks into cohesive chunks up to maxChunkSize
        const chunks: string[] = [];
        let currentChunk = '';

        for (const block of blocks) {
            if (!currentChunk) {
                currentChunk = block;
            } else if ((currentChunk.length + block.length + 2) <= maxChunkSize) {
                currentChunk += '\n\n' + block;
            } else {
                chunks.push(currentChunk.trim());
                currentChunk = block;
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
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
    private async generateSummary(text: string): Promise<string> {
        try {
            const slicedText = text.slice(0, 4000);
            const modelName = this.configService.get<string>('OLLAMA_MODEL') || 'gemma2:2b';
            this.logger.log(`Generating OKF summary using local model '${modelName}'...`);
            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: modelName,
                    prompt: `Summarize the following document content in 3-4 concise sentences, focusing on its main purpose, scope, and key requirements:\n\n${slicedText}`,
                    system: "You are a professional document indexing assistant. Provide a direct, concise summary without introducing yourself or saying 'Here is a summary'. Only output the summary.",
                    stream: false,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 180000,
                })
            );
            return response.data?.response?.trim() || 'No summary available.';
        } catch (e) {
            this.logger.error(`Ollama summary generation failed: ${e.message}`);
            return 'Summary generation failed.';
        }
    }

    /**
     * Scan approved documents in PostgreSQL, parse raw files, chunk, embed new files, and save index.
     * Also generates OKF structured directories (metadata.json and content.md) and updates cache.
     */
    async rebuildIndex(forceReindex = false): Promise<{ success: boolean; filesProcessed: number; totalChunks: number }> {
        this.logger.log(`Starting database-integrated RAG reindexing process (forceReindex=${forceReindex})...`);
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

            // Check if OKF metadata already exists for this version
            const docOkfDir = path.join(this.okfDir, doc.id);
            const docMetaPath = path.join(docOkfDir, 'metadata.json');
            const docContentPath = path.join(docOkfDir, 'content.md');
            
            let reuseOkf = false;
            
            if (fs.existsSync(docMetaPath) && fs.existsSync(docContentPath)) {
                try {
                    const rawMeta = fs.readFileSync(docMetaPath, 'utf8');
                    const metaObj = JSON.parse(rawMeta);
                    if (metaObj.versionId === version.id && metaObj.summary !== 'Summary generation failed.') {
                        reuseOkf = true;
                        this.okfCache.set(doc.id, metaObj);
                    }
                } catch (e) {
                    this.logger.warn(`Failed to read existing OKF metadata for ${doc.title}: ${e.message}`);
                }
            }

            // 3. Incremental Vector Indexing Check (bypassed if forceReindex is true)
            const existingChunks = !forceReindex ? this.vectorStore.filter(c => c.versionId === version.id) : [];
            if (existingChunks.length > 0) {
                this.logger.log(`Document version '${version.id}' ('${version.fileName}') is already vector indexed. Reusing ${existingChunks.length} chunks.`);
                newStore.push(...existingChunks);
            }

            // 4. If new or not fully indexed, read content and process
            if (existingChunks.length === 0 || !reuseOkf) {
                this.logger.log(`Processing file version '${version.id}' (${version.fileName}) for indexing...`);
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

                    // --- OKF GENERATION ---
                    if (!reuseOkf) {
                        this.logger.log(`Generating OKF package for '${doc.title}'...`);
                        if (!fs.existsSync(docOkfDir)) {
                            fs.mkdirSync(docOkfDir, { recursive: true });
                        }
                        
                        // Write content.md
                        fs.writeFileSync(docContentPath, fileText, 'utf8');
                        
                        // Generate summary via local LLM
                        const summary = await this.generateSummary(fileText);
                        
                        // Write metadata.json
                        const okfMetadata = {
                            id: doc.id,
                            versionId: version.id,
                            title: doc.title,
                            documentNumber: doc.documentNumber || 'N/A',
                            type: doc.type,
                            departments: doc.departments || [],
                            summary,
                            lastUpdated: new Date().toISOString()
                        };
                        
                        fs.writeFileSync(docMetaPath, JSON.stringify(okfMetadata, null, 2), 'utf8');
                        this.okfCache.set(doc.id, okfMetadata);
                        this.logger.log(`Successfully generated OKF metadata & summary for: ${doc.title}`);
                    }

                    // --- VECTOR CHUNKING & EMBEDDINGS (only if not already vector-indexed) ---
                    if (existingChunks.length === 0) {
                        const chunks = this.chunkText(fileText);
                        this.logger.log(`Extracted text from '${version.fileName}' split into ${chunks.length} chunks.`);

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
                    }
                } catch (error) {
                    this.logger.error(`Error processing file '${version.fileName}':`, error.message);
                }
            }
        }

        // 7. Save vector store to json
        try {
            fs.writeFileSync(this.vectorStorePath, JSON.stringify(newStore, null, 2), 'utf8');
            this.vectorStore = newStore;
            this.logger.log(`Successfully saved ${newStore.length} chunks to vector store.`);
            
            // Re-sync memory cache to reflect disk state
            this.loadOkfCache();

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
     * Retrieves the structured OKF metadata for a specific document
     */
    getOkfMetadata(docId: string): any {
        return this.okfCache.get(docId) || null;
    }

    /**
     * Returns all cached OKF metadata records
     */
    getOkfCachedDocuments(): any[] {
        return Array.from(this.okfCache.values());
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
