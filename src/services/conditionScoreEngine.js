/**
 * 体調スコア計算エンジン
 * 各要因を 0-100 の点数に変換し、総合スコアを計算
 */
class ConditionScoreEngine {
  constructor() {
    this.weights = {
      temperature: 0.15,
      temperatureDiff12h: 0.10,  // 新規: 過去12時間の気温差
      humidity: 0.15,
      illumination: 0.15,
      airQuality: 0.10,
      pressure: 0.10,
      schedule: 0.25  // 時間別対応で重要度UP
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

    if (temp < comfortMin) {
      // 寒冷
      return Math.max(10, 70 - (comfortMin - temp) * 5);
    }

    // 高温: 20℃以上
    return Math.max(20, 70 - (temp - comfortMax) * 5);
  }

  /**
   * 気温差スコアを計算
   * 気温差が大きい場合は低スコア
   */
  calculateTemperatureDifferenceScore(tempMax, tempMin) {
    if (tempMax === null || tempMin === null) {
      return 100; // データなしの場合は満点
    }

    const tempDiff = tempMax - tempMin;

    // 気温差が安定している（10℃以下）→ 100点
    if (tempDiff <= 10) {
      return 100;
    }

    // 気温差が10℃を超える場合は減点
    // 気温差15℃ = 85点、20℃ = 70点、25℃ = 55点など
    const penalty = (tempDiff - 10) * 3; // 1℃あたり3点減点
    return Math.max(10, 100 - penalty);
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
   * cloudCoverage: 雲量（0～100%、0=快晴、100=曇天）
   */
  calculateIlluminationScore(cloudCoverage, hour) {
    // 夜間（21時～5時）は日照スコアを適用しない
    if (hour >= 21 || hour < 5) {
      return 100;
    }

    // 雲量ベースのスコア計算
    // 雲量が少ない（晴れ）→ スコア高
    // 雲量が多い（曇り）→ スコア低
    if (cloudCoverage <= 20) {
      return 100; // 快晴
    }
    if (cloudCoverage <= 40) {
      return 90; // 晴れ
    }
    if (cloudCoverage <= 60) {
      return 70; // 曇り
    }
    if (cloudCoverage <= 80) {
      return 50; // 曇天
    }
    return 40; // 厚い雲
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
   *
   * 【気圧と体調の関係】
   * 気圧の変化は気象変動を伴う場合が多く、以下のパターンで体調に影響：
   *
   * ★低気圧（990 hPa未満）:
   *  - 血管拡張、気分が落ち込む
   *  - 関節痛、頭痛、めまいが増加
   *  - スコア: 低い（20-40点）
   *
   * ★標準気圧付近（1010-1020 hPa）:
   *  - 体調が安定、快適
   *  - 最高のコンディション
   *  - スコア: 100点
   *
   * ★高気圧（1025 hPa超）:
   *  - 血管収縮、不安感
   *  - 体が重い、気分が鬱っぽい
   *  - スコア: 低い（30-60点）
   *
   * 【スコア計算式と具体例】
   * - 1010-1020 hPa → 100点（標準気圧、快適）
   * - 1000-1010 hPa → 100-80点（わずかな低気圧）
   * - 1020-1030 hPa → 100-50点（わずかな高気圧）
   * - 990-1000 hPa → 80-40点（低気圧の影響が顕著）
   * - 1030-1040 hPa → 50-30点（高気圧の影響が顕著）
   * - <990 hPa → <40点（強い低気圧で体調悪化）
   * - >1040 hPa → <30点（強い高気圧で体が重い）
   */
  calculatePressureScore(pressure) {
    // 最適範囲: 1010-1020 hPa
    if (pressure >= 1010 && pressure <= 1020) {
      return 100;
    }

    // わずかな低気圧（下限）: 1000-1010 hPa
    if (pressure >= 1000 && pressure < 1010) {
      // 1010→100点、1000→80点へ線形変化
      return Math.round(100 - (1010 - pressure) / 10 * 20);
    }

    // わずかな高気圧（上限）: 1020-1030 hPa
    if (pressure > 1020 && pressure <= 1030) {
      // 1020→100点、1030→50点へ線形変化
      return Math.round(100 - (pressure - 1020) / 10 * 50);
    }

    // 顕著な低気圧: 990-1000 hPa
    if (pressure >= 990 && pressure < 1000) {
      // 1000→80点、990→40点へ線形変化
      return Math.round(80 - (1000 - pressure) / 10 * 40);
    }

    // 顕著な高気圧: 1030-1040 hPa
    if (pressure > 1030 && pressure <= 1040) {
      // 1030→50点、1040→30点へ線形変化
      return Math.round(50 - (pressure - 1030) / 10 * 20);
    }

    // 強い低気圧: 980-990 hPa
    if (pressure >= 980 && pressure < 990) {
      // 990→40点、980→20点へ線形変化
      return Math.round(40 - (990 - pressure) / 10 * 20);
    }

    // 強い高気圧: 1040-1050 hPa
    if (pressure > 1040 && pressure <= 1050) {
      // 1040→30点、1050→15点へ線形変化
      return Math.round(30 - (pressure - 1040) / 10 * 15);
    }

    // 極端な低気圧: 980 hPa未満
    if (pressure < 980) {
      const extremeLow = Math.max(10, 20 - (980 - pressure) * 2);
      return Math.round(extremeLow);
    }

    // 極端な高気圧: 1050 hPa超
    if (pressure > 1050) {
      const extremeHigh = Math.max(10, 15 - (pressure - 1050) * 2);
      return Math.round(extremeHigh);
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
    // 時刻の決定（外部から指定されていればそれを使用、なければ現在時刻）
    const hour = data.hour !== undefined ? data.hour : new Date().getHours();

    const scores = {
      temperature: this.calculateTemperatureScore(data.temperature),
      temperatureDifference: this.calculateTemperatureDifferenceScore(
        data.temperatureMax || null,
        data.temperatureMin || null
      ),
      humidity: this.calculateHumidityScore(data.humidity, data.temperature),
      illumination: this.calculateIlluminationScore(data.cloudCoverage || data.daylightHours || 50, hour),
      airQuality: this.calculateAirQualityScore(data.aqi, data.hasOutdoorPlans),
      pressure: this.calculatePressureScore(data.pressure),
      schedule: this.calculateScheduleScore(data.scheduleAnalysis)
    };

    // 加重合計
    const totalScore =
      scores.temperature * this.weights.temperature +
      scores.temperatureDifference * this.weights.temperatureDifference +
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
   * 72時間の1時間刻みスコアを計算
   * @param {Array} hourlyData - WeatherService.getHourlyForecast72h()の結果
   * @param {Array} scheduleData - Google Calendar の予定配列（オプション）
   * @param {number} aqi - 空気質指数（オプション、デフォルト: 50）
   */
  calculateHourlyScores(hourlyData, scheduleData = [], aqi = 50) {
    const results = [];

    for (let i = 0; i < hourlyData.length; i++) {
      const data = hourlyData[i];

      // 過去12時間の気温データを取得（ i-12 ～ i-1）
      const past12hStart = Math.max(0, i - 12);
      const past12h = hourlyData.slice(past12hStart, i + 1);
      const tempDiff12h = this.calculateTempDiff12h(past12h);

      // 各要因のスコア計算
      const scores = {
        temperature: this.calculateTemperatureScore(data.temperature),
        temperatureDiff12h: this.calculateTempDiffScore(tempDiff12h),
        humidity: this.calculateHumidityScore(data.humidity, data.temperature),
        illumination: this.calculateSunshineScoreHourly(data.cloudiness, data.hour),
        airQuality: this.calculateAirQualityScore(aqi, false), // 屋内判定は常にfalse（屋外活動を想定）
        pressure: this.calculatePressureScore(data.pressure),
        schedule: this.calculateScheduleScoreHourly(data.timestamp, scheduleData)
      };

      // 総合スコア計算（新しい重み配分）
      const totalScore =
        scores.temperature * this.weights.temperature +
        scores.temperatureDiff12h * this.weights.temperatureDiff12h +
        scores.humidity * this.weights.humidity +
        scores.illumination * this.weights.illumination +
        scores.airQuality * this.weights.airQuality +
        scores.pressure * this.weights.pressure +
        scores.schedule * this.weights.schedule;

      results.push({
        timestamp: data.timestamp,
        hour: data.hour,
        date: data.date,
        totalScore: Math.round(totalScore),
        factorScores: scores,
        weatherData: {
          temperature: data.temperature,
          humidity: data.humidity,
          pressure: data.pressure,
          cloudiness: data.cloudiness,
          windSpeed: data.windSpeed,
          weatherDescription: data.weatherDescription
        },
        tempDiff12h: Math.round(tempDiff12h * 10) / 10
      });
    }

    return results;
  }

  /**
   * 過去12時間の気温差を計算
   */
  calculateTempDiff12h(past12hData) {
    if (past12hData.length === 0) return 0;

    const temps = past12hData.map(d => d.temperature).filter(t => typeof t === 'number' && !isNaN(t));
    if (temps.length === 0) return 0;

    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);

    return maxTemp - minTemp;
  }

  /**
   * 気温差スコア（過去12時間の気温差が5℃以上で減点）
   */
  calculateTempDiffScore(tempDiff12h) {
    // 5℃以内: 100点（問題なし）
    if (tempDiff12h <= 5) {
      return 100;
    }

    // 5℃超過: 1℃あたり10点減点
    const penalty = (tempDiff12h - 5) * 10;
    const score = 100 - penalty;

    return Math.max(0, score); // 最低0点
  }

  /**
   * 日照スコア（日没後対応版）
   * 日中（6:00-18:00）のみ、日没後は中立値を返す
   */
  calculateSunshineScoreHourly(cloudCoverage, hour) {
    const sunrise = 6;
    const sunset = 18;

    // 日中（6:00-18:00）以外は夜間扱い
    if (hour < sunrise || hour >= sunset) {
      return 70; // 夜間は日照の影響なし（中立値）
    }

    // 日中は雲量ベースでスコア計算
    if (cloudCoverage <= 20) return 100; // 快晴
    if (cloudCoverage <= 40) return 90;  // 晴れ
    if (cloudCoverage <= 60) return 70;  // 曇り
    if (cloudCoverage <= 80) return 50;  // 曇天
    return 40;                            // 厚い雲
  }

  /**
   * スケジュールスコア（時間別版）
   * 該当時刻に予定があれば0点、なければ100点
   */
  calculateScheduleScoreHourly(timestamp, scheduleData) {
    // scheduleData の形式: [{ start: '2026-02-10T09:00:00Z', end: '...' }]
    if (!scheduleData || scheduleData.length === 0) {
      return 100; // 予定がない場合は100点
    }

    const targetTime = new Date(timestamp);

    // 該当時刻に予定があるか確認
    const hasEvent = scheduleData.some(event => {
      let start, end;

      // start/end が ISO文字列の場合
      if (typeof event.start === 'string') {
        start = new Date(event.start);
        end = new Date(event.end);
      } else if (event.start instanceof Date) {
        start = event.start;
        end = event.end;
      } else {
        return false;
      }

      // 対象時間が予定の時間帯に含まれるか確認
      return targetTime >= start && targetTime < end;
    });

    return hasEvent ? 0 : 100; // 予定あり=0点、なし=100点
  }

  /**
   * 複数日の体調スコアを計算
   * 予報データから各日の体調スコアを計算
   */
  calculateMultiDayScores(forecastArray) {
    return forecastArray.map(dayData => {
      const score = this.calculateTotalScore({
        temperature: (dayData.tempMax + dayData.tempMin) / 2,
        temperatureMax: dayData.tempMax,
        temperatureMin: dayData.tempMin,
        humidity: dayData.humidityAvg,
        cloudCoverage: dayData.cloudAvg,
        aqi: dayData.aqi || 50,
        pressure: dayData.pressureAvg,
        hasOutdoorPlans: false,
        scheduleAnalysis: { hasEvents: false, hasMeetings: false, hasOutdoorActivities: false, sleepInterruption: false, mealInterruption: false },
        hour: 12 // デフォルト12時で評価
      });

      return {
        date: dayData.date,
        ...score
      };
    });
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
