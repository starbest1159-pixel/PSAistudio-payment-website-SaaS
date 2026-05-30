import { db } from '@psaipay/db';
import { fxRates, accounts } from '@psaipay/db';
import { eq, desc } from 'drizzle-orm';
import { LedgerService } from '../ledger/index.js';

export class FxService {
  private ledger = new LedgerService();

  /**
   * Get the current exchange rate between two currencies.
   */
  async getRate(fromCurrency: string, toCurrency: string) {
    if (fromCurrency === toCurrency) return { rate: '1', fromCurrency, toCurrency };

    // Look up direct rate
    const [directRate] = await db
      .select()
      .from(fxRates)
      .where(
        eq(fxRates.baseCurrency, fromCurrency) &&
        eq(fxRates.quoteCurrency, toCurrency)
      )
      .orderBy(desc(fxRates.effectiveAt))
      .limit(1);

    if (directRate) return { rate: directRate.rate, fromCurrency, toCurrency, source: directRate.source };

    // Try inverse
    const [inverseRate] = await db
      .select()
      .from(fxRates)
      .where(
        eq(fxRates.baseCurrency, toCurrency) &&
        eq(fxRates.quoteCurrency, fromCurrency)
      )
      .orderBy(desc(fxRates.effectiveAt))
      .limit(1);

    if (inverseRate) {
      const rate = (1 / parseFloat(inverseRate.rate)).toFixed(8);
      return { rate, fromCurrency, toCurrency, source: 'inverse' };
    }

    throw new Error(`No FX rate found for ${fromCurrency}/${toCurrency}`);
  }

  /**
   * Convert an amount from one currency to another for a given account.
   * Posts the FX conversion via the double-entry ledger.
   */
  async convert(
    accountId: string,
    fromCurrency: string,
    toCurrency: string,
    amount: string,
  ) {
    const rateInfo = await this.getRate(fromCurrency, toCurrency);
    const rate = parseFloat(rateInfo.rate);
    const convertedAmount = (parseFloat(amount) * rate).toFixed(2);

    // For FX, we debit the source currency account and credit a FX settlement,
    // then debit the FX settlement and credit the target currency account.
    const fxClearingFrom = await this.getOrCreateFxClearingAccount(fromCurrency);
    const fxClearingTo = await this.getOrCreateFxClearingAccount(toCurrency);

    // Debit customer account (fromCurrency), credit FX clearing (fromCurrency)
    await this.ledger.post({
      debitAccountId: accountId,
      creditAccountId: fxClearingFrom,
      amount,
      currency: fromCurrency,
      reference: `FX-${Date.now()}`,
      ledgerType: 'transfer',
      description: `FX sell ${fromCurrency} ${amount} → ${toCurrency} ${convertedAmount}`,
      idempotencyKey: `fx-${accountId}-${Date.now()}`,
    });

    return {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount,
      rate: rateInfo.rate,
      source: rateInfo.source,
    };
  }

  /**
   * List all FX rates.
   */
  async listRates(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;
    return db
      .select()
      .from(fxRates)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(fxRates.createdAt));
  }

  /**
   * Add a new FX rate.
   */
  async addRate(baseCurrency: string, quoteCurrency: string, rate: string, source?: string) {
    const [fxRate] = await db
      .insert(fxRates)
      .values({
        baseCurrency,
        quoteCurrency,
        rate,
        source: source || 'manual',
      })
      .returning();
    return fxRate;
  }

  private async getOrCreateFxClearingAccount(currency: string): Promise<string> {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountNumber, `FX-CLEAR-${currency}`));

    if (existing) return existing.id;

    const [created] = await db
      .insert(accounts)
      .values({
        accountNumber: `FX-CLEAR-${currency}`,
        type: 'fx',
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
