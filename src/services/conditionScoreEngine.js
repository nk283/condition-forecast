/**
 * 体調スコア計算エンジン
 * 各要因を 0-100 の点数に変換し、総合スコアを計算
 */
class ConditionScoreEngine {
  constructor() {
    this.weights = {
      temperature: 0.25,
      humidity: 0.15,
      illumination: 0.20,
      airQuality: 0.15,
      pressure: 0.10,
      schedule: 0.15
    };
  }

  /**
   * 気温スコアを計算（5℃～10℃が最適）
   */
  calculateTemperatureScore(temp) {
    // 最適温度: 5℃～10℃
    const optimalMin = 5;
    const optimalMax = 10;
    const comfortMin = 5;
    const comfortMax = 20;

    if (temp >= optimalMin && temp <= optimalMax) {
      return 100; // 最適
    }

    if (temp >= comfortMin && temp <= comfortMax) {
      // 快適範囲内: 70-100
      if (temp < optimalMin) {
        return 70 + ((temp - comfortMin) / (optimalMin - comfortMin)) * 30;
      } else {
        return 70 + ((comfortMax - temp) / (comfortMax - optimalMax)) * 30;
      }
    }

    // 寒冷: 0℃以下
    if (temp < comfortMin) {
      return Math.max(10, 70 - (comfortMin - temp) * 5);
    }

    // 高温: 20℃以上
    if (temp > comfortMax) {
      return Math.max(20, 70 - (temp - comfortMax) * 5);
    }

    return 50;
  }

  /**
   * 湿度スコアを計算
   * 気温が 20℃以上で高湿度は悪影響
   */
  calculateHumidityScore(humidity, temperature) {
    const optimalHumidity = 50; // 最適湿度
    const comfortMin = 40;
    const comfortMax = 60;

    // 気温が高い場合（20℃以上）は湿度の影響が大きい
    const tempPenalty = temperature >= 20 ? 1.5 : 1;

    if (humidity >= comfortMin && humidity <= comfortMax) {
      return 100;
    }

    if (humidity < comfortMin) {
      const diff = comfortMin - humidity;
      return Math.max(40, 100 - diff * 1.5 * tempPenalty);
    }

    // 湿度が高い場合
    const diff = humidity - comfortMax;
    return Math.max(30, 100 - diff * 2 * tempPenalty);
  }

  /**
   * 日照スコアを計算
   * 日中の照度が低いと頭がぼーっとする
   */
  calculateIlluminationScore(daylight, hour) {
    // 夜間（21時～5時）は日照スコアを適用しない
    if (hour >= 21 || hour < 5) {
      return 100;
    }

    // 日中（9時～17時）に日照時間が短いと悪影響
    if (daylight < 2) {
      return 40; // 暗い日
    }
    if (daylight < 4) {
      return 60;
    }
    if (daylight < 6) {
      return 80;
    }
    return 100; // 十分な日照
  }

  /**
   * 空気質スコアを計算
   * 屋外予定がある場合に影響
   */
  calculateAirQualityScore(aqi, hasOutdoorPlans) {
    if (!hasOutdoorPlans) {
      return 100; // 屋内のみの場合は影響なし
    }

    // AQI: 0-50: 良好、51-100: 中程度、101-150: 不健康、150+: 非常に不健康
    if (aqi <= 50) {
      return 100;
    }
    if (aqi <= 100) {
      return 80;
    }
    if (aqi <= 150) {
      return 50;
    }
    return 20;
  }

  /**
   * 気圧スコアを計算
   * 低気圧で頭がぼーっとする
   */
  calculatePressureScore(pressure) {
    // 標準気圧: 1013 hPa
    const standardPressure = 1013;

    if (pressure >= 1010 && pressure <= 1015) {
      return 100; // 最適
    }

    if (pressure >= 990 && pressure <= 1030) {
      return 80; // 許容範囲
    }

    if (pressure < 990) {
      // 低気圧の影響
      const diff = 990 - pressure;
      return Math.max(30, 80 - diff * 2);
    }

    if (pressure > 1030) {
      // 高気圧の影響
      const diff = pressure - 1030;
      return Math.max(50, 80 - diff);
    }

    return 70;
  }

