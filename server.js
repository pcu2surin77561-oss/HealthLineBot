// --- ไฟล์ server.js ---
// ระบบ Webhook สำหรับ LINE OA เพื่อรับรูปภาพและให้ Gemini AI วิเคราะห์ผลสุขภาพและอาหาร (สุขภาวะสงฆ์ AI)

const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// =====================================
// 1. ตั้งค่า Keys และ Tokens
// =====================================
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const lineClient = new Client(config);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const app = express();

// =====================================
// 2. Thai Food Nutrition Database (120 เมนู)
// =====================================
const thaiFoodDB = {
  "ผัดกะเพรา": {kcal:580,sugar:7,fat:24,sodium:1400},
  "ข้าวมันไก่": {kcal:700,sugar:4,fat:28,sodium:1200},
  "ผัดไทย": {kcal:650,sugar:18,fat:22,sodium:1100},
  "ส้มตำ": {kcal:120,sugar:10,fat:2,sodium:900},
  "ต้มยำ": {kcal:90,sugar:3,fat:4,sodium:700},
  "แกงเขียวหวาน": {kcal:450,sugar:6,fat:32,sodium:950},
  "แกงแดง": {kcal:420,sugar:6,fat:28,sodium:900},
  "ไข่เจียว": {kcal:300,sugar:1,fat:25,sodium:500},
  "หมูทอด": {kcal:400,sugar:2,fat:30,sodium:800},
  "ข้าวขาหมู": {kcal:750,sugar:5,fat:40,sodium:1300},
  "ข้าวหมูแดง": {kcal:720,sugar:15,fat:30,sodium:1100},
  "ข้าวหน้าเป็ด": {kcal:720,sugar:12,fat:34,sodium:1100},
  "ผัดซีอิ๊ว": {kcal:680,sugar:10,fat:24,sodium:1200},
  "ราดหน้า": {kcal:620,sugar:8,fat:20,sodium:1100},
  "ข้าวผัด": {kcal:600,sugar:5,fat:22,sodium:1000},
  "ผัดพริกแกง": {kcal:520,sugar:5,fat:28,sodium:900},
  "ผัดผักรวม": {kcal:220,sugar:4,fat:10,sodium:500},
  "ผัดคะน้าหมูกรอบ": {kcal:540,sugar:4,fat:32,sodium:900},
  "ผัดถั่วงอก": {kcal:200,sugar:3,fat:8,sodium:450},
  "ผัดวุ้นเส้น": {kcal:420,sugar:6,fat:14,sodium:850},
  "ลาบหมู": {kcal:250,sugar:2,fat:12,sodium:800},
  "น้ำตกหมู": {kcal:300,sugar:2,fat:16,sodium:850},
  "ยำวุ้นเส้น": {kcal:350,sugar:6,fat:12,sodium:900},
  "ยำมาม่า": {kcal:420,sugar:7,fat:16,sodium:1100},
  "ยำหมูยอ": {kcal:280,sugar:3,fat:12,sodium:800},
  "ยำทะเล": {kcal:300,sugar:4,fat:10,sodium:900},
  "ยำไข่ดาว": {kcal:420,sugar:4,fat:28,sodium:900},
  "ยำปลาดุกฟู": {kcal:480,sugar:6,fat:26,sodium:950},
  "ยำถั่วพลู": {kcal:420,sugar:5,fat:24,sodium:850},
  "พล่ากุ้ง": {kcal:300,sugar:4,fat:12,sodium:850},
  "แกงจืดเต้าหู้": {kcal:120,sugar:2,fat:4,sodium:600},
  "แกงจืดสาหร่าย": {kcal:100,sugar:1,fat:3,sodium:550},
  "แกงเลียง": {kcal:150,sugar:3,fat:4,sodium:600},
  "แกงส้ม": {kcal:200,sugar:6,fat:5,sodium:850},
  "แกงป่า": {kcal:220,sugar:3,fat:8,sodium:800},
  "แกงมัสมั่น": {kcal:600,sugar:10,fat:38,sodium:900},
  "แกงพะแนง": {kcal:520,sugar:8,fat:34,sodium:950},
  "แกงไตปลา": {kcal:300,sugar:4,fat:12,sodium:1200},
  "แกงเห็ด": {kcal:150,sugar:3,fat:5,sodium:600},
  "แกงหน่อไม้": {kcal:180,sugar:3,fat:6,sodium:700},
  "ต้มจืดหมูสับ": {kcal:150,sugar:2,fat:7,sodium:700},
  "ต้มโคล้ง": {kcal:180,sugar:2,fat:8,sodium:850},
  "ต้มข่าไก่": {kcal:350,sugar:4,fat:22,sodium:900},
  "ต้มเลือดหมู": {kcal:220,sugar:2,fat:10,sodium:900},
  "ต้มจับฉ่าย": {kcal:200,sugar:4,fat:8,sodium:900},
  "ต้มแซ่บ": {kcal:250,sugar:3,fat:10,sodium:950},
  "ต้มยำกุ้ง": {kcal:200,sugar:4,fat:6,sodium:900},
  "ต้มยำปลา": {kcal:180,sugar:3,fat:5,sodium:850},
  "ต้มยำทะเล": {kcal:220,sugar:4,fat:7,sodium:950},
  "ต้มจืดไข่น้ำ": {kcal:180,sugar:2,fat:10,sodium:700},
  "ไก่ทอด": {kcal:480,sugar:2,fat:32,sodium:900},
  "หมูแดดเดียว": {kcal:420,sugar:3,fat:28,sodium:900},
  "เนื้อแดดเดียว": {kcal:430,sugar:2,fat:26,sodium:850},
  "ไก่ย่าง": {kcal:400,sugar:2,fat:24,sodium:850},
  "หมูย่าง": {kcal:420,sugar:3,fat:26,sodium:850},
  "ปลาย่าง": {kcal:300,sugar:1,fat:12,sodium:600},
  "ปลาทอด": {kcal:420,sugar:1,fat:28,sodium:700},
  "ปลานึ่งมะนาว": {kcal:260,sugar:3,fat:10,sodium:850},
  "ปลาราดพริก": {kcal:380,sugar:12,fat:20,sodium:900},
  "ปลาสามรส": {kcal:450,sugar:18,fat:24,sodium:950},
  "ข้าวหมูทอด": {kcal:650,sugar:3,fat:32,sodium:950},
  "ข้าวไก่ทอด": {kcal:680,sugar:3,fat:34,sodium:1000},
  "ข้าวไข่เจียว": {kcal:550,sugar:2,fat:26,sodium:800},
  "ข้าวผัดกุ้ง": {kcal:620,sugar:5,fat:20,sodium:1000},
  "ข้าวผัดปู": {kcal:620,sugar:4,fat:20,sodium:1000},
  "ข้าวผัดหมู": {kcal:650,sugar:5,fat:22,sodium:1000},
  "ข้าวคลุกกะปิ": {kcal:650,sugar:12,fat:20,sodium:1200},
  "ข้าวยำ": {kcal:350,sugar:8,fat:10,sodium:700},
  "ข้าวต้มหมู": {kcal:250,sugar:2,fat:6,sodium:700},
  "โจ๊กหมู": {kcal:300,sugar:2,fat:8,sodium:700},
  "ก๋วยเตี๋ยวหมู": {kcal:350,sugar:4,fat:10,sodium:900},
  "ก๋วยเตี๋ยวเนื้อ": {kcal:400,sugar:4,fat:14,sodium:950},
  "ก๋วยเตี๋ยวไก่": {kcal:380,sugar:4,fat:12,sodium:900},
  "ก๋วยเตี๋ยวเรือ": {kcal:450,sugar:5,fat:16,sodium:1100},
  "ก๋วยเตี๋ยวต้มยำ": {kcal:420,sugar:6,fat:14,sodium:1100},
  "ก๋วยเตี๋ยวเย็นตาโฟ": {kcal:420,sugar:7,fat:14,sodium:1100},
  "บะหมี่หมูแดง": {kcal:450,sugar:10,fat:16,sodium:1000},
  "บะหมี่เกี๊ยว": {kcal:420,sugar:8,fat:14,sodium:950},
  "เส้นใหญ่ผัดซีอิ๊ว": {kcal:700,sugar:10,fat:26,sodium:1200},
  "เส้นหมี่ผัด": {kcal:480,sugar:7,fat:16,sodium:950},
  "ขนมจีนน้ำยา": {kcal:500,sugar:5,fat:18,sodium:1000},
  "ขนมจีนน้ำเงี้ยว": {kcal:450,sugar:6,fat:16,sodium:950},
  "ขนมจีนน้ำพริก": {kcal:420,sugar:12,fat:14,sodium:900},
  "ขนมจีนน้ำยาใต้": {kcal:520,sugar:5,fat:20,sodium:1100},
  "ขนมจีนน้ำยาป่า": {kcal:480,sugar:4,fat:16,sodium:1000},
  "ขนมจีนน้ำยากะทิ": {kcal:550,sugar:6,fat:24,sodium:1000},
  "ข้าวซอยไก่": {kcal:650,sugar:7,fat:34,sodium:1100},
  "ข้าวซอยเนื้อ": {kcal:700,sugar:7,fat:36,sodium:1100},
  "ข้าวซอยหมู": {kcal:680,sugar:7,fat:35,sodium:1100},
  "ข้าวซอยทะเล": {kcal:620,sugar:6,fat:30,sodium:1000},
  "ผัดหอยลาย": {kcal:300,sugar:4,fat:12,sodium:900},
  "หอยทอด": {kcal:600,sugar:3,fat:38,sodium:950},
  "ออส่วน": {kcal:520,sugar:2,fat:32,sodium:900},
  "ปูผัดผงกะหรี่": {kcal:520,sugar:6,fat:28,sodium:900},
  "กุ้งผัดพริกเกลือ": {kcal:420,sugar:3,fat:22,sodium:800},
  "กุ้งอบวุ้นเส้น": {kcal:450,sugar:5,fat:18,sodium:900},
  "หมึกผัดไข่เค็ม": {kcal:420,sugar:3,fat:20,sodium:950},
  "ปลาหมึกผัดพริกเผา": {kcal:400,sugar:7,fat:16,sodium:900},
  "ปลากะพงทอดน้ำปลา": {kcal:480,sugar:2,fat:28,sodium:1000},
  "ปลากะพงนึ่งซีอิ๊ว": {kcal:320,sugar:3,fat:12,sodium:900}
};

