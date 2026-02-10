/**
 * 体調予報システムのデモンストレーション
 * API キーなしでシステム全体を動作確認できます
 */

const ConditionScoreEngine = require('./src/services/conditionScoreEngine');
const ReportGenerator = require('./src/utils/reportGenerator');

// サンプルデータを生成
function generateSampleData() {
  return {
    // 気象データ（東京の典型的な冬の日）
    weather: {
      temperature: 8,
      feelsLike: 5,
      humidity: 55,
      pressure: 1015,
      windSpeed: 3.2,
      visibility: 10000,
      weatherDescription: '晴れ',
      weatherIcon: '01d'
    },

    // スケジュール情報
    schedule: {
      hasEvents: true,
      eventCount: 2,
      hasMeetings: true,
      hasOutdoorActivities: false,
      sleepInterruption: false,
      mealInterruption: false,
      events: [
        {
          title: '午前の会議',
          type: 'meeting'
        },
        {
          title: 'ランチミーティング',
          type: 'meal'
        }
      ]
    }
  };
}

function demo() {
  console.log('🚀 体調予報システム デモンストレーション\n');
  console.log('═'.repeat(50));

  // スコアエンジンを初期化
  const scoreEngine = new ConditionScoreEngine();
  const reportGenerator = new ReportGenerator();
  const sampleData = generateSampleData();

  // 体調スコア計算用のデータを準備
  const conditionData = {
    temperature: sampleData.weather.temperature,
    humidity: sampleData.weather.humidity,
    pressure: sampleData.weather.pressure,
    daylightHours: 6,
    aqi: 40,
    hasOutdoorPlans: sampleData.schedule.hasOutdoorActivities,
    scheduleAnalysis: sampleData.schedule
  };

  // スコアを計算
  const result = scoreEngine.calculateTotalScore(conditionData);
  const detailedAnalysis = scoreEngine.getDetailedAnalysis(result.factorScores, conditionData);

  // レポートを生成して表示
  const report = reportGenerator.generateReport(
    result,
    detailedAnalysis,
    sampleData.weather,
    new Date()
  );

  console.log('\n' + report.text);

  // JSON出力も表示
  console.log('\n【システム分析結果（JSON形式）】');
  console.log(JSON.stringify(report.json, null, 2));
}

// デモを実行
if (require.main === module) {
  demo();
}

module.exports = { demo };
