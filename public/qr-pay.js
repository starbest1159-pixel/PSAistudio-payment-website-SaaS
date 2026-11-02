// Standalone QR Pay demo JS
(function () {
  function $(sel) { return document.querySelector(sel); }

  let countdownTimer = null;

  function initQRPage() {
    $('#btn-generate').addEventListener('click', onGenerate);
    $('#btn-open-share').addEventListener('click', () => {
      const ref = $('#input-reference').value || 'REF';
      const amt = parseFloat($('#input-amount').value) || 0;
      openSharePage({ reference: ref, amount: amt, description: 'ตัวอย่างการชำระ' });
    });

    $('#sp-back').addEventListener('click', closeSharePage);
    $('#sp-dl').addEventListener('click', downloadQR);
    $('#sp-sim-btn').addEventListener('click', () => simulatePayment(true));
  }

  function onGenerate() {
    const ref = $('#input-reference').value || 'REF';
    const amt = parseFloat($('#input-amount').value) || 0;
    const payload = `PROMPTPAY|${ref}|${amt.toFixed(2)}`; // placeholder payload
    generateQRCode(payload, document.getElementById('preview-qrc'));
    notify('success', 'สร้าง QR สำเร็จ');
  }

  function openSharePage(data) {
    // populate
    $('#sp-title').textContent = data.reference || '-';
    $('#sp-amt').textContent = data.amount ? `${Number(data.amount).toFixed(2)} THB` : '-';
    $('#sp-desc').textContent = data.description || '-';
    $('#sp-rname').textContent = 'ร้านตัวอย่าง (Sandbox)';
    $('#sp-rid').textContent = data.reference || '-';
    $('#sp-rtype').textContent = 'PromptPay';

    // generate QR inside overlay
    const payload = `PROMPTPAY|${data.reference}|${Number(data.amount||0).toFixed(2)}`;
    generateQRCode(payload, document.getElementById('sp-qrc'));

    // start 15 minute countdown
    const expireAt = Date.now() + 15 * 60 * 1000;
    startCountdown(expireAt, () => {
      $('#sp-exp').classList.add('on');
      notify('error', 'QR Code หมดอายุ');
    });

    // show overlay
    const sp = document.getElementById('share-page');
    sp.setAttribute('aria-hidden', 'false');
    sp.style.display = 'flex';
  }

  function closeSharePage() {
    const sp = document.getElementById('share-page');
    sp.setAttribute('aria-hidden', 'true');
    sp.style.display = 'none';
    // clear QR and timers
    const wrapper = document.getElementById('sp-qrc');
    wrapper.innerHTML = '';
    stopCountdown();
  }

  function generateQRCode(text, targetElement) {
    if (!targetElement) return;
    targetElement.innerHTML = '';
    // qrcode.js usage
    try {
      new QRCode(targetElement, {
        text: text,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
n      });
    } catch (err) {
      // fallback: create canvas with text
      const el = document.createElement('div');
      el.textContent = text;
      el.style.color = '#000';
      targetElement.appendChild(el);
    }
  }

  function downloadQR() {
    const wrap = document.getElementById('sp-qrc') || document.getElementById('preview-qrc');
    if (!wrap) return notify('error', 'ไม่พบ QR');
    const canvas = wrap.querySelector('canvas');
    if (!canvas) return notify('error', 'ไม่พบภาพ QR');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptpay-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    notify('success', 'QR ดาวน์โหลดเรียบร้อย');
  }

  function simulatePayment(instant = false) {
    // mark UI as paid
    const spq = document.getElementById('sp-qrc-wrap') || document.getElementById('sp-qrc');
    if (spq) spq.classList.add('paid');
    const paid = document.getElementById('sp-paid');
    if (paid) {
      paid.classList.add('on');
      document.getElementById('sp-paidat').textContent = new Date().toLocaleString();
    }
    notify('success', 'สถานะ: ชำระแล้ว');
    stopCountdown();
  }

  function startCountdown(expireAt, onExpire) {
    stopCountdown();
    function tick() {
      const left = Math.max(0, Math.floor((expireAt - Date.now()) / 1000));
      const el = document.getElementById('sp-cdtime');
      const bar = document.getElementById('sp-pbar');
      if (el) el.textContent = formatTime(left);
      if (bar) {
        const total = 15 * 60;
        const pct = Math.max(0, (left / total) * 100);
        bar.style.width = pct + '%';
      }
      if (left <= 0) {
        if (onExpire) onExpire();
        stopCountdown();
      }
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function stopCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  }

  function formatTime(sec) {
    if (sec <= 0) return 'Expired';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  async function pollPaymentStatus(paymentId, onUpdate) {
    // placeholder: implement API polling if backend available
    try {
      const res = await fetch(`/api/v1/payments/${paymentId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (onUpdate) onUpdate(data);
      return data;
    } catch (err) { /* ignore */ }
  }

  function notify(type, message) {
    // simple native notification
    console.log(type, message);
    // could implement a toast UI here
  }

  // Expose for debugging
  window.initQRPage = initQRPage;
  window.openSharePage = openSharePage;
  window.closeSharePage = closeSharePage;
  window.downloadQR = downloadQR;
  window.simulatePayment = simulatePayment;

  document.addEventListener('DOMContentLoaded', initQRPage);
})();
