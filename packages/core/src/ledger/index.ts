import { db } from '@psaipay/db';
import { accountLedger, accounts } from '@psaipay/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { ledgerTypeEnum } from '@psaipay/db';

export interface PostEntryInput {
  debitAccountId: string;
  creditAccountId: string;
  amount: string;
  currency: string;
  reference?: string;
  ledgerType: typeof ledgerTypeEnum.enumValues[number];
  description?: string;
  idempotencyKey?: string;
}

export interface StatementOptions {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export class LedgerService {
  /**
   * Post a double-entry: debit one account, credit another.
   * Runs inside a PostgreSQL transaction to ensure atomicity.
   * Enforces idempotency on duplicate idempotencyKey.
   */
  async post(input: PostEntryInput) {
    return await db.transaction(async (tx) => {
      // Idempotency check
      if (input.idempotencyKey) {
        const existing = await tx
          .select({ id: accountLedger.id })
          .from(accountLedger)
          .where(eq(accountLedger.idempotencyKey, input.idempotencyKey))
          .limit(1);
        if (existing.length > 0) {
          throw new Error(`Duplicate entry for idempotency key: ${input.idempotencyKey}`);
        }
      }

      // Fetch debit account and lock row
      const [debitAccount] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, input.debitAccountId))
        .for('update');
      if (!debitAccount) throw new Error(`Debit account ${input.debitAccountId} not found`);
      if (debitAccount.status !== 'active') throw new Error(`Debit account is ${debitAccount.status}`);
      if (debitAccount.currency !== input.currency) throw new Error('Currency mismatch on debit account');

      const debitBalance = BigInt(debitAccount.availableBalance) - BigInt(input.amount);
      if (debitBalance < 0n) throw new Error('Insufficient available balance on debit account');

      // Fetch credit account and lock row
      const [creditAccount] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, input.creditAccountId))
        .for('update');
      if (!creditAccount) throw new Error(`Credit account ${input.creditAccountId} not found`);
      if (creditAccount.status !== 'active') throw new Error(`Credit account is ${creditAccount.status}`);
      if (creditAccount.currency !== input.currency) throw new Error('Currency mismatch on credit account');

      const creditBalance = BigInt(creditAccount.availableBalance) + BigInt(input.amount);

      // Update debit account balances
      await tx
        .update(accounts)
        .set({
          balance: String(BigInt(debitAccount.balance) - BigInt(input.amount)),
          availableBalance: String(debitBalance),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, input.debitAccountId));

      // Update credit account balances
      await tx
        .update(accounts)
        .set({
          balance: String(BigInt(creditAccount.balance) + BigInt(input.amount)),
          availableBalance: String(creditBalance),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, input.creditAccountId));

      // Insert debit ledger entry
      const [debitEntry] = await tx
        .insert(accountLedger)
        .values({
          accountId: input.debitAccountId,
          entryType: 'debit',
          amount: input.amount,
          currency: input.currency,
          reference: input.reference,
          contraAccountId: input.creditAccountId,
          ledgerType: input.ledgerType,
          description: input.description,
          balanceAfterEntry: String(debitBalance),
          idempotencyKey: input.idempotencyKey,
        })
        .returning();

      // Insert credit ledger entry
      const [creditEntry] = await tx
        .insert(accountLedger)
        .values({
          accountId: input.creditAccountId,
          entryType: 'credit',
          amount: input.amount,
          currency: input.currency,
          reference: input.reference,
          contraAccountId: input.debitAccountId,
          ledgerType: input.ledgerType,
          description: input.description,
          balanceAfterEntry: String(creditBalance),
          idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}-credit` : undefined,
        })
        .returning();

      return { debitEntry, creditEntry };
    });
  }

  /**
   * Calculate the current balance for an account from ledger entries.
   */
  async getBalance(accountId: string): Promise<string> {
    const [account] = await db
      .select({ balance: accounts.availableBalance })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) throw new Error(`Account ${accountId} not found`);
    return account.balance;
  }

  /**
   * Get a paginated statement of ledger entries for an account.
   */
  async getStatement(accountId: string, options: StatementOptions = {}) {
    const { from, to, limit = 50, offset = 0 } = options;

    const conditions = [eq(accountLedger.accountId, accountId)];
    if (from) conditions.push(gte(accountLedger.createdAt, from));
    if (to) conditions.push(lte(accountLedger.createdAt, to));

    const entries = await db
      .select()
      .from(accountLedger)
      .where(and(...conditions))
      .orderBy(desc(accountLedger.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(accountLedger)
      .where(and(...conditions));

    return { data: entries, total: count, limit, offset };
  }
}
