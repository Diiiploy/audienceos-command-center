// Global type definitions for Command Center

interface Window {
  /**
   * Opens the chat interface with a pre-filled message.
   * Added by ChatInterface component on mount.
   * @param message - The message to pre-fill in the chat input
   */
  openChatWithMessage?: (message: string) => void

  /**
   * Sets the chat context (legacy - used by pages to provide context).
   * Added by RootLayout component on mount.
   * @param context - Context object to pass to chat
   */
  setChatContext?: (context: any) => void
}
