const fs = require('fs');
const path = require('path');

/**
 * 体調スコアの過去データ管理
 */
class DataStorage {
  constructor(storagePath = 'data/scores.json', hourlyStoragePath = 'data/hourly_scores.json') {
    this.storagePath = storagePath;
    this.hourlyStoragePath = hourlyStoragePath;
    this.storageDir = path.dirname(storagePath);
    this.ensureStorageDir();
  }

  /**
   * ストレージディレクトリを作成（存在しない場合）
   */
  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * スコアを保存
   */
  saveScore(date, totalScore, factorScores, weatherData = null, scheduleData = null) {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD 形式
      const scores = this.loadAllScores();

      // 同じ日付があれば上書き
      scores[dateStr] = {
        date: dateStr,
        timestamp: date.toISOString(),
        type: 'actual',
        totalScore: Math.round(totalScore),
        factorScores: {
          temperature: Math.round(factorScores.temperature),
          temperatureDifference: factorScores.temperatureDifference !== undefined ? Math.round(factorScores.temperatureDifference) : 100,
          humidity: Math.round(factorScores.humidity),
          illumination: Math.round(factorScores.illumination),
          airQuality: Math.round(factorScores.airQuality),
          pressure: Math.round(factorScores.pressure),
          schedule: Math.round(factorScores.schedule)
        },
        weather: weatherData ? {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          pressure: weatherData.pressure,
          description: weatherData.weatherDescription
        } : null,
        schedule: scheduleData || null
      };

      fs.writeFileSync(this.storagePath, JSON.stringify(scores, null, 2));
      return true;
    } catch (error) {
      console.error('スコア保存エラー:', error.message);
      return false;
    }
  }

  /**
   * 予測スコアを保存
   */
  saveForecastScore(date, totalScore, factorScores, weatherData = null) {
    try {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      const scores = this.loadAllScores();

      // 同じ日付があれば上書き
      scores[dateStr] = {
        date: dateStr,
        timestamp: new Date().toISOString(),
        type: 'forecast',
        totalScore: Math.round(totalScore),
        factorScores: {
          temperature: Math.round(factorScores.temperature),
          temperatureDifference: factorScores.temperatureDifference !== undefined ? Math.round(factorScores.temperatureDifference) : 100,
          humidity: Math.round(factorScores.humidity),
          illumination: Math.round(factorScores.illumination),
          airQuality: Math.round(factorScores.airQuality),
          pressure: Math.round(factorScores.pressure),
          schedule: Math.round(factorScores.schedule)
        },
        weather: weatherData ? {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          pressure: weatherData.pressure,
          description: weatherData.weatherDescription
        } : null
      };

      fs.writeFileSync(this.storagePath, JSON.stringify(scores, null, 2));
      return true;
    } catch (error) {
      console.error('予測スコア保存エラー:', error.message);
      return false;
    }
  }

  /**
   * 未来予測データを取得
   */
  getForecastScores() {
    try {
      const scores = this.loadAllScores();
      const forecastData = {};

      Object.keys(scores).forEach(dateStr => {
        if (scores[dateStr].type === 'forecast') {
          forecastData[dateStr] = scores[dateStr];
        }
      });

      // 日付でソート
      return Object.keys(forecastData)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = forecastData[key];
          return sorted;
        }, {});
    } catch (error) {
      console.warn('予測データ取得エラー:', error.message);
      return {};
    }
  }

  /**
   * すべてのスコアを読み込み
   */
  loadAllScores() {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return {};
      }
      const data = fs.readFileSync(this.storagePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('スコアファイル読み込みエラー:', error.message);
      return {};
    }
  }

  /**
   * 過去 N 日分のスコアを取得
   */
  getRecentScores(days = 7) {
    const scores = this.loadAllScores();
    const today = new Date();
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    const recentScores = {};
    Object.keys(scores).forEach(dateStr => {
      const date = new Date(dateStr);
      if (date >= startDate) {
        recentScores[dateStr] = scores[dateStr];
      }
    });

    // 日付でソート
    return Object.keys(recentScores)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = recentScores[key];
        return sorted;
      }, {});
  }

  /**
   * 指定日のスコアを取得
   */
  getScoreForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    const scores = this.loadAllScores();
    return scores[dateStr] || null;
  }

  /**
   * 古いデータを削除
   */
  cleanOldData(retentionDays = 30) {
    try {
      const scores = this.loadAllScores();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const cleanedScores = {};
      let deletedCount = 0;

      Object.keys(scores).forEach(dateStr => {
        const date = new Date(dateStr);
        if (date >= cutoffDate) {
          cleanedScores[dateStr] = scores[dateStr];
        } else {
          deletedCount++;
        }
      });

      fs.writeFileSync(this.storagePath, JSON.stringify(cleanedScores, null, 2));
      return deletedCount;
    } catch (error) {
      console.error('データクリーンアップエラー:', error.message);
      return 0;
    }
  }

  /**
   * 統計情報を取得
   */
  getStatistics(days = 7) {
    const recentScores = this.getRecentScores(days);
    const scores = Object.values(recentScores).map(s => s.totalScore);

    if (scores.length === 0) {
      return null;
    }

    return {
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      max: Math.max(...scores),
      min: Math.min(...scores),
      latest: scores[scores.length - 1],
      trend: this.calculateTrend(scores)
    };
  }

  /**
   * トレンドを計算（上昇/下降/横ばい）
   */
  calculateTrend(scores) {
    if (scores.length < 2) {
      return 'stable';
    }

    const recent = scores.slice(-3);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previous = scores.slice(-6, -3);
    const previousAverage = previous.length > 0
      ? previous.reduce((a, b) => a + b, 0) / previous.length
      : average;

    const diff = average - previousAverage;
    if (diff > 5) {
      return 'up';
    } else if (diff < -5) {
      return 'down';
    } else {
      return 'stable';
    }
  }

  /**
   * 時間別スコアを保存（72時間の1時間刻みデータ用）
   * @param {Array} hourlyScores - ConditionScoreEngine.calculateHourlyScores()の結果
   */
  saveHourlyScores(hourlyScores) {
    try {
      const filePath = path.join(this.storageDir, path.basename(this.hourlyStoragePath));

      // 既存データを読み込み
      let allData = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        allData = JSON.parse(content);
      }

      // 新しいデータを追加（重複チェック）
      // 注: null データも含めてすべて保存（72時間の時間スロットを維持）
      hourlyScores.forEach(score => {
        const exists = allData.find(d => d.timestamp === score.timestamp);
        if (!exists) {
          // データがない場合も含めてすべて保存
          if (!score.factorScores) {
            // null データの場合
            allData.push({
              timestamp: score.timestamp,
              hour: score.hour,
              date: score.date,
              totalScore: null,
              factorScores: null,
              weatherData: null,
              tempDiff12h: null,
              pressureDiff12h: null
            });
          } else {
            // スコアを保存可能な形式に変換
            allData.push({
              timestamp: score.timestamp,
              hour: score.hour,
              date: score.date,
              totalScore: Math.round(score.totalScore),
              factorScores: {
                temperature: Math.round(score.factorScores.temperature),
                temperatureDiff12h: Math.round(score.factorScores.temperatureDiff12h),
                humidity: Math.round(score.factorScores.humidity),
                illumination: Math.round(score.factorScores.illumination),
                airQuality: Math.round(score.factorScores.airQuality),
                pressure: Math.round(score.factorScores.pressure),
                pressureDifference: Math.round(score.factorScores.pressureDifference),
                schedule: Math.round(score.factorScores.schedule)
              },
              weatherData: score.weatherData,
              tempDiff12h: score.tempDiff12h,
              pressureDiff12h: score.pressureDiff12h
            });
          }
        }
      });

      // 古いデータを削除（30日以上前）
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      allData = allData.filter(d => new Date(d.timestamp) > cutoffDate);

      // ファイルに保存
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf8');
      console.log(`✅ 時間別スコア保存: ${allData.length}件`);
      return true;
    } catch (error) {
      console.error('時間別スコア保存エラー:', error.message);
      return false;
    }
  }

  /**
   * 指定期間の時間別スコアを取得
   */
  getHourlyScores(startTime, endTime) {
    try {
      const filePath = path.join(this.storageDir, path.basename(this.hourlyStoragePath));

      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const allData = JSON.parse(content);

      // 指定期間のデータを抽出
      return allData.filter(d => {
        const timestamp = new Date(d.timestamp);
        return timestamp >= startTime && timestamp <= endTime;
      });
    } catch (error) {
      console.warn('時間別スコア取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 昨日24時間分のスコアを取得（過去データから）
   */
  getYesterdayScores() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return this.getHourlyScores(yesterday, today);
    } catch (error) {
      console.warn('昨日のスコア取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 指定期間のデータを取得（天気データ抽出用）
   * @param {Date} startTime - 開始時刻
   * @param {Date} endTime - 終了時刻
   * @returns {Object} キー: timestampの形式で、天気データのみを抽出したオブジェクト
   */
  getWeatherDataByTimeRange(startTime, endTime) {
    try {
      const scores = this.getHourlyScores(startTime, endTime);
      const weatherMap = {};

      scores.forEach(score => {
        if (score.weatherData) {
          weatherMap[score.timestamp] = score.weatherData;
        }
      });

      return weatherMap;
    } catch (error) {
      console.warn('天気データ取得エラー:', error.message);
      return {};
    }
  }

  /**
   * 72時間範囲で前回のデータと重複しているデータを抽出
   * @param {Date} targetStartTime - 今回の72時間開始時刻
   * @returns {Object} キー: timestampの形式で、存在するデータを抽出
   */
  getOverlappingWeatherData(targetStartTime) {
    try {
      // 今回の72時間範囲: targetStartTime ～ targetStartTime + 72時間
      const targetEndTime = new Date(targetStartTime.getTime() + 72 * 60 * 60 * 1000);

      // 過去ファイルから該当期間のデータをすべて取得
      const scores = this.getHourlyScores(targetStartTime, targetEndTime);
      const weatherMap = {};

      scores.forEach(score => {
        if (score.timestamp) {
          // weatherData が null でも含める（復元が目的）
          weatherMap[score.timestamp] = score.weatherData;
        }
      });

      console.log(`📦 過去データから ${Object.keys(weatherMap).length} 件の天気データを復元`);
      return weatherMap;
    } catch (error) {
      console.warn('重複データ抽出エラー:', error.message);
      return {};
    }
  }
}

module.exports = DataStorage;
