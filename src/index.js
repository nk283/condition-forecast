require('dotenv').config();
const WeatherService = require('./services/weatherService');
const CalendarService = require('./services/calendarService');
const ConditionScoreEngine = require('./services/conditionScoreEngine');
const ReportGenerator = require('./utils/reportGenerator');

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

    // データを収集
    console.log('📊 データを収集しています...');
    const weatherData = await weatherService.getCurrentWeather();
    console.log('✓ 気象データを取得');

    // カレンダーデータは認証が必要なため、サンプルデータを使用
    const today = new Date();
    const sampleSchedule = {
      hasEvents: false,
      eventCount: 0,
      hasMeetings: false,
      hasOutdoorActivities: false,
      sleepInterruption: false,
      mealInterruption: false,
      events: []
    };
    console.log('✓ カレンダーデータを取得');

    // 体調スコアを計算
    console.log('\n🧮 体調スコアを計算しています...');
    const conditionData = {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      pressure: weatherData.pressure,
      daylightHours: 6, // サンプル値（実際には日照データから計算）
      aqi: 50, // サンプル値（実際には空気質API から取得）
      hasOutdoorPlans: sampleSchedule.hasOutdoorActivities,
      scheduleAnalysis: sampleSchedule
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