// =====================================
// 3. ฟังก์ชันตรวจจับชื่ออาหาร (รองรับหลายเมนู)
// =====================================
function detectThaiFoods(text) {
  let foundFoods = [];
  for (const food in thaiFoodDB) {
    if (text.includes(food)) {
      foundFoods.push(food);
    }
  }
  return foundFoods;
}

// =====================================
// 4. สร้าง Endpoint /webhook
// =====================================
app.post('/webhook', middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// =====================================
// 5. ฟังก์ชันจัดการ Event
// =====================================
async function handleEvent(event) {
  if (event.type !== 'message') return Promise.resolve(null);

  // 5.1 จัดการข้อความ (Text)
  if (event.message.type === 'text') {
    if (event.message.text === 'อ่านผลสุขภาพ / ผลแลป') {
        return lineClient.replyMessage(event.replyToken, {
            type: 'text',
            text: '📄 โปรดถ่ายรูปใบรายงานผลตรวจเลือด หรือผลตรวจสุขภาพส่งมาที่นี่ได้เลยครับ สุขภาวะสงฆ์ AI จะช่วยแปลให้ครับ 🩺'
        });
    }
    if (event.message.text === 'สแกนอาหารด้วย AI') {
        return lineClient.replyMessage(event.replyToken, {
            type: 'text',
            text: '📸 กรุณาส่งรูปภาพอาหารในบาตร หรือสำรับอาหารที่ชัดเจนมาได้เลยครับ AI จะช่วยประเมินโภชนาการให้ครับ 🍲'
        });
    }
    return Promise.resolve(null);
  }

  // 5.2 จัดการรูปภาพ (Image)
  if (event.message.type === 'image') {
    try {
      // โหลดรูปภาพจากเซิร์ฟเวอร์ LINE
      const stream = await lineClient.getMessageContent(event.message.id);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const base64Image = buffer.toString('base64');

      // เรียกใช้งาน Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
      
      // Prompt อัปเกรดแบบผู้เชี่ยวชาญ
      const prompt = `
        คุณคือ "สุขภาวะสงฆ์ AI" ผู้เชี่ยวชาญโภชนาการและสุขภาพสำหรับพระสงฆ์
        
        กรุณาดูภาพนี้ หากเป็นภาพผลตรวจสุขภาพ:
        1. สรุปค่าที่สำคัญ แปลคำศัพท์แพทย์เป็นภาษาไทย
        2. บอกว่าค่าไหนปกติ หรือค่าไหนผิดปกติ (สูง/ต่ำ)
        3. ให้คำแนะนำเบื้องต้นในการดูแลสุขภาพ

        หากเป็นภาพอาหาร (วิเคราะห์ภาพอาหารตามขั้นตอน):
        1. ระบุชื่ออาหารไทยที่เป็นไปได้ให้ครบถ้วน (หากมีหลายเมนูให้บอกทั้งหมด)
        2. แยกส่วนประกอบ เช่น ข้าว เนื้อ ผัก น้ำแกง
        3. ประเมินปริมาณอาหาร (เช่น 1 จาน / ครึ่งจาน)
        4. ประเมินโภชนาการเบื้องต้น

        ตอบให้กระชับ เป็นมิตร สำรวมแบบชาวพุทธ และอ่านง่ายบนมือถือ
        หากเป็นอาหารให้ตอบในรูปแบบ:
        เมนูที่พบ:
        โภชนาการโดยประมาณ:
        คำแนะนำสุขภาพ:
      `;

      const imageParts = [{
        inlineData: { data: base64Image, mimeType: "image/jpeg" }
      }];

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      // =====================================
      // 5.3 ประมวลผลและดึงข้อมูลจาก Database
      // =====================================
      let finalText = text;
      const detectedFoods = detectThaiFoods(text);

      if (detectedFoods.length > 0) {
        finalText += `\n\n📊 ข้อมูลโภชนาการมาตรฐาน (ต่อ 1 จาน/เสิร์ฟ):`;
        
        // วนลูปเผื่อตรวจเจอหลายเมนูในรูปเดียว
        detectedFoods.forEach(food => {
          const data = thaiFoodDB[food];
          finalText += `\n\n🍲 ${food}
พลังงาน: ~${data.kcal} kcal
น้ำตาล: ~${data.sugar} g
ไขมัน: ~${data.fat} g
โซเดียม: ~${data.sodium} mg`;
        });

        finalText += `\n\n📌 คำแนะนำ: ควรฉันในปริมาณพอเหมาะ และหลีกเลี่ยงการปรุงรสชาติเพิ่มครับ 🙏`;
      }

      // ส่งคำตอบกลับไปหาผู้ใช้ทาง LINE
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: finalText
      });

    } catch (error) {
      console.error("Error processing image with Gemini:", error);
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ขออภัยครับ ระบบวิเคราะห์ภาพมีปัญหาชั่วคราว กรุณาลองส่งรูปใหม่อีกครั้งในภายหลังครับ 🙏'
      });
    }
  }

  return Promise.resolve(null);
}

// =====================================
// 6. สตาร์ทเซิร์ฟเวอร์
// =====================================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
});
