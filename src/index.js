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
    console.log('\n🌤️  体調予報システムを起動しています（72時間モード）...');
    console.log(`⏰ 実行時刻: ${new Date().toLocaleString('ja-JP')}\n`);

    // サービスを初期化
    console.log('🔧 サービスを初期化中...');
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
    console.log('✅ サービス初期化完了\n');

    // データを収集
    console.log('📊 データを収集しています（72時間分）...');

    // 現在時刻
    const now = new Date();

    // 1. 72時間の1時間刻み天気データを取得
    console.log('⏳ 72時間の天気データを取得中...');
    const forecastResult = await weatherService.getHourlyForecast72h();
    let hourly72h = forecastResult.hourlyData;
    const latestApiTime = forecastResult.latestApiTime;
    console.log(`✓ 72時間の天気データを取得 (${hourly72h.length}時間分)`);

    // 1.5. 保存済みの過去データで補完（昨日のデータなど）
    console.log('📦 保存済みデータから過去データを復元中...');
    try {
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() - 1);
      startTime.setHours(0, 0, 0, 0);

      const savedScores = dataStorage.getHourlyScores(startTime, new Date(now.getTime() + 48 * 60 * 60 * 1000));

      // 保存済みデータで hourly72h を補完
      savedScores.forEach(savedScore => {
        const existingIndex = hourly72h.findIndex(h => h.timestamp === savedScore.timestamp);

        if (existingIndex !== -1) {
          const apiData = hourly72h[existingIndex];
          const savedWeatherData = savedScore.weatherData;

          // 【重要】API データが完全に欠落している場合（temperature が null）
          // → 保存済みデータ（気象情報）で完全に置換
          if (apiData.temperature === null || apiData.temperature === undefined) {
            const restoredData = {
              timestamp: apiData.timestamp,
              hour: apiData.hour,
              date: apiData.date,
              dateObj: apiData.dateObj,
              temperature: savedWeatherData?.temperature !== undefined ? savedWeatherData.temperature : null,
              humidity: savedWeatherData?.humidity !== undefined ? savedWeatherData.humidity : null,
              pressure: savedWeatherData?.pressure !== undefined ? savedWeatherData.pressure : null,
              cloudiness: savedWeatherData?.cloudiness !== undefined ? savedWeatherData.cloudiness : null,
              windSpeed: savedWeatherData?.windSpeed !== undefined ? savedWeatherData.windSpeed : null,
              feelsLike: savedWeatherData?.feelsLike !== undefined ? savedWeatherData.feelsLike : null,
              weatherDescription: savedWeatherData?.weatherDescription || null,
              sunriseHour: savedWeatherData?.sunriseHour !== undefined ? savedWeatherData.sunriseHour : 6,
              sunsetHour: savedWeatherData?.sunsetHour !== undefined ? savedWeatherData.sunsetHour : 18
            };

            hourly72h[existingIndex] = restoredData;
          } else {
            // API データが存在する場合は、デフォルト値の設定のみ
            if (!hourly72h[existingIndex].sunriseHour) {
              hourly72h[existingIndex].sunriseHour = 6;
            }
            if (!hourly72h[existingIndex].sunsetHour) {
              hourly72h[existingIndex].sunsetHour = 18;
            }
          }
        }
      });

      // 全データに対してデフォルト値を確認・設定（念のため）
      hourly72h.forEach((item, idx) => {
        if (!item.sunriseHour) {
          hourly72h[idx].sunriseHour = 6;
        }
        if (!item.sunsetHour) {
          hourly72h[idx].sunsetHour = 18;
        }
      });

      console.log(`✓ 保存済みデータを復元 (${savedScores.filter(s => s.weatherData).length}件)`);
    } catch (error) {
      console.warn('⚠️  保存済みデータ復元エラー:', error.message);
      console.warn('   新規データのみで続行します');
    }

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

    // 3. AQI（空気質指数）を取得
    console.log('\n💨 空気質指数を取得しています...');
    const aqi = await weatherService.getAQI();
    console.log(`✓ AQI を取得: ${aqi}`);

    // 4. 72時間の1時間刻みスコアを計算
    console.log('\n🧮 72時間の体調スコアを計算しています...');
    const hourlyScores = scoreEngine.calculateHourlyScores(hourly72h, scheduleData, aqi);
    console.log(`✓ 72時間のスコアを計算 (${hourlyScores.length}時間分)`);

    // 5. 時間別スコアデータを保存
    console.log('\n💾 時間別データを保存しています...');
    dataStorage.saveHourlyScores(hourlyScores, latestApiTime);
    console.log('✓ 時間別スコアを保存');

    // 6. 現在時刻のスコアを取得（レポート用）
    // 開始時刻が「昨日00:00」なので、インデックス = 24（今日分）+ 現在時刻（時間単位）
    const currentHour = now.getHours();
    const currentIndex = 24 + currentHour; // 昨日24時間 + 今日の現在時刻

    // 現在時刻のスコアを直接取得（データなしの可能性あり）
    let currentScore = hourlyScores[Math.min(currentIndex, 71)];

    // 現在時刻にデータがない場合は、直近の有効なデータを検索
    if (!currentScore || !currentScore.factorScores) {
      for (let i = Math.min(currentIndex, 71); i >= 0; i--) {
        if (hourlyScores[i] && hourlyScores[i].factorScores) {
          currentScore = hourlyScores[i];
          break;
        }
      }
    }

    // それでもデータがない場合はデフォルトを使用
    if (!currentScore) {
      currentScore = {
        weatherData: null,
        factorScores: null,
        tempDiff12h: 0,
        totalScore: 0
      };
    }

    const currentWeather = {
      ...(currentScore && currentScore.weatherData ? currentScore.weatherData : {}),
      tempDiff12h: (currentScore && currentScore.tempDiff12h) || 0,  // 過去12時間の気温差
      feelsLike: (currentScore && currentScore.weatherData && currentScore.weatherData.feelsLike) || (currentScore && currentScore.weatherData && currentScore.weatherData.temperature) || 15  // 体感温度
    };

    // 7. レポート生成（互換性のため）
    console.log('\n📋 レポートを生成しています...');
    const reportGenerator = new ReportGenerator();
    const todayConditionData = {
      temperature: currentWeather.temperature || 15,
      humidity: currentWeather.humidity || 60,
      pressure: currentWeather.pressure || 1013,
      cloudCoverage: currentWeather.cloudiness || 50,
      aqi: 50,
      temperatureMax: currentWeather.temperature || 15,
      temperatureMin: currentWeather.temperature || 15,
      tempDiff12h: (currentScore && currentScore.tempDiff12h) || 0,  // 過去12時間の気温差を追加
      scheduleAnalysis: { hasEvents: false, hasMeetings: false, hasOutdoorActivities: false, sleepInterruption: false, mealInterruption: false }
    };
    // スコアキーを統一（temperatureDiff12h → temperatureDifference）
    const unifiedScores = currentScore && currentScore.factorScores ? {
      ...currentScore.factorScores,
      temperatureDifference: currentScore.factorScores.temperatureDiff12h
    } : { temperatureDifference: 0 };

    const todayDetailedAnalysis = scoreEngine.getDetailedAnalysis(unifiedScores, todayConditionData);
    const report = reportGenerator.generateReport(
      { totalScore: (currentScore && currentScore.totalScore) || 0, factorScores: unifiedScores, evaluation: scoreEngine.getEvaluation((currentScore && currentScore.totalScore) || 0) },
      todayDetailedAnalysis,
      currentWeather,
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
    htmlGenerator.setAQI(aqi); // AQIをダッシュボード生成器に渡す
    const dashboardPath = htmlGenerator.generateHourlyDashboard(hourlyScores);
    console.log(`✅ ダッシュボード生成: ${dashboardPath}`);

    // 9. 未来12時間分のサマリー
    console.log('\n📈 未来12時間の体調スコア予報:');
    const forecast12h = hourlyScores
      .filter(s => new Date(s.timestamp) > now)
      .slice(0, 12);

    if (forecast12h.length > 0) {
      forecast12h.forEach((score) => {
        const time = new Date(score.timestamp).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
        if (score.totalScore != null) {
          const scoreBar = '█'.repeat(Math.ceil(score.totalScore / 10)).padEnd(10, '░');
          console.log(`  ${time} | ${scoreBar} ${score.totalScore.toFixed(0)}/100`);
        } else {
          console.log(`  ${time} | ░░░░░░░░░░ --/100 (データなし)`);
        }
      });
    } else {
      console.log('  データなし');
    }

    console.log('\n✅ 実行完了\n');
    return { report, hourlyScores };
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  }
}

// アプリケーション実行
if (require.main === module) {
  forecastCondition();
}

module.exports = { forecastCondition };
