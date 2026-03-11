// --- ไฟล์ server.js ---
// ระบบ Webhook สำหรับ LINE OA เพื่อรับรูปภาพและให้ Gemini AI วิเคราะห์ผลสุขภาพ

const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. ดึง Keys และ Tokens จากไฟล์ .env (เพื่อความปลอดภัยบน Glitch / Render)
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// สร้าง Client สำหรับ LINE และ Gemini
const lineClient = new Client(config);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const app = express();

// 2. สร้าง Endpoint /webhook เพื่อรับข้อมูลจาก LINE
app.post('/webhook', middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 3. ฟังก์ชันจัดการ Event ที่เข้ามา
async function handleEvent(event) {
  // หากไม่ใช่ข้อความ ให้ข้ามไป
  if (event.type !== 'message') {
    return Promise.resolve(null);
  }

  // หากผู้ใช้พิมพ์ "ข้อความ" (Text) เข้ามา
  if (event.message.type === 'text') {
    // ตอบกลับอัตโนมัติเมื่อผู้ใช้กดเมนู
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

  // หากผู้ใช้ส่ง "รูปภาพ" (Image) เข้ามา
  if (event.message.type === 'image') {
    try {
      // 3.1 โหลดรูปภาพที่ผู้ใช้ส่งมาจากเซิร์ฟเวอร์ของ LINE
      const stream = await lineClient.getMessageContent(event.message.id);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const base64Image = buffer.toString('base64');

      // 3.2 ส่งรูปภาพไปให้ Google Gemini API วิเคราะห์
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
      
      // Prompt สำหรับวิเคราะห์รูปภาพ
      const prompt = `
        คุณคือ "สุขภาวะสงฆ์ AI" ผู้ช่วยดูแลสุขภาพสำหรับพระสงฆ์
        กรุณาดูภาพนี้ หากเป็นภาพผลตรวจสุขภาพ:
        1. สรุปค่าที่สำคัญ แปลคำศัพท์แพทย์เป็นภาษาไทย
        2. บอกว่าค่าไหนปกติ หรือค่าไหนผิดปกติ (สูง/ต่ำ)
        3. ให้คำแนะนำเบื้องต้นในการดูแลสุขภาพ

        หากเป็นภาพอาหาร:
        1. ประเมินแคลอรี่ น้ำตาล ไขมัน โซเดียม คร่าวๆ
        2. แนะนำว่าควรบริโภคปริมาณเท่าใด หรือควรระวังอะไร

        ตอบให้กระชับ เป็นมิตร สำรวมแบบชาวพุทธ และอ่านง่ายบนมือถือ
      `;

      const imageParts = [
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg"
          }
        }
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      // 3.3 ส่งคำตอบที่ได้จาก Gemini กลับไปหาผู้ใช้ทาง LINE
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: text
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

// 4. สตาร์ทเซิร์ฟเวอร์ที่ Port 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Webhook server listening on port ${port}`);
});