  /**
   * スケジュールスコアを計算
   * 人との会合、外出、睡眠・食事中断で減点
   */
  calculateScheduleScore(scheduleAnalysis) {
    let score = 100;

    if (scheduleAnalysis.hasMeetings) {
      score -= 15; // 人との会合はストレス
    }

    if (scheduleAnalysis.hasOutdoorActivities) {
      score -= 10; // 外出予定
    }

    if (scheduleAnalysis.sleepInterruption) {
      score -= 20; // 睡眠を阻害
    }

    if (scheduleAnalysis.mealInterruption) {
      score -= 10; // 食事を阻害
    }

    return Math.max(10, score);
  }

  /**
   * 総合体調スコアを計算
   */
  calculateTotalScore(data) {
    const scores = {
      temperature: this.calculateTemperatureScore(data.temperature),
      humidity: this.calculateHumidityScore(data.humidity, data.temperature),
      illumination: this.calculateIlluminationScore(data.daylightHours, new Date().getHours()),
      airQuality: this.calculateAirQualityScore(data.aqi, data.hasOutdoorPlans),
      pressure: this.calculatePressureScore(data.pressure),
      schedule: this.calculateScheduleScore(data.scheduleAnalysis)
    };

    // 加重合計
    const totalScore =
      scores.temperature * this.weights.temperature +
      scores.humidity * this.weights.humidity +
      scores.illumination * this.weights.illumination +
      scores.airQuality * this.weights.airQuality +
      scores.pressure * this.weights.pressure +
      scores.schedule * this.weights.schedule;

    return {
      totalScore: Math.round(totalScore),
      factorScores: scores,
      evaluation: this.getEvaluation(totalScore)
    };
  }

  /**
   * スコアから評価文を取得
   */
  getEvaluation(score) {
    if (score >= 80) {
      return {
        level: '良好',
        emoji: '😊',
        advice: '体調が良好です。通常通りの活動が推奨されます。'
      };
    } else if (score >= 60) {
      return {
        level: '注意',
        emoji: '😐',
        advice: '体調に注意が必要です。無理のない活動をお勧めします。'
      };
    } else if (score >= 40) {
      return {
        level: '要注意',
        emoji: '😓',
        advice: '体調が優れません。十分な睡眠と栄養をとりましょう。'
      };
    } else {
      return {
        level: '警告',
        emoji: '😰',
        advice: '体調が悪いです。休息を優先してください。'
      };
    }
  }

  /**
   * 詳細分析を生成
   */
  getDetailedAnalysis(scores, data) {
    const analysis = [];

    // 気温分析
    if (scores.temperature < 70) {
      if (data.temperature < 5) {
        analysis.push({
          factor: '気温',
          issue: `非常に寒い（${data.temperature}℃）`,
          impact: '体の冷えから体調悪化のリスク'
        });
      } else if (data.temperature > 20) {
        analysis.push({
          factor: '気温',
          issue: `高温（${data.temperature}℃）`,
          impact: '疲労感と脱水症状のリスク'
        });
      }
    }

    // 湿度分析
    if (scores.humidity < 70 && data.temperature >= 20) {
      analysis.push({
        factor: '湿度',
        issue: `高温高湿（気温${data.temperature}℃、湿度${data.humidity}%）`,
        impact: '体調が大きく悪化する可能性'
      });
    }

    // 日照分析
    if (scores.illumination < 70) {
      analysis.push({
        factor: '日照',
        issue: '日中の日照が不足',
        impact: '頭がぼーっとする可能性がある'
      });
    }

    // 空気質分析
    if (scores.airQuality < 80 && data.hasOutdoorPlans) {
      analysis.push({
        factor: '空気質',
        issue: `屋外予定があるのに空気質が悪い（AQI: ${data.aqi}）`,
        impact: '屋外活動で体調悪化の可能性'
      });
    }

    // 気圧分析
    if (scores.pressure < 80) {
      analysis.push({
        factor: '気圧',
        issue: '低気圧',
        impact: '頭がぼーっとする可能性'
      });
    }

    // スケジュール分析
    if (scores.schedule < 80) {
      const issues = [];
      if (data.scheduleAnalysis.hasMeetings) issues.push('人との会合');
      if (data.scheduleAnalysis.hasOutdoorActivities) issues.push('外出予定');
      if (data.scheduleAnalysis.sleepInterruption) issues.push('睡眠を阻害する予定');
      if (data.scheduleAnalysis.mealInterruption) issues.push('食事を阻害する予定');

      analysis.push({
        factor: 'スケジュール',
        issue: issues.join('、'),
        impact: 'ストレスと睡眠・栄養不足のリスク'
      });
    }

    return analysis;
  }
}

module.exports = ConditionScoreEngine;
