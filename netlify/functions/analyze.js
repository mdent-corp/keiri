const fetch = require('node-fetch');

exports.handler = async function (event) {
  // POST以外のリクエストを拒否
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { mimeType, base64Data } = JSON.parse(event.body);

    // 環境変数からAPIキーを安全に取得
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('APIキーが設定されていません。');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = "これは領収書の画像です。会計処理のため、以下の情報をJSON形式で抽出してください: 日付(YYYY-MM-DD)、支払先(店名)、勘定科目、内容・目的、合計金額(数値)、備考(もしあれば)。重要: 支払先の項目には「株式会社MDエンタテイメント」という会社名は絶対に含めないでください。";
    const schema = {type: "OBJECT", properties: { date: { "type": "STRING"}, payee: { "type": "STRING"}, description: { "type": "STRING"}, amount: { "type": "NUMBER"}, remarks: { "type": "STRING"}, category: { "type": "STRING", "enum": ["旅費交通費", "会議費", "消耗品費", "通信費", "接待交際費", "雑費", "その他"]}}, required: ["date", "payee", "description", "amount", "category"]};
    
    const payload = {
        contents: [{ 
            parts: [
                { text: prompt }, 
                { inlineData: { mimeType: mimeType, data: base64Data } }
            ] 
        }], 
        generationConfig: { 
            responseMimeType: "application/json", 
            responseSchema: schema 
        }
    };

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      return { statusCode: geminiResponse.status, body: JSON.stringify({ error: `Gemini API error: ${geminiResponse.statusText}` }) };
    }

    const result = await geminiResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};