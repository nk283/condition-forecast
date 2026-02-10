#!/usr/bin/env node

/**
 * Google Calendar 連携テストスクリプト
 * 今日の予定を取得し、スケジュール分析結果を表示します
 *
 * 使用方法:
 *   npm run calendar
 */

require('dotenv').config();
const CalendarService = require('../services/calendarService');

async function testCalendarIntegration() {
  try {
    console.log('\n🗓️  Google Calendar テスト\n');

    // CalendarService を初期化
    const calendarService = new CalendarService(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/callback'
    );

    // 認証確認
    if (!calendarService.isAuthenticated()) {
      console.error('❌ Google Calendar 認証がまだ完了していません\n');
      console.error('以下のコマンドで認証を完了してください:');
      console.error('  npm run auth\n');
      process.exit(1);
    }

    // 今日の予定を取得
    console.log('📝 今日の予定を取得中...\n');
    const today = new Date();
    const events = await calendarService.getEventsForDate(today);

    if (events.length === 0) {
      console.log('✓ 本日の予定はありません\n');
      return;
    }

    // イベント一覧を表示
    console.log(`✓ ${events.length} 件の予定が見つかりました:\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    events.forEach((event, index) => {
      const startTime = event.start.dateTime
        ? new Date(event.start.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '終日';
      const endTime = event.end.dateTime
        ? new Date(event.end.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '';

      console.log(`\n${index + 1}. ${event.summary}`);
      console.log(`   時刻: ${startTime}${endTime ? ` - ${endTime}` : ''}`);
      if (event.description) {
        console.log(`   詳細: ${event.description}`);
      }
    });

    // スケジュール分析
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 スケジュール分析:\n');

    const analysis = calendarService.analyzeSchedule(events);

    console.log(`• イベント数: ${analysis.eventCount}`);
    console.log(`• 会合予定: ${analysis.hasMeetings ? '✓ あり' : '✗ なし'}`);
    console.log(`• 外出予定: ${analysis.hasOutdoorActivities ? '✓ あり' : '✗ なし'}`);
    console.log(`• 睡眠阻害: ${analysis.sleepInterruption ? '⚠️  あり' : '✓ なし'}`);
    console.log(`• 食事阻害: ${analysis.mealInterruption ? '⚠️  あり' : '✓ なし'}`);

    // 詳細イベント情報
    console.log('\n📌 詳細イベント情報:\n');
    analysis.events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   タイプ: ${event.type || '未分類'}`);
      console.log(`   時刻: ${event.startTime.toLocaleTimeString('ja-JP')} - ${event.endTime.toLocaleTimeString('ja-JP')}`);
      if (event.isAllDay) {
        console.log('   （終日イベント）');
      }
    });

    console.log('\n✅ カレンダー連携テスト完了！\n');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('\n対処方法:');
    console.error('  1. 認証が完了しているか確認: npm run auth');
    console.error('  2. .env ファイルが正しく設定されているか確認');
    console.error('  3. トークンが期限切れになっていないか確認\n');
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  testCalendarIntegration();
}

module.exports = { testCalendarIntegration };
