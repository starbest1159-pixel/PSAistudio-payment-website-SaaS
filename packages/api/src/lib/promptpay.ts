function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function generatePromptPayQR(id: string, amount?: number, type?: string): string {
  const isPhone = /^[0-9]{10}$/.test(id);
  const isTaxId = /^[0-9]{13}$/.test(id);
  const formattedId = isPhone ? `0066${id.slice(1)}` : id;

  const aid = isPhone || isTaxId ? '0016A000000677010111' : '0016A000000677010113';
  const merchantAcct = tlv('00', aid) + tlv(isPhone ? '01' : '02', formattedId);

  let qr = tlv('00', '01') + tlv('01', '12') + tlv('29', merchantAcct) + tlv('52', '0000') + tlv('53', '764');

  if (amount && amount > 0) {
    qr += tlv('54', amount.toFixed(2));
  }
  qr += tlv('58', 'TH') + tlv('59', 'PSAiPay') + tlv('60', 'Bangkok');
  qr += '6304';
  qr += crc16(qr);
  return qr;
}
