# คู่มือการใช้งาน (USER GUIDE)

เอกสารนี้เป็นคู่มือการใช้งานระดับการนำระบบไปตรวจสอบและทดสอบการทำงาน (non-sensitive operational guide)

## บทบาทหลัก
- ผู้ใช้ (End-user): ทำการชำระเงินผ่าน UI ของลูกค้า
- ระบบเรียก (Integrator): ฝั่งระบบที่เรียกสร้างคำขอชำระ เช่น เว็บไซต์หรือระบบ Donate
- ผู้ดูแลระบบ (Admin): ดูรายการธุรกรรม, แก้ไขข้อผิดพลาด, ทำการคืนเงิน

## การทดสอบ flow หลัก
1. สร้าง payment request (test mode)
   - ส่งคำขอสร้าง payment request พร้อมข้อมูลจำเป็น (amount, currency, reference)
   - ตรวจสอบ response ได้รับ token/URL
2. ทำการชำระผ่านหน้า UI ของลูกค้า
   - ดำเนินการจนเสร็จ และตรวจสอบว่าระบบภายนอกส่ง callback มาที่ webhook receiver
3. ยืนยันสถานะธุรกรรม
   - ตรวจสอบสถานะใน admin dashboard หรือผ่าน API query
4. ทดสอบกรณีล้มเหลว
   - จำลองสถานะ failed และตรวจสอบว่าระบบจัดการการ retry/notification ตามคาด

## การทดสอบ webhook
- ส่ง webhook mock จากเครื่องมือทดสอบ (หรือ staging) ให้ endpoint ของเรา
- ตรวจสอบ signature/headers และการอัพเดตสถานะ
- ตรวจสอบว่าการเรียกจาก webhook เป็น idempotent (เรียกซ้ำไม่เปลี่ยนสถานะผิด)

## ข้อปฏิบัติการเมื่อเกิดปัญหา
- หากพบ callback ไม่เข้ามา: ตรวจสอบ logs ของ webhook receiver และระบบผู้ให้บริการภายนอก
- หากสถานะไม่ตรง: ตรวจสอบ correlation id และ audit log เพื่อหาเหตุการณ์ที่เกี่ยวข้อง
- หากต้อง revert: ใช้ process ของ refund/compensation ที่กำหนดไว้ใน admin panel

## การตรวจสอบหลังติดตั้ง
- ปรับค่า monitoring: success rate, error rate, processing latency
- ตรวจสอบว่ามี alert สำหรับ webhook failures และ high error rates
- เปิดใช้งาน audit logs และสำรองข้อมูลเป็นระยะ

---

หมายเหตุ: คู่มือนี้เป็นแนวทางการทดสอบการทำงาน ไม่รวมขั้นตอนการตั้งค่า infrastructure/credentials ที่เป็นความลับ