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
   * 気温スコアを計算（段階的なロジック）
   * 5℃以上: 100点（最適）
   * 5℃～0℃: 1℃下がるごとに10点減点（5℃=100点, 0℃=50点）
   * 0℃～-5℃: 1℃下がるごとに10点減点（0℃=50点, -5℃=0点）
   * -5℃以下: 0点
   */
  calculateTemperatureScore(temp) {
    if (temp >= 5) {
      // 5℃以上は100点（最適）
      return 100;
    }

    if (temp >= 0 && temp < 5) {
      // 5℃～0℃: 1℃下がるごとに10点減点
      // 5℃=100点, 4℃=90点, 3℃=80点, ..., 0℃=50点
      return 100 - (5 - temp) * 10;
    }

    if (temp >= -5 && temp < 0) {
      // 0℃～-5℃: 1℃下がるごとに10点減点
      // 0℃=50点, -1℃=40点, ..., -5℃=0点
      return 50 - (0 - temp) * 10;
    }

    // -5℃以下: 0点
    return 0;
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
   * sunriseHour: 日の出時刻（時間、例: 6.5 = 6:30）
   * sunsetHour: 日没時刻（時間、例: 17.5 = 17:30）
   *
   * 【スコア計算ルール】
   * 雲量と日照スコアは逆比例
   * - 雲量 0% → スコア 100点（快晴）
   * - 雲量 50% → スコア 50点（半曇り）
   * - 雲量 100% → スコア 0点（完全曇天）
   *
   * 計算式: スコア = 100 - 雲量(%)
   *
   * 夜間は日照の影響を受けないため常に50点（中立値）
   * ※ 日の出・日没時間がない場合は、デフォルト: 18時～6時を夜間とする
   */
  calculateIlluminationScore(cloudCoverage, hour, sunriseHour = null, sunsetHour = null) {
    // 日の出・日没時間のデフォルト値（冬時間対応: 18時～6時を夜間）
    const sunrise = sunriseHour !== null ? sunriseHour : 6;
    const sunset = sunsetHour !== null ? sunsetHour : 18;

    // 夜間判定：日没～日出までを夜間
    const isNight = hour < sunrise || hour >= sunset;

    if (isNight) {
      return 50; // 夜間は日照の影響なし（中立値50点）
    }

    // 日中：雲量とスコアが逆比例
    // スコア = 100 - 雲量(%)
    const score = 100 - cloudCoverage;
    return Math.max(0, Math.round(score));
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
   * 気圧スコアを計算（絶対値ベース）
   *
   * 【気圧と体調の関係】
   * 低気圧では血管拡張、気分低下、頭痛などが増加
   * 1015 hPa以上は快適で、下がるごとに体調が悪化
   *
   * 【スコア計算式】
   * - 1015 hPa以上 → 100点（1025, 1030でも100点）
   * - 1015 hPaから990 hPaへ直線的に低下
   * - 990 hPa以下 → 0点
   *
   * 計算式: max(0, 100 * (1015 - pressure) / 25)
   * ※ 990 = 1015 - 25 のため
   *
   * 【具体例】
   * - 1015 hPa → 100点（基準点、快適）
   * - 1010 hPa → 80点
   * - 1005 hPa → 60点
   * - 1000 hPa → 40点
   * - 995 hPa → 20点
   * - 990 hPa → 0点（下限）
   * - 985 hPa → 0点（0点以下は切り上げ）
   */
  calculatePressureScore(pressure) {
    // 1015 hPa以上は常に100点
    if (pressure >= 1015) {
      return 100;
    }

    // 1015 hPaから990 hPaへ直線的に低下（25 hPaで100点低下）
    // スコア = 100 * (1015 - 実際の気圧) / 25
    const score = 100 - (1015 - pressure) * 4; // (1015 - pressure) / 25 * 100 = (1015 - pressure) * 4

    return Math.max(0, Math.round(score));
  }

  /**
   * 気圧差スコアを計算（過去12時間）
   *
   * 【気圧変動と体調の関係】
   * 気圧が急激に変わると体調が悪くなる
   * 気圧差が大きいほどスコアが低い
   *
   * 【スコア計算ルール】
   * - 気圧差 0 hPa → 100点（変化なし、快適）
   * - 気圧差 5 hPa → 100点（許容範囲）
   * - 気圧差 10 hPa → 80点
   * - 気圧差 15 hPa → 60点
   * - 気圧差 20 hPa → 40点
   * - 気圧差 25 hPa以上 → 0点
   *
   * 計算式: max(0, 100 - (差 - 5) * 4)
   * ※ 5 hPa以下は減点なし、それ以降は5 hPaあたり20点減点
   */
  calculatePressureDifferenceScore(pressureDifference) {
    // 5 hPa以下は影響なし
    if (pressureDifference <= 5) {
      return 100;
    }

    // 5 hPaを超える部分で減点
    // 1 hPaあたり4点減点（20 hPa余分で80点減点）
    const score = 100 - (pressureDifference - 5) * 4;

    return Math.max(0, Math.round(score));
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

      // データが null の場合も結果配列に含める（ギャップとして記録）
      if (data.temperature === null || data.temperature === undefined ||
          data.humidity === null || data.humidity === undefined ||
          data.pressure === null || data.pressure === undefined ||
          data.cloudiness === null || data.cloudiness === undefined) {
        // データなしのオブジェクトを作成（グラフでギャップになる）
        results.push({
          timestamp: data.timestamp,
          hour: data.hour,
          date: data.date,
          totalScore: null,
          factorScores: null,  // null を明示的に設定
          weatherData: null,
          tempDiff12h: null,
          pressureDiff12h: null
        });
        continue;
      }

      // 過去12時間の気温データと気圧データを取得（ i-12 ～ i）
      const past12hStart = Math.max(0, i - 12);
      const past12h = hourlyData.slice(past12hStart, i + 1)
        .filter(d => d.temperature !== null && d.temperature !== undefined); // null データを除外
      const tempDiff12h = this.calculateTempDiff12h(past12h);
      const pressureDiff12h = this.calculatePressureDiff12h(past12h);

      // 各要因のスコア計算
      const scores = {
        temperature: this.calculateTemperatureScore(data.temperature),
        temperatureDiff12h: this.calculateTempDiffScore(tempDiff12h),
        humidity: this.calculateHumidityScore(data.humidity, data.temperature),
        illumination: this.calculateSunshineScoreHourly(
          data.cloudiness,
          data.hour,
          data.sunriseHour,  // 気象データから日の出時間を取得
          data.sunsetHour    // 気象データから日没時間を取得
        ),
        airQuality: this.calculateAirQualityScore(aqi, false), // 屋内判定は常にfalse（屋外活動を想定）
        pressure: this.calculatePressureScore(data.pressure),
        pressureDifference: this.calculatePressureDifferenceScore(pressureDiff12h),
        schedule: this.calculateScheduleScoreHourly(data.timestamp, scheduleData)
      };

      // 総合スコア計算（新しい重み配分）
      // 注: 気圧差は新規追加だが、重みはまだ定義されていないため、今は計算に含めない
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
        tempDiff12h: Math.round(tempDiff12h * 10) / 10,
        pressureDiff12h: Math.round(pressureDiff12h * 10) / 10
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
   * 過去12時間の気圧差を計算
   */
  calculatePressureDiff12h(past12hData) {
    if (past12hData.length === 0) return 0;

    const pressures = past12hData.map(d => d.pressure).filter(p => typeof p === 'number' && !isNaN(p));
    if (pressures.length === 0) return 0;

    const maxPressure = Math.max(...pressures);
    const minPressure = Math.min(...pressures);

    return maxPressure - minPressure;
  }

  /**
   * 日照スコア（日没後対応版）
   * 日の出・日没時間を指定して、その時間帯のみ日照スコアを計算
   *
   * @param {number} cloudCoverage - 雲量（0～100%）
   * @param {number} hour - 時刻（0-23）
   * @param {number} sunriseHour - 日の出時刻（時間、デフォルト: 6）
   * @param {number} sunsetHour - 日没時刻（時間、デフォルト: 18）
   *
   * 【スコア計算ルール】
   * 雲量と日照スコアは逆比例
   * - 雲量 0% → スコア 100点（快晴）
   * - 雲量 50% → スコア 50点（半曇り）
   * - 雲量 100% → スコア 0点（完全曇天）
   *
   * 計算式: スコア = 100 - 雲量(%)
   * 夜間は常に50点（中立値）
   *
   * 【デフォルト時間帯】
   * 冬季に対応した 6:00（日の出） ～ 18:00（日没）
   */
  calculateSunshineScoreHourly(cloudCoverage, hour, sunriseHour = 6, sunsetHour = 18) {
    // 夜間判定：日没～日出までを夜間
    const isNight = hour < sunriseHour || hour >= sunsetHour;

    if (isNight) {
      return 50; // 夜間は日照の影響なし（中立値50点）
    }

    // 日中：雲量とスコアが逆比例
    // スコア = 100 - 雲量(%)
    const score = 100 - cloudCoverage;
    return Math.max(0, Math.round(score));
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
