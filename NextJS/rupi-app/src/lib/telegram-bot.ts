// Telegram Bot Service
// Handles sending messages and interacting with Telegram Bot API

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    mime_type?: string;
    file_size?: number;
  };
}

export interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  message?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export class TelegramBotService {
  // Send text message to user
  static async sendMessage(chatId: string | number, text: string, options?: {
    parse_mode?: 'Markdown' | 'HTML';
    reply_markup?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      console.log(`📤 Sending message to ${chatId}: ${text.substring(0, 50)}...`);
      
      if (!TELEGRAM_BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN is not set');
        return false;
      }

      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: options?.parse_mode || 'Markdown',
          reply_markup: options?.reply_markup,
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error('❌ Telegram API error:', data);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
        return false;
      }

      console.log(`✅ Message sent successfully to ${chatId}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending telegram message:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  // Send typing action
  static async sendTypingAction(chatId: string | number): Promise<void> {
    try {
      await fetch(`${TELEGRAM_API_URL}/sendChatAction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          action: 'typing',
        }),
      });
    } catch (error) {
      console.error('Error sending typing action:', error);
    }
  }

  // Set webhook
  static async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
        }),
      });

      const data = await response.json();
      console.log('Set webhook response:', data);
      
      return data.ok;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return false;
    }
  }

  // Get webhook info
  static async getWebhookInfo(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error getting webhook info:', error);
      return {};
    }
  }

  // Delete webhook
  static async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
        method: 'POST',
      });
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }

  // Format message for Telegram (escape special characters for Markdown)
  static escapeMarkdown(text: string): string {
    // Escape special markdown characters
    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }

  // Convert AI response to Telegram-friendly format
  static formatAIResponse(text: string): string {
    // Remove ** markdown for headers (Telegram doesn't support this in basic Markdown)
    let formatted = text.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    
    // Don't escape already formatted text, just clean it up
    return formatted;
  }

  // Create inline keyboard for login
  static createLoginKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: '🔐 Login to Fundy',
            callback_data: 'start_login'
          }
        ]
      ]
    };
  }

  // Create inline keyboard for transaction confirmation
  static createTransactionConfirmKeyboard(transactionData: string) {
    return {
      inline_keyboard: [
        [
          {
            text: '✅ Confirm',
            callback_data: `confirm_tx:${transactionData}`
          },
          {
            text: '✏️ Edit',
            callback_data: `edit_tx:${transactionData}`
          }
        ],
        [
          {
            text: '❌ Cancel',
            callback_data: 'cancel_tx'
          }
        ]
      ]
    };
  }

  // Answer callback query
  static async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text,
          show_alert: showAlert || false
        }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Error answering callback query:', error);
      return false;
    }
  }

  // Edit message text
  static async editMessageText(chatId: string | number, messageId: number, text: string, options?: {
    parse_mode?: 'Markdown' | 'HTML';
    reply_markup?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: options?.parse_mode || 'Markdown',
          reply_markup: options?.reply_markup,
        }),
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  // Get file info from Telegram
  static async getFile(fileId: string): Promise<{ file_path?: string } | null> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/getFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
        }),
      });

      const data = await response.json();
      return data.ok ? data.result : null;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  // Download file from Telegram
  static async downloadFile(filePath: string): Promise<Buffer | null> {
    try {
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        console.error('Failed to download file:', response.status, response.statusText);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }
}
