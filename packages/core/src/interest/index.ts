import { db } from '@psaipay/db';
import { accounts, accountLedger } from '@psaipay/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { LedgerService } from '../ledger/index.js';

export class InterestService {
  private ledger = new LedgerService();

  /**
   * Accrue daily interest for a savings account.
   * Thai savings rate default: 0.50% per annum.
   */
  async accrueDaily(accountId: string, annualRate?: string) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (account.type !== 'savings') throw new Error('Interest accrual only for savings accounts');
    if (account.status !== 'active') throw new Error(`Account is ${account.status}`);

    const rate = annualRate || process.env.SAVINGS_RATE_ANNUAL || '0.005';
    const balance = BigInt(account.balance);
    const dailyRate = BigInt(Math.round(parseFloat(rate) * 1000000)) / 365n / 10000n;
    const accrued = (balance * dailyRate) / 100n;

    if (accrued <= 0n) return { accrued: '0', accountId };

    return {
      accrued: String(accrued),
      accountId,
      rate,
      balance: account.balance,
    };
  }

  /**
   * Calculate total interest earned for an account in a date range.
   */
  async calculateEarned(accountId: string, from: Date, to: Date) {
    const entries = await db
      .select()
      .from(accountLedger)
      .where(
        and(
          eq(accountLedger.accountId, accountId),
          eq(accountLedger.ledgerType, 'interest'),
          gte(accountLedger.createdAt, from),
          lte(accountLedger.createdAt, to),
        )
      );

    let total = 0n;
    for (const entry of entries) {
      if (entry.entryType === 'credit') {
        total += BigInt(entry.amount);
      }
    }

    return {
      accountId,
      totalEarned: String(total),
      entries: entries.length,
      from,
      to,
    };
  }

  /**
   * Post accrued interest to a savings account via the ledger.
   */
  async postInterest(accountId: string, amount: string) {
    const interestSettlementId = await this.getOrCreateInterestSettlementAccount('THB');

    const result = await this.ledger.post({
      creditAccountId: accountId,
      debitAccountId: interestSettlementId,
      amount,
      currency: 'THB',
      reference: `INT-${Date.now()}`,
      ledgerType: 'interest',
      description: 'Interest posting',
      idempotencyKey: `interest-${accountId}-${new Date().toISOString().slice(0, 10)}`,
    });

    return result;
  }

  private async getOrCreateInterestSettlementAccount(currency: string): Promise<string> {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountNumber, `INT-SETTLE-${currency}`));

    if (existing) return existing.id;

    const [created] = await db
      .insert(accounts)
      .values({
        accountNumber: `INT-SETTLE-${currency}`,
        type: 'current',
        currency,
        balance: '0',
        availableBalance: '0',
        status: 'active',
        customerId: 'SYSTEM',
      })
      .returning();

    return created.id;
  }
}
