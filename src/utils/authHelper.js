#!/usr/bin/env node

/**
 * Google Calendar OAuth 2.0 認証ヘルパー
 * 初回実行時のみ使用して、Google Calendar へのアクセス権を取得します
 *
 * 使用方法:
 *   npm run auth
 */

require('dotenv').config();
const readline = require('readline');
const open = require('open');
const CalendarService = require('../services/calendarService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * ユーザーに入力を促す
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Google Calendar 認証フロー
 */
async function authenticate() {
  try {
    console.log('\n🔐 Google Calendar OAuth 2.0 認証プロセス\n');

    // 環境変数を確認
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ エラー: Google Calendar API の認証情報が設定されていません');
      console.error('以下を実施してください:');
      console.error('  1. https://console.cloud.google.com/ で新規プロジェクトを作成');
      console.error('  2. Google Calendar API を有効化');
      console.error('  3. OAuth 2.0 クライアント ID を作成');
      console.error('  4. .env ファイルに以下を追加:');
      console.error('     GOOGLE_CLIENT_ID=xxx');
      console.error('     GOOGLE_CLIENT_SECRET=yyy');
      process.exit(1);
    }

    // CalendarService を初期化
    const calendarService = new CalendarService(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/callback'
    );

    // 認証 URL を取得
    const authUrl = calendarService.getAuthUrl();

    console.log('📋 認証手順:');
    console.log('  1. 下記のリンクをクリック、または自動で開きます');
    console.log('  2. Google アカウントにログイン');
    console.log('  3. 「Condition Forecast が Google Calendar へのアクセスをリクエストしています」と表示されたら、「許可」をクリック');
    console.log('  4. 認証コードが表示されますのでコピーしてください\n');

    console.log(`🔗 認証 URL:\n${authUrl}\n`);

    // ブラウザを自動起動（オプション）
    console.log('ブラウザを起動しています...');
    try {
      await open(authUrl);
      console.log('✓ ブラウザが起動しました\n');
    } catch (error) {
      console.warn('⚠️  ブラウザの自動起動に失敗しました。上記の URL をコピーしてブラウザで開いてください\n');
    }

    // 認証コード入力を促す
    const code = await question('認証コードを入力してください:\n▶ ');

    if (!code) {
      console.error('❌ 認証コードが入力されていません');
      process.exit(1);
    }

    // トークンを取得
    console.log('\n📝 トークンを取得しています...');
    await calendarService.refreshToken(code);
    console.log('✓ トークンを正常に取得しました\n');

    // 認証確認
    if (calendarService.isAuthenticated()) {
      console.log('✅ Google Calendar 認証が完了しました！\n');
      console.log('次のコマンドでカレンダーデータをテストできます:');
      console.log('  npm run calendar\n');
      console.log('または体調予報を実行:');
      console.log('  npm start\n');
    } else {
      console.error('❌ 認証に失敗しました');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 認証エラー:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 実行
if (require.main === module) {
  authenticate();
}

module.exports = { authenticate };
