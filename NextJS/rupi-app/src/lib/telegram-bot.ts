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
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
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
          allowed_updates: ['message'],
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
    // Clean up the response and ensure proper Markdown formatting
    let formatted = text
      // Fix common Markdown issues
      .replace(/\*\*(.*?)\*\*/g, '*$1*')  // Convert **bold** to *bold*
      .replace(/__(.*?)__/g, '_$1_')      // Convert __italic__ to _italic_
      .replace(/\n\s*\n/g, '\n\n')        // Clean up multiple newlines
      .trim();

    // Escape special characters that could break Markdown
    formatted = formatted
      .replace(/(?<!\\)\*/g, '\\*')        // Escape * not already escaped
      .replace(/(?<!\\)_/g, '\\_')        // Escape _ not already escaped
      .replace(/(?<!\\)\[/g, '\\[')       // Escape [ not already escaped
      .replace(/(?<!\\)\]/g, '\\]')       // Escape ] not already escaped
      .replace(/(?<!\\)\(/g, '\\(')       // Escape ( not already escaped
      .replace(/(?<!\\)\)/g, '\\)')       // Escape ) not already escaped
      .replace(/(?<!\\)~/g, '\\~')        // Escape ~ not already escaped
      .replace(/(?<!\\)`/g, '\\`')        // Escape ` not already escaped
      .replace(/(?<!\\)>/g, '\\>')        // Escape > not already escaped
      .replace(/(?<!\\)#/g, '\\#')        // Escape # not already escaped
      .replace(/(?<!\\)\+/g, '\\+')       // Escape + not already escaped
      .replace(/(?<!\\)-/g, '\\-')        // Escape - not already escaped
      .replace(/(?<!\\)=/g, '\\=')        // Escape = not already escaped
      .replace(/(?<!\\)\|/g, '\\|')       // Escape | not already escaped
      .replace(/(?<!\\)\{/g, '\\{')     // Escape { not already escaped
      .replace(/(?<!\\)\}/g, '\\}')       // Escape } not already escaped
      .replace(/(?<!\\)\./g, '\\.')       // Escape . not already escaped
      .replace(/(?<!\\)!/g, '\\!');      // Escape ! not already escaped

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
}
