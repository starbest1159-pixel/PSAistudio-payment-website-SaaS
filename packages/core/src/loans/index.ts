import { db } from '@psaipay/db';
import { loans, loanRepayments, accounts } from '@psaipay/db';
import { eq, desc } from 'drizzle-orm';
import { LedgerService } from '../ledger/index.js';

export class LoanService {
  private ledger = new LedgerService();

  /**
   * Originate a new loan: creates a loan record and disburses principal
   * via the double-entry ledger.
   */
  async originate(
    accountId: string,
    principal: string,
    interestRate: string,
    term: number,
  ) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (account.status !== 'active') throw new Error(`Account is ${account.status}`);

    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + term);

    const [loan] = await db
      .insert(loans)
      .values({
        accountId,
        customerId: account.customerId,
        principal,
        outstandingBalance: principal,
        interestRate,
        term,
        status: 'originated',
        maturityDate,
      })
      .returning();

    // Disburse loan: credit the customer account from a loan settlement account
    const settlementAccountId = await this.getOrCreateLoanSettlementAccount(account.currency);
    await this.ledger.post({
      debitAccountId: settlementAccountId,
      creditAccountId: accountId,
      amount: principal,
      currency: account.currency,
      reference: `LOAN-${loan.id.slice(0, 8)}`,
      ledgerType: 'loan_disbursement',
      description: `Loan disbursement - ${term} months`,
      idempotencyKey: `loan-disburse-${loan.id}`,
    });

    // Mark loan as active after successful disbursement
    const [activeLoan] = await db
      .update(loans)
      .set({ status: 'active', disbursedAt: new Date(), updatedAt: new Date() })
      .where(eq(loans.id, loan.id))
      .returning();

    return activeLoan;
  }

  /**
   * Repay a loan. Splits the payment into principal and interest portions.
   */
  async repay(loanId: string, amount: string) {
    const [loan] = await db
      .select()
      .from(loans)
      .where(eq(loans.id, loanId));
    if (!loan) throw new Error(`Loan ${loanId} not found`);
    if (loan.status !== 'active') throw new Error(`Loan is ${loan.status}`);

    const outstanding = BigInt(loan.outstandingBalance);
    const paymentAmount = BigInt(amount);
    if (paymentAmount <= 0n) throw new Error('Payment amount must be positive');

    // Simple interest calculation for this period
    const monthlyRate = BigInt(Math.round(parseFloat(loan.interestRate) * 100)) / 1200n;
    const interestPortion = (outstanding * monthlyRate) / 10000n;
    const totalDue = interestPortion + paymentAmount > outstanding
      ? outstanding
      : paymentAmount;

    let principalPortion = totalDue - interestPortion;
    if (principalPortion < 0n) principalPortion = 0n;

    // Debit customer account, credit loan settlement
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, loan.accountId));
    const settlementAccountId = await this.getOrCreateLoanSettlementAccount(account!.currency);

    await this.ledger.post({
      debitAccountId: loan.accountId,
      creditAccountId: settlementAccountId,
      amount: String(totalDue),
      currency: account!.currency,
      reference: `REPAY-${loanId.slice(0, 8)}`,
      ledgerType: 'loan_disbursement',
      description: `Loan repayment`,
      idempotencyKey: `repay-${loanId}-${Date.now()}`,
    });

    const newOutstanding = outstanding - principalPortion;

    // Create repayment record
    const [repayment] = await db
      .insert(loanRepayments)
      .values({
        loanId,
        amount: String(totalDue),
        principalPortion: String(principalPortion),
        interestPortion: String(interestPortion),
        status: 'completed',
      })
      .returning();

    // Update loan outstanding balance and status
    const newStatus = newOutstanding <= 0n ? 'completed' : 'active';
    await db
      .update(loans)
      .set({
        outstandingBalance: String(newOutstanding),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, loanId));

    return repayment;
  }

  /**
   * Get the repayment schedule for a loan (simple amortization).
   */
  async getSchedule(loanId: string) {
    const [loan] = await db
      .select()
      .from(loans)
      .where(eq(loans.id, loanId));
    if (!loan) throw new Error(`Loan ${loanId} not found`);

    const principal = parseFloat(loan.principal);
    const monthlyRate = parseFloat(loan.interestRate) / 100 / 12;
    const term = loan.term;

    const schedule = [];
    let remaining = principal;

    for (let i = 1; i <= term; i++) {
      const interestPayment = remaining * monthlyRate;
      const totalPayment = monthlyRate > 0
        ? (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
        : principal / term;
      const principalPayment = totalPayment - interestPayment;
      remaining -= principalPayment;

      schedule.push({
        month: i,
        payment: totalPayment.toFixed(2),
        principal: principalPayment.toFixed(2),
        interest: interestPayment.toFixed(2),
        remaining: Math.max(remaining, 0).toFixed(2),
      });
    }

    return schedule;
  }

  /**
   * Get the outstanding balance for a loan.
   */
  async getOutstanding(loanId: string) {
    const [loan] = await db
      .select({
        outstandingBalance: loans.outstandingBalance,
        status: loans.status,
      })
      .from(loans)
      .where(eq(loans.id, loanId));
    if (!loan) throw new Error(`Loan ${loanId} not found`);
    return loan;
  }

  /**
   * List all loans, optionally filtered by status.
   */
  async list(options: { status?: string; limit?: number; offset?: number } = {}) {
    const { status, limit = 50, offset = 0 } = options;
    let query = db.select().from(loans).limit(limit).offset(offset).orderBy(desc(loans.createdAt));
    if (status) {
      query = query.where(eq(loans.status, status as any)) as any;
    }
    return query;
  }

  /**
   * Get a loan by ID.
   */
  async getById(loanId: string) {
    const [loan] = await db
      .select()
      .from(loans)
      .where(eq(loans.id, loanId));
    return loan;
  }

  private async getOrCreateLoanSettlementAccount(currency: string): Promise<string> {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountNumber, `LOAN-SETTLE-${currency}`));

    if (existing) return existing.id;

    const [created] = await db
      .insert(accounts)
      .values({
        accountNumber: `LOAN-SETTLE-${currency}`,
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
