require('dotenv').config();
const WeatherService = require('./services/weatherService');
const CalendarService = require('./services/calendarService');
const ConditionScoreEngine = require('./services/conditionScoreEngine');
const ReportGenerator = require('./utils/reportGenerator');
const DataStorage = require('./utils/dataStorage');
const HtmlDashboardGenerator = require('./utils/htmlDashboardGenerator');

/**
 * メイン体調予報関数
 */
async function forecastCondition() {
  try {
    console.log('🌡️  体調予報システムを起動しています...\n');

    // サービスを初期化
    const weatherService = new WeatherService(
      process.env.OPENWEATHER_API_KEY,
      parseFloat(process.env.WEATHER_LAT),
      parseFloat(process.env.WEATHER_LON)
    );

    const calendarService = new CalendarService(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scoreEngine = new ConditionScoreEngine();
    const dataStorage = new DataStorage();
    const htmlGenerator = new HtmlDashboardGenerator();

    // データを収集
    console.log('📊 データを収集しています...');
    const weatherData = await weatherService.getCurrentWeather();
    console.log('✓ 気象データを取得');

    // カレンダーデータを取得
    const today = new Date();
    let scheduleAnalysis = {
      hasEvents: false,
      eventCount: 0,
      hasMeetings: false,
      hasOutdoorActivities: false,
      sleepInterruption: false,
      mealInterruption: false,
      events: []
    };

    // Google Calendar 認証確認
    if (calendarService.isAuthenticated()) {
      try {
        const calendarEvents = await calendarService.getEventsForDate(today);
        scheduleAnalysis = calendarService.analyzeSchedule(calendarEvents);
        console.log('✓ カレンダーデータを取得');
      } catch (error) {
        console.warn('⚠️  カレンダーデータ取得エラー:', error.message);
        console.warn('   サンプルデータを使用します');
      }
    } else {
      console.warn('⚠️  Google Calendar 認証未完了');
      console.warn('   Google Calendar 連携を有効化するには以下を実行:');
      console.warn('   npm run auth');
      console.warn('   サンプルデータを使用します');
    }

    // 体調スコアを計算
    console.log('\n🧮 体調スコアを計算しています...');
    const conditionData = {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      pressure: weatherData.pressure,
      daylightHours: 6, // サンプル値（実際には日照データから計算）
      aqi: 50, // サンプル値（実際には空気質API から取得）
      hasOutdoorPlans: scheduleAnalysis.hasOutdoorActivities,
      scheduleAnalysis: scheduleAnalysis
    };

    const result = scoreEngine.calculateTotalScore(conditionData);
    const detailedAnalysis = scoreEngine.getDetailedAnalysis(result.factorScores, conditionData);

    // レポートを生成
    console.log('\n📋 レポートを生成しています...');
    const reportGenerator = new ReportGenerator();
    const report = reportGenerator.generateReport(result, detailedAnalysis, weatherData, today);

    // 出力
    console.log('\n========================================');
    console.log('         🌟 体調予報レポート 🌟');
    console.log('========================================\n');
    console.log(report.text);

    // JSON 出力
    if (process.env.OUTPUT_FORMAT === 'json') {
      console.log('\n【JSON形式】');
      console.log(JSON.stringify(report.json, null, 2));
    }

    // 過去データを保存
    console.log('\n💾 データを保存しています...');
    dataStorage.saveScore(today, result.totalScore, result.factorScores, weatherData, scheduleAnalysis);
    console.log('✓ スコアを保存');

    // HTML ダッシュボードを生成
    console.log('\n🎨 HTML ダッシュボードを生成しています...');
    const historicalData = dataStorage.getRecentScores(7);
    const dashboardPath = htmlGenerator.generateDashboard(
      report,
      weatherData,
      scheduleAnalysis,
      historicalData
    );
    console.log(`✓ ダッシュボード生成: ${dashboardPath}`);
    console.log(`  ブラウザで開く: ${dashboardPath}`);

    return report;
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// アプリケーション実行
if (require.main === module) {
  forecastCondition();
}

module.exports = { forecastCondition };
