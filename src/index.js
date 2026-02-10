require('dotenv').config();
const WeatherService = require('./services/weatherService');
const CalendarService = require('./services/calendarService');
const ConditionScoreEngine = require('./services/conditionScoreEngine');
const ReportGenerator = require('./utils/reportGenerator');
const DataStorage = require('./utils/dataStorage');
const HtmlDashboardGenerator = require('./utils/htmlDashboardGenerator');

/**
 * メイン体調予報関数
 * 72時間（昨日24h + 今日24h + 明日24h）の1時間刻みスコアを計算
 */
async function forecastCondition() {
  try {
    console.log('🌤️  体調予報システムを起動しています（72時間モード）...\n');

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
    console.log('📊 データを収集しています（72時間分）...');

    // 現在時刻
    const now = new Date();

    // 1. 72時間の1時間刻み天気データを取得
    console.log('⏳ 72時間の天気データを取得中...');
    const hourly72h = await weatherService.getHourlyForecast72h();
    console.log(`✓ 72時間の天気データを取得 (${hourly72h.length}時間分)`);

    // 2. Google Calendar の72時間予定を取得
    let scheduleData = [];
    if (calendarService.isAuthenticated()) {
      try {
        scheduleData = await calendarService.getScheduleFor72h();
        console.log(`✓ 72時間の予定を取得 (${scheduleData.length}件)`);
      } catch (error) {
        console.warn('⚠️  カレンダーデータ取得エラー:', error.message);
        console.warn('   予定なしで計算を続行します');
      }
    } else {
      console.warn('⚠️  Google Calendar 認証未完了');
      console.warn('   Google Calendar 連携を有効化するには以下を実行: npm run auth');
      console.warn('   予定なしで計算を続行します');
    }

    // 3. 72時間の1時間刻みスコアを計算
    console.log('\n🧮 72時間の体調スコアを計算しています...');
    const hourlyScores = scoreEngine.calculateHourlyScores(hourly72h, scheduleData);
    console.log(`✓ 72時間のスコアを計算 (${hourlyScores.length}時間分)`);

    // 4. 時間別スコアデータを保存
    console.log('\n💾 時間別データを保存しています...');
    dataStorage.saveHourlyScores(hourlyScores);
    console.log('✓ 時間別スコアを保存');

    // 5. 今日のスコア（12時時点）を取得（レポート用）
    const todayIndex = 24; // 昨日0:00 + 24 = 今日0:00, さらに+12=今日12:00
    const todayNoonScore = hourlyScores[todayIndex + 12] || hourlyScores[todayIndex];
    const todayWeather = todayNoonScore.weatherData;

    // 6. レポート生成（互換性のため）
    console.log('\n📋 レポートを生成しています...');
    const reportGenerator = new ReportGenerator();
    const todayConditionData = {
      temperature: todayWeather.temperature,
      humidity: todayWeather.humidity,
      pressure: todayWeather.pressure,
      cloudCoverage: todayWeather.cloudiness,
      aqi: 50
    };
    const todayDetailedAnalysis = scoreEngine.getDetailedAnalysis(todayNoonScore.factorScores, todayConditionData);
    const report = reportGenerator.generateReport(
      { totalScore: todayNoonScore.totalScore, factorScores: todayNoonScore.factorScores, evaluation: scoreEngine.getEvaluation(todayNoonScore.totalScore) },
      todayDetailedAnalysis,
      todayWeather,
      now
    );

    // 7. 出力
    console.log('\n========================================');
    console.log('         🌟 72時間体調予報レポート 🌟');
    console.log('========================================\n');
    console.log('【本日（12:00時点）のスコア】\n');
    console.log(report.text);

    // JSON 出力
    if (process.env.OUTPUT_FORMAT === 'json') {
      console.log('\n【JSON形式】');
      console.log(JSON.stringify(report.json, null, 2));
    }

    // 8. HTML ダッシュボードを生成
    console.log('\n🎨 HTML ダッシュボードを生成しています...');
    const dashboardPath = htmlGenerator.generateHourlyDashboard(hourlyScores);
    console.log(`✓ ダッシュボード生成: ${dashboardPath}`);

    return { report, hourlyScores };
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
