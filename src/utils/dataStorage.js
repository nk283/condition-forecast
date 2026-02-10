const fs = require('fs');
const path = require('path');

/**
 * 体調スコアの過去データ管理
 */
class DataStorage {
  constructor(storagePath = 'data/scores.json') {
    this.storagePath = storagePath;
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
}

module.exports = DataStorage;
