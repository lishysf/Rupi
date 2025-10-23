import { pool } from './database';

export class DailyAssetsService {
  // Calculate and store daily asset snapshot for a specific date
  static async calculateAndStoreDailyAssets(userId: number, date: string) {
    try {
      // Get all transactions up to this date
      const transactionsQuery = `
        SELECT 
          type,
          amount,
          wallet_id
        FROM transactions
        WHERE user_id = $1 AND date <= $2
        ORDER BY date ASC
      `;
      
      const transactionsResult = await pool.query(transactionsQuery, [userId, date]);
      const transactions = transactionsResult.rows;
      
      // Get user wallets
      const walletsQuery = `
        SELECT id, name, type
        FROM user_wallets
        WHERE user_id = $1 AND is_active = true
      `;
      
      const walletsResult = await pool.query(walletsQuery, [userId]);
      const wallets = walletsResult.rows;
      
      // Calculate wallet balances
      const walletBalances: { [key: number]: number } = {};
      wallets.forEach(wallet => {
        walletBalances[wallet.id] = 0;
      });
      
      // Process transactions to calculate wallet balances
      transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        
        if (transaction.type === 'income' && transaction.wallet_id) {
          walletBalances[transaction.wallet_id] += amount;
        } else if (transaction.type === 'expense' && transaction.wallet_id) {
          walletBalances[transaction.wallet_id] -= amount;
        } else if (transaction.type === 'transfer') {
          // Handle wallet transfers (this would need more complex logic based on transfer_type)
          // For now, we'll skip transfers as they don't change total wallet balance
        }
      });
      
      // Calculate total wallet balance
      const totalWalletBalance = Object.values(walletBalances).reduce((sum, balance) => sum + balance, 0);
      
      // Calculate total savings
      const savingsQuery = `
        SELECT SUM(amount) as total_savings
        FROM transactions
        WHERE user_id = $1 AND type = 'savings' AND date <= $2
      `;
      
      const savingsResult = await pool.query(savingsQuery, [userId, date]);
      const totalSavings = parseFloat(savingsResult.rows[0]?.total_savings || '0');
      
      // Calculate total assets
      const totalAssets = totalWalletBalance + totalSavings;
      
      // Store daily asset snapshot
      const upsertQuery = `
        INSERT INTO daily_assets (user_id, date, wallet_balance, savings_total, total_assets)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, date)
        DO UPDATE SET
          wallet_balance = EXCLUDED.wallet_balance,
          savings_total = EXCLUDED.savings_total,
          total_assets = EXCLUDED.total_assets,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(upsertQuery, [userId, date, totalWalletBalance, totalSavings, totalAssets]);
      
      return {
        date,
        wallet_balance: totalWalletBalance,
        savings_total: totalSavings,
        total_assets: totalAssets
      };
      
    } catch (error) {
      console.error('Error calculating daily assets:', error);
      throw error;
    }
  }
  
  // Calculate and store daily assets for a date range
  static async calculateAndStoreDailyAssetsForRange(userId: number, startDate: string, endDate: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const results = [];
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        const result = await this.calculateAndStoreDailyAssets(userId, dateString);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error calculating daily assets for range:', error);
      throw error;
    }
  }
  
  // Get daily assets for a date range
  static async getDailyAssets(userId: number, startDate: string, endDate: string) {
    try {
      const query = `
        SELECT 
          date,
          wallet_balance,
          savings_total,
          total_assets
        FROM daily_assets
        WHERE user_id = $1 AND date >= $2 AND date <= $3
        ORDER BY date ASC
      `;
      
      const result = await pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching daily assets:', error);
      throw error;
    }
  }
}
