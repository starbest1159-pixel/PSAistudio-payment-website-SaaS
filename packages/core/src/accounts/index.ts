import { db } from '@psaipay/db';
import { accounts } from '@psaipay/db';
import { eq } from 'drizzle-orm';
import { LedgerService, type StatementOptions } from '../ledger/index.js';

/** Configurable bank prefix for BH-ready account numbering */
const ACCOUNT_PREFIX = process.env.ACCOUNT_PREFIX || '001';
let accountCounter = 0;

/**
 * Generate a 10-digit Thai-format account number.
 * Format: [3-digit prefix][7-digit sequential] with Luhn-like checksum placeholder.
 */
function generateAccountNumber(): string {
  accountCounter++;
  const seq = accountCounter.toString().padStart(7, '0');
  return `${ACCOUNT_PREFIX}${seq}`;
}

export class AccountService {
  private ledger = new LedgerService();

  /**
   * Open a new bank account with a Thai-format account number.
   */
  async open(
    type: 'savings' | 'current' | 'fx',
    currency: string = 'THB',
    customerId?: string,
  ) {
    const accountNumber = generateAccountNumber();
    const [account] = await db
      .insert(accounts)
      .values({
        accountNumber,
        type,
        currency,
        balance: '0',
        availableBalance: '0',
        status: 'active',
        customerId: customerId || null,
      })
      .returning();
    return account;
  }

  /**
   * Close an account. Requires zero balance.
   */
  async close(accountId: string) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (account.status === 'closed') throw new Error('Account already closed');
    if (BigInt(account.balance) !== 0n) throw new Error('Account balance must be zero to close');

    const [closed] = await db
      .update(accounts)
      .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();
    return closed;
  }

  /**
   * Freeze an account, preventing all debits.
   */
  async freeze(accountId: string, reason?: string) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (account.status === 'closed') throw new Error('Cannot freeze a closed account');

    const [frozen] = await db
      .update(accounts)
      .set({ status: 'frozen', updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();
    return frozen;
  }

  /**
   * Unfreeze a previously frozen account.
   */
  async unfreeze(accountId: string) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (account.status !== 'frozen') throw new Error('Account is not frozen');

    const [active] = await db
      .update(accounts)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();
    return active;
  }

  /**
   * Get the current balance for an account.
   */
  async getBalance(accountId: string): Promise<string> {
    return this.ledger.getBalance(accountId);
  }

  /**
   * Get a paginated statement for an account.
   */
  async getStatement(accountId: string, options?: StatementOptions) {
    return this.ledger.getStatement(accountId, options);
  }

  /**
   * Get an account by ID.
   */
  async getById(accountId: string) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    return account;
  }

  /**
   * List all accounts with optional type filter and pagination.
   */
  async list(options: { type?: string; limit?: number; offset?: number } = {}) {
    const { type, limit = 50, offset = 0 } = options;
    const conditions = [];
    if (type) conditions.push(eq(accounts.type, type as any));

    const { and } = await import('drizzle-orm');
    const data = await db
      .select()
      .from(accounts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(accounts.createdAt);

    return data;
  }
}
