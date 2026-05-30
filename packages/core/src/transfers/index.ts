import { db } from '@psaipay/db';
import { accounts, accountLedger } from '@psaipay/db';
import { eq } from 'drizzle-orm';
import { LedgerService } from '../ledger/index.js';

/** Transfer state machine states */
export type TransferState = 'initiated' | 'authorized' | 'settled' | 'completed' | 'failed' | 'reversed';

/** In-memory transfer tracking (production would use DB) */
const transferStates = new Map<string, { state: TransferState; accountId: string; amount: string; currency: string; reference: string; contraKey?: string }>();

export class TransferService {
  private ledger = new LedgerService();

  /**
   * Initiate a PromptPay transfer. Uses the PromptPay EMV library to resolve
   * the destination, then posts via the double-entry ledger.
   */
  async initiatePromptPayTransfer(
    fromAccountId: string,
    promptPayId: string,
    amount: string,
    currency: string = 'THB',
  ) {
    // Validate the source account
    const [source] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, fromAccountId));
    if (!source) throw new Error(`Source account ${fromAccountId} not found`);
    if (source.status !== 'active') throw new Error(`Source account is ${source.status}`);
    if (BigInt(source.availableBalance) < BigInt(amount)) throw new Error('Insufficient balance');

    const transferId = crypto.randomUUID();
    const reference = `PP-${transferId.slice(0, 8).toUpperCase()}`;

    // Store transfer state
    transferStates.set(transferId, {
      state: 'initiated',
      accountId: fromAccountId,
      amount,
      currency,
      reference,
    });

    try {
      // For PromptPay, we use a system settlement account as the contra
      const settlementAccountId = await this.getOrCreateSettlementAccount(currency);

      await this.ledger.post({
        debitAccountId: fromAccountId,
        creditAccountId: settlementAccountId,
        amount,
        currency,
        reference,
        ledgerType: 'transfer',
        description: `PromptPay transfer to ${promptPayId}`,
        idempotencyKey: transferId,
      });

      // Update state to settled
      const state = transferStates.get(transferId)!;
      state.state = 'settled';
      state.state = 'completed';
      state.contraKey = promptPayId;

      return {
        transferId,
        status: 'completed' as TransferState,
        fromAccountId,
        promptPayId,
        amount,
        currency,
        reference,
      };
    } catch (err: any) {
      const state = transferStates.get(transferId)!;
      state.state = 'failed';
      throw err;
    }
  }

  /**
   * Initiate an interbank transfer via the ITMX framework (stub).
   */
  async initiateInterbankTransfer(
    fromAccountId: string,
    toBankCode: string,
    toAccount: string,
    amount: string,
    currency: string = 'THB',
  ) {
    const transferId = crypto.randomUUID();
    const reference = `ITMX-${transferId.slice(0, 8).toUpperCase()}`;

    transferStates.set(transferId, {
      state: 'initiated',
      accountId: fromAccountId,
      amount,
      currency,
      reference,
    });

    try {
      const settlementAccountId = await this.getOrCreateSettlementAccount(currency);

      await this.ledger.post({
        debitAccountId: fromAccountId,
        creditAccountId: settlementAccountId,
        amount,
        currency,
        reference,
        ledgerType: 'transfer',
        description: `Interbank transfer to ${toBankCode}/${toAccount}`,
        idempotencyKey: transferId,
      });

      const state = transferStates.get(transferId)!;
      state.state = 'completed';

      return {
        transferId,
        status: 'completed' as TransferState,
        fromAccountId,
        toBankCode,
        toAccount,
        amount,
        currency,
        reference,
      };
    } catch (err: any) {
      const state = transferStates.get(transferId)!;
      state.state = 'failed';
      throw err;
    }
  }

  /**
   * Get the current status of a transfer.
   */
  async getTransferStatus(transferId: string) {
    const state = transferStates.get(transferId);
    if (!state) throw new Error(`Transfer ${transferId} not found`);
    return {
      transferId,
      status: state.state,
      amount: state.amount,
      currency: state.currency,
      reference: state.reference,
    };
  }

  /**
   * Reverse a completed transfer.
   */
  async reverseTransfer(transferId: string, reason: string) {
    const state = transferStates.get(transferId);
    if (!state) throw new Error(`Transfer ${transferId} not found`);
    if (state.state !== 'completed' && state.state !== 'settled') {
      throw new Error(`Cannot reverse transfer in state ${state.state}`);
    }

    const settlementAccountId = await this.getOrCreateSettlementAccount(state.currency);

    await this.ledger.post({
      debitAccountId: settlementAccountId,
      creditAccountId: state.accountId,
      amount: state.amount,
      currency: state.currency,
      reference: `REV-${state.reference}`,
      ledgerType: 'transfer',
      description: `Reversal: ${reason}`,
      idempotencyKey: `rev-${transferId}`,
    });

    state.state = 'reversed';

    return {
      transferId,
      status: 'reversed' as TransferState,
      reason,
    };
  }

  /**
   * Get or create a system settlement account for a given currency.
   */
  private async getOrCreateSettlementAccount(currency: string): Promise<string> {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountNumber, `SETTLE-${currency}`));

    if (existing) return existing.id;

    const [created] = await db
      .insert(accounts)
      .values({
        accountNumber: `SETTLE-${currency}`,
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
