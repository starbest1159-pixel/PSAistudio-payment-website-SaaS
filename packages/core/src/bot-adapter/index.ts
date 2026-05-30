import { db } from '@psaipay/db';
import { botMessages } from '@psaipay/db';
import { eq, desc } from 'drizzle-orm';

/** Thai BH BIC codes for major banks */
const THAI_BIC_CODES: Record<string, string> = {
  BBL: 'BKKBTHBX',
  KBANK: 'KASITHBX',
  KTB: 'KRTBTHBX',
  BAY: 'AYUDTHBX',
  SCB: 'SICOOTHX',
  TMB: 'TTMBTHX0',
  UOB: 'UOVBTHBX',
  GSB: 'GSBKTHB1',
};

export class BotAdapter {
  /**
   * Build and send an ISO 20022 pain.001 (Customer Credit Transfer Initiation) message.
   */
  async sendPain001(
    debtorAccount: string,
    creditorAccount: string,
    amount: string,
    currency: string = 'THB',
  ) {
    const correlationId = `pain001-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const payload = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${correlationId}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${amount}</CtrlSum>
      <InitgPty>
        <Nm>PSAiPay</Nm>
        <Id>
          <OrgId>
            <AnyBIC>PSAPTHX1</AnyBIC>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-${Date.now()}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <PmtTpInf>
        <SvcLvl>
          <Cd>URGP</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${now.slice(0, 10)}</ReqdExctnDt>
      <Dbtr>
        <Nm>PSAiPay Account</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>${debtorAccount}</Id>
          </Othr>
        </Id>
        <Ccy>${currency}</Ccy>
      </DbtrAcct>
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>E2E-${Date.now()}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${currency}">${amount}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>Creditor</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <Othr>
              <Id>${creditorAccount}</Id>
            </Othr>
          </Id>
        </CdtrAcct>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    const [message] = await db
      .insert(botMessages)
      .values({
        messageType: 'pain001',
        direction: 'outbound',
        correlationId,
        payload,
        status: 'pending',
        senderBic: 'PSAPTHX1',
        receiverBic: 'BOTHTHX0',
      })
      .returning();

    return message;
  }

  /**
   * Build and send an ISO 20022 pacs.008 (FI to FI Customer Credit Transfer) message.
   */
  async sendPacs008(
    debtorBic: string,
    creditorBic: string,
    debtorAccount: string,
    creditorAccount: string,
    amount: string,
    currency: string = 'THB',
  ) {
    const correlationId = `pacs008-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const payload = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.09">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${correlationId}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-${Date.now()}</EndToEndId>
        <TxId>TX-${Date.now()}</TxId>
      </PmtId>
      <Amt>
        <InstdAmt Ccy="${currency}">${amount}</InstdAmt>
      </Amt>
      <ChrgBr>SHAR</ChrgBr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${debtorBic}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${creditorBic}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Dbtr>
        <Nm>Debtor Name</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>${debtorAccount}</Id>
          </Othr>
        </Id>
      </DbtrAcct>
      <Cdtr>
        <Nm>Creditor Name</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>${creditorAccount}</Id>
          </Othr>
        </Id>
      </CdtrAcct>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

    const [message] = await db
      .insert(botMessages)
      .values({
        messageType: 'pacs008',
        direction: 'outbound',
        correlationId,
        payload,
        status: 'pending',
        senderBic: debtorBic,
        receiverBic: creditorBic,
      })
      .returning();

    return message;
  }

  /**
   * Receive and parse an incoming ISO 20022 message.
   */
  async receiveMessage(rawPayload: string) {
    // Determine message type from XML content
    let messageType: 'pain001' | 'pacs008' | 'pacs009' | 'other' = 'other';
    if (rawPayload.includes('pain.001') || rawPayload.includes('CstmrCdtTrfInitn')) {
      messageType = 'pain001';
    } else if (rawPayload.includes('pacs.008') || rawPayload.includes('FIToFICstmrCdtTrf')) {
      messageType = 'pacs008';
    } else if (rawPayload.includes('pacs.009') || rawPayload.includes('FIToFIPmtStsRpt')) {
      messageType = 'pacs009';
    }

    const [message] = await db
      .insert(botMessages)
      .values({
        messageType,
        direction: 'inbound',
        correlationId: `in-${crypto.randomUUID()}`,
        payload: rawPayload,
        status: 'acknowledged',
        senderBic: 'BOTHTHX0',
        receiverBic: 'PSAPTHX1',
        processedAt: new Date(),
      })
      .returning();

    return message;
  }

  /**
   * Get the status of a BOT message by correlation ID.
   */
  async getMessageStatus(correlationId: string) {
    const [message] = await db
      .select()
      .from(botMessages)
      .where(eq(botMessages.correlationId, correlationId));
    if (!message) throw new Error(`Message ${correlationId} not found`);
    return message;
  }

  /**
   * List all BOT messages with pagination.
   */
  async listMessages(options: { limit?: number; offset?: number; direction?: string } = {}) {
    const { limit = 50, offset = 0, direction } = options;
    let query = db
      .select()
      .from(botMessages)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(botMessages.createdAt));

    if (direction) {
      query = query.where(eq(botMessages.direction, direction as any)) as any;
    }

    return query;
  }
}

export { THAI_BIC_CODES };
