import { db } from '@psaipay/db';
import { cards, cardAuths, accounts } from '@psaipay/db';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

export class CardService {
  /**
   * Issue a new debit or credit card linked to an account.
   */
  async issue(
    accountId: string,
    cardType: 'debit' | 'credit',
    brand: 'visa' | 'mastercard',
  ) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId));
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (account.status !== 'active') throw new Error(`Account is ${account.status}`);

    const now = new Date();
    const expiryMonth = now.getMonth() + 1;
    const expiryYear = now.getFullYear() + 5;

    // Generate encrypted card number
    const pan = this.generatePAN(brand);
    const encryptedPan = this.encryptPAN(pan);

    const [card] = await db
      .insert(cards)
      .values({
        accountId,
        cardNumber: encryptedPan,
        cardType,
        cardBrand: brand,
        expiryMonth,
        expiryYear,
        status: 'active',
        dailyLimit: '200000',
      })
      .returning();

    return {
      ...card,
      cardNumberMasked: this.maskPAN(pan),
    };
  }

  /**
   * Block a card, preventing further authorizations.
   */
  async block(cardId: string) {
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId));
    if (!card) throw new Error(`Card ${cardId} not found`);
    if (card.status === 'cancelled') throw new Error('Card is already cancelled');

    const [blocked] = await db
      .update(cards)
      .set({ status: 'blocked', updatedAt: new Date() })
      .where(eq(cards.id, cardId))
      .returning();
    return blocked;
  }

  /**
   * Unblock a previously blocked card.
   */
  async unblock(cardId: string) {
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId));
    if (!card) throw new Error(`Card ${cardId} not found`);
    if (card.status !== 'blocked') throw new Error('Card is not blocked');

    const [active] = await db
      .update(cards)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(cards.id, cardId))
      .returning();
    return active;
  }

  /**
   * Authorize a card transaction. Creates a pending authorization.
   */
  async authorize(
    cardId: string,
    amount: string,
    merchantName: string,
    merchantCategory?: string,
  ) {
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId));
    if (!card) throw new Error(`Card ${cardId} not found`);
    if (card.status !== 'active') throw new Error(`Card is ${card.status}`);

    // Check daily limit (simplified)
    const authCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const [auth] = await db
      .insert(cardAuths)
      .values({
        cardId,
        authCode,
        amount,
        currency: 'THB',
        merchantName,
        merchantCategory,
        status: 'pending',
      })
      .returning();

    return auth;
  }

  /**
   * Capture a previously authorized card transaction.
   */
  async capture(authId: string) {
    const [auth] = await db
      .select()
      .from(cardAuths)
      .where(eq(cardAuths.id, authId));
    if (!auth) throw new Error(`Authorization ${authId} not found`);
    if (auth.status !== 'pending') throw new Error(`Authorization is ${auth.status}`);

    const [captured] = await db
      .update(cardAuths)
      .set({ status: 'captured', capturedAt: new Date() })
      .where(eq(cardAuths.id, authId))
      .returning();

    return captured;
  }

  /**
   * Reverse a card authorization.
   */
  async reverse(authId: string) {
    const [auth] = await db
      .select()
      .from(cardAuths)
      .where(eq(cardAuths.id, authId));
    if (!auth) throw new Error(`Authorization ${authId} not found`);
    if (auth.status === 'captured') throw new Error('Cannot reverse a captured authorization');

    const [reversed] = await db
      .update(cardAuths)
      .set({ status: 'reversed' })
      .where(eq(cardAuths.id, authId))
      .returning();

    return reversed;
  }

  /**
   * List cards for an account.
   */
  async listByAccount(accountId: string) {
    return db
      .select()
      .from(cards)
      .where(eq(cards.accountId, accountId))
      .orderBy(desc(cards.createdAt));
  }

  /**
   * List all cards with pagination.
   */
  async list(options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;
    return db
      .select()
      .from(cards)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(cards.createdAt));
  }

  /**
   * Get a card by ID.
   */
  async getById(cardId: string) {
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId));
    return card;
  }

  /** Generate a test PAN */
  private generatePAN(brand: 'visa' | 'mastercard'): string {
    const prefix = brand === 'visa' ? '4' : '5';
    const digits = prefix + Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
    return digits;
  }

  /** Encrypt PAN for storage */
  private encryptPAN(pan: string): string {
    const key = process.env.PAN_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(pan, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /** Mask PAN for display */
  private maskPAN(pan: string): string {
    return pan.slice(0, 6) + '******' + pan.slice(-4);
  }
}
