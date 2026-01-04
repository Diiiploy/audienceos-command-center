import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleAIFileManager } from "@google/generative-ai/server"
import { writeFile, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

// Gemini File API service for document indexing
export class GeminiFileService {
  private genAI: GoogleGenerativeAI
  private fileManager: GoogleAIFileManager

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is required for Gemini File API')
    }
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.fileManager = new GoogleAIFileManager(apiKey)
  }

  /**
   * Upload a document to Gemini File API for indexing
   * @param buffer - File buffer
   * @param mimeType - File MIME type
   * @param displayName - Display name for the file in Gemini
   * @returns Gemini file ID
   */
  async uploadFile(buffer: Buffer, mimeType: string, displayName: string): Promise<string> {
    // Write buffer to temp file for upload
    const tempPath = join(tmpdir(), `gemini-upload-${Date.now()}`)

    try {
      await writeFile(tempPath, buffer)

      const uploadResult = await this.fileManager.uploadFile(tempPath, {
        mimeType,
        displayName,
      })

      if (!uploadResult.file?.name) {
        throw new Error('Failed to get file ID from Gemini upload response')
      }

      return uploadResult.file.name
    } catch (error) {
      console.error('Gemini file upload error:', error)
      throw new Error(`Failed to upload file to Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Clean up temp file
      try {
        await unlink(tempPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Delete a file from Gemini File API
   * @param fileId - Gemini file ID
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.fileManager.deleteFile(fileId)
    } catch (error) {
      console.error('Gemini file deletion error:', error)
      throw new Error(`Failed to delete file from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get file status from Gemini File API
   * @param fileId - Gemini file ID
   * @returns File status and metadata
   */
  async getFileStatus(fileId: string) {
    try {
      const file = await this.fileManager.getFile(fileId)

      return {
        name: file.name,
        displayName: file.displayName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        state: file.state, // 'ACTIVE', 'PROCESSING', 'FAILED'
        createTime: file.createTime,
        updateTime: file.updateTime,
        expirationTime: file.expirationTime,
        error: file.error,
      }
    } catch (error) {
      console.error('Gemini file status error:', error)
      throw new Error(`Failed to get file status from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search documents using Gemini File API
   * @param query - Search query
   * @param fileIds - Array of Gemini file IDs to search within
   * @returns Search results
   */
  async searchDocuments(query: string, fileIds: string[]): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" })

      // Create file references for the prompt
      const fileRefs = fileIds.map(id => ({
        fileData: {
          mimeType: "application/pdf", // We'll assume PDF for now, could be enhanced
          fileUri: id
        }
      }))

      const prompt = `Based on the uploaded documents, please answer this question: ${query}

      Guidelines:
      - Use information from the documents to answer the question
      - If the answer isn't in the documents, say so clearly
      - Cite which document(s) contain the relevant information
      - Provide specific quotes or references when possible`

      const result = await model.generateContent([prompt, ...fileRefs])
      const response = await result.response

      return response.text()
    } catch (error) {
      console.error('Gemini search error:', error)
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Singleton instance
export const geminiFileService = new GeminiFileService()