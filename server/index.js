const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { OpenAI } = require('openai'); // OpenAIのインポート
const axios = require('axios');

require('dotenv').config(); // 環境変数を読み込む

const app = express();
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:3000', // ReactのURL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'P@ssw0rd',
    database: 'travel_plan'
});


app.get('/api/config', (req, res) => {
  res.json({ GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY });
});


// OpenAIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 環境変数からAPIキーを取得
});


// 新規登録
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: '全ての項目を入力してください。' });
    }

    // ユーザーネームのバリデーション
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9faf]{3,30}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({
            message: 'ユーザーネームは3文字以上30文字以内で、アルファベット、漢字、数字、アンダースコアのみ使用できます。スペースは含められません。',
        });
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '有効なメールアドレスを入力してください。' });
    }

    // パスワードのバリデーション
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            message: 'パスワードは6文字以上で、英字と数字を1つ以上含む必要があります。',
        });
    }

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'このメールアドレスは既に登録されています。' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [
            username,
            email,
            hashedPassword,
        ]);

        res.status(201).json({ message: '登録成功！' });
    } catch (error) {
        console.error('サーバーエラー:', error);
        res.status(500).json({ message: 'サーバーエラーが発生しました。' });
    }
});

// ログイン
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ message: 'メールアドレスとパスワードを入力してください。' });
  }

  try {
      const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
          return res.status(404).json({ message: 'ユーザーが見つかりません。' });
      }

      const user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
          return res.status(401).json({ message: 'パスワードが正しくありません。' });
      }

      res.status(200).json({ message: 'ログイン成功！', username: user.username });
  } catch (error) {
      console.error('サーバーエラー:', error);
      res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
});



//旅行プラン生成AI
app.post('/generate-plan', async (req, res) => {
  const { destination, duration, budget, request } = req.body;

  try {
      const prompt = `
      以下の条件に基づいて、日別に分かれた旅行プランを提案してください：
      - 目的地: ${destination}
      - 日程: ${duration}日
      - 予算: ${budget}円
      - 特別なリクエスト: ${request || '特になし'}
      プランの形式は以下のようにしてください：
      1日目: [観光地1, 観光地2]
      2日目: [観光地3, 観光地4]
      `;

      const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
              { role: 'system', content: 'あなたは旅行プランナーです。' },
              { role: 'user', content: prompt },
          ],
          max_tokens: 500,
      });

      // 生成されたプランを整形
      const planText = response.choices[0].message.content.trim();

      const places = planText
            .split('\n') // 各日ごとに分割
            .map(line => line.replace(/^\d+日目:\s*/, '').split(',')) // 日ラベルを削除し、カンマで分割
            .flat() // 2次元配列を1次元配列に
            .map(place => place.trim())
            .filter(place => place); // 空の要素を削除

      console.log('生成されたプラン:', planText); // デバッグ用
      console.log('観光地リスト:', places); // デバッグ用

      res.status(200).json({ plan: planText, places }); // plan と places を返す
  } catch (error) {
      console.error('OpenAI APIエラー:', error);
      res.status(500).json({ message: '旅行プラン生成に失敗しました。' });
  }
});



// ルート最適化エンドポイント
app.post('/get-directions', async (req, res) => {
  const { locations } = req.body;
  
  try {
      // locationsは [{lat: number, lng: number}, ...] 形式を想定
      const origin = `${locations[0].lat},${locations[0].lng}`;
      const destination = `${locations[locations.length - 1].lat},${locations[locations.length - 1].lng}`;

      // 中間地点（waypoints）
      const waypointCoords = locations.slice(1, -1).map(loc => `${loc.lat},${loc.lng}`);
      // 複数経由地がある場合、'|'で連結
      const waypoints = waypointCoords.join('|');

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${process.env.GOOGLE_MAPS_API_KEY}${waypoints ? `&waypoints=${waypoints}` : ''}`;
      
      const response = await axios.get(url);

      if (response.data.status !== 'OK') {
          console.error('Google Maps Directions APIエラー:', response.data);
          throw new Error('Google Maps Directions API エラー');
      }

      res.status(200).json(response.data);
  } catch (error) {
      console.error('ルート取得エラー:', error);
      res.status(500).json({ message: 'ルート取得に失敗しました。' });
  }
});




app.post('/geocode-locations', async (req, res) => {
  const { locations } = req.body;

  if (!locations || locations.length === 0) {
      return res.status(400).json({ message: '観光地名がありません。' });
  }

  try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const geocodedLocations = [];

      for (const location of locations) {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
          
          // デバッグ用ログ
          console.log(`Geocoding APIリクエストURL: ${url}`);

          const response = await axios.get(url);

          if (response.data.status === 'OK') {
              const { lat, lng } = response.data.results[0].geometry.location;
              geocodedLocations.push({ lat, lng });
          } else {
              console.error(`Geocoding failed for location: ${location}`);
          }
      }

      res.status(200).json(geocodedLocations);
  } catch (error) {
      console.error('Geocodingエラー:', error);
      res.status(500).json({ message: '観光地の緯度経度取得に失敗しました。' });
  }
});




app.listen(5000, () => console.log('Server running on port 5000'));