const axios = require('axios');
const DataStorage = require('../utils/dataStorage');

class WeatherService {
  constructor(apiKey, lat, lon) {
    this.apiKey = apiKey;
    this.lat = lat;
    this.lon = lon;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.dataStorage = new DataStorage(); // 過去データ取得用
  }

  /**
   * 現在の天気データを取得
   */
  async getCurrentWeather() {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat: this.lat,
          lon: this.lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'ja'
        }
      });
      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('天気データ取得エラー:', error.message);
      throw error;
    }
  }

  /**
   * 予報データを取得（5日間、3時間ごと）
   */
  async getForecast() {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: this.lat,
          lon: this.lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'ja'
        }
      });
      return response.data.list.map(item => this.formatWeatherData(item));
    } catch (error) {
      console.error('予報データ取得エラー:', error.message);
      throw error;
    }
  }

  /**
   * 空気質データを取得
   */
  async getAirQuality() {
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/3.0/stations`, {
        params: {
          lat: this.lat,
          lon: this.lon,
          appid: this.apiKey
        }
      });
      // 注: OpenWeather の Air Quality API は有料版が必要
      // ここでは簡易実装
      return this.getAQI();
    } catch (error) {
      console.error('空気質データ取得エラー:', error.message);
      return null;
    }
  }

  /**
   * 空気質指数（AQI）を取得
   */
  async getAQI() {
    try {
      const response = await axios.get('https://api.waqi.info/feed/geo:37.7749;-122.4194', {
        params: {
          token: this.apiKey // 代替 API キー（World Air Quality Index）
        }
      });
      return response.data.data;
    } catch (error) {
      console.warn('AQI 取得エラー:', error.message);
      return null;
    }
  }

  /**
   * 5日間予報を1日ごとに集約
   */
  async getForecastByDay() {
    try {
      const forecastList = await this.getForecast();
      return this.aggregateForecastByDay(forecastList);
    } catch (error) {
      console.error('予報データ集約エラー:', error.message);
      throw error;
    }
  }

  /**
   * 72時間（昨日00:00 ～ 明日23:00）の1時間刻みデータを取得
   * 3時間間隔の予報データから線形補間で1時間刻みデータを生成
   * 開始時刻: 昨日の00:00:00に固定（ローカルタイムゾーン）
   *
   * 注: OpenWeather 無料APIは現在時刻から5日先までの予報データのみ提供
   * そのため、昨日のデータはデフォルト値で補完します
   */
  async getHourlyForecast72h() {
    try {
      const forecast3h = await this.getForecast();
      const now = new Date();

      // 昨日の00:00:00をローカルタイムで設定
      const startTime = new Date(now);
      startTime.setHours(0, 0, 0, 0);
      startTime.setDate(startTime.getDate() - 1); // 昨日に設定

      // 今日の00:00:00を計算（昨日と今日の境界）
      const todayStart = new Date(startTime);
      todayStart.setDate(todayStart.getDate() + 1);

      const hourlyData = [];

      // 1時間刻みの配列を生成（72時間分）
      // 昨日00:00 ～ 明日23:00（72時間）
      for (let i = 0; i < 72; i++) {
        const targetTime = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        const localDateTime = this.formatLocalDateTime(targetTime);

        let weatherData;

        // *** 重要な分岐 ***
        if (targetTime < todayStart) {
          // 【昨日のデータ】過去ファイルから取得を試みる
          weatherData = this.getYesterdayWeatherFromStorage(targetTime);

          // 過去ファイルにデータがない場合のみ、予報データで補間（初回実行時など）
          if (!weatherData) {
            weatherData = this.interpolateWeatherData(forecast3h, targetTime);
          }
        } else {
          // 【今日以降のデータ】予報APIから補間
          weatherData = this.interpolateWeatherData(forecast3h, targetTime);
        }

        hourlyData.push({
          timestamp: localDateTime,
          hour: targetTime.getHours(),
          date: targetTime.toLocaleDateString('ja-JP'),
          dateObj: targetTime,
          ...weatherData
        });
      }

      console.log(`✅ 72時間の1時間刻みデータを生成しました (${hourlyData.length}件)`);
      return hourlyData;
    } catch (error) {
      console.error('72時間データ取得エラー:', error.message);
      throw error;
    }
  }

  /**
   * 昨日の天気データを過去ファイルから取得
   * @param {Date} targetTime - 取得したい時刻
   * @returns {Object|null} 天気データ、またはnull（ファイルに存在しない場合）
   */
  getYesterdayWeatherFromStorage(targetTime) {
    try {
      // 昨日00:00 ～ 昨日23:59 のデータを取得
      const yesterday = new Date(targetTime);
      yesterday.setHours(0, 0, 0, 0);

      const tomorrowStart = new Date(yesterday);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      // 過去データから昨日のスコアを取得
      const yesterdayScores = this.dataStorage.getHourlyScores(yesterday, tomorrowStart);

      if (yesterdayScores.length === 0) {
        // 過去データがない場合は null を返す
        return null;
      }

      // targetTime に最も近いスコアを見つける
      const targetUnix = targetTime.getTime() / 1000;
      let closestScore = null;
      let minDiff = Infinity;

      for (const score of yesterdayScores) {
        const scoreTime = new Date(score.timestamp).getTime() / 1000;
        const diff = Math.abs(scoreTime - targetUnix);
        if (diff < minDiff) {
          minDiff = diff;
          closestScore = score;
        }
      }

      if (closestScore && closestScore.weatherData) {
        // 過去データから天気情報を復元
        return {
          temperature: closestScore.weatherData.temperature || 15,
          humidity: closestScore.weatherData.humidity || 60,
          pressure: closestScore.weatherData.pressure || 1013,
          cloudiness: closestScore.weatherData.cloudiness || 50,
          windSpeed: closestScore.weatherData.windSpeed || 5,
          feelsLike: closestScore.weatherData.feelsLike || 15,
          visibility: closestScore.weatherData.visibility || 10000,
          rainVolume: closestScore.weatherData.rainVolume || 0,
          weatherMain: closestScore.weatherData.weatherMain || 'Clouds',
          weatherDescription: closestScore.weatherData.weatherDescription || '曇り',
          weatherIcon: closestScore.weatherData.weatherIcon || '04d'
        };
      }

      return null;
    } catch (error) {
      console.warn('過去データ取得エラー:', error.message);
      return null; // エラー時は null を返して、予報データで補間させる
    }
  }

  /**
   * 3時間データから1時間データへの線形補間
   */
  interpolateWeatherData(forecast3h, targetTime) {
    // 予報データが空の場合
    if (!forecast3h || forecast3h.length === 0) {
      return this.useClosestData([], targetTime);
    }

    // targetTime の前後の3時間データを取得
    const before = this.findClosestBefore(forecast3h, targetTime);
    const after = this.findClosestAfter(forecast3h, targetTime);

    if (!before || !after) {
      // 範囲外の場合: 最も近いデータを使用
      return this.useClosestData(forecast3h, targetTime);
    }

    // 線形補間比率を計算
    const beforeTime = before.timestamp.getTime() / 1000;
    const afterTime = after.timestamp.getTime() / 1000;
    const targetTimeUnix = targetTime.getTime() / 1000;

    const totalDiff = afterTime - beforeTime; // 秒単位

    // totalDiff が 0 の場合（before と after が同じ時刻）は補間不可
    if (totalDiff === 0) {
      return {
        temperature: before.temperature || 15,
        humidity: before.humidity || 60,
        pressure: before.pressure || 1013,
        cloudiness: before.cloudiness || 50,
        windSpeed: before.windSpeed || 5,
        feelsLike: before.feelsLike || 15,
        visibility: before.visibility || 10000,
        rainVolume: before.rainVolume || 0,
        weatherMain: before.weatherMain || 'Clouds',
        weatherDescription: before.weatherDescription || '曇り',
        weatherIcon: before.weatherIcon || '04d'
      };
    }

    const targetDiff = targetTimeUnix - beforeTime;
    const ratio = targetDiff / totalDiff; // 0.0 ～ 1.0

    // 各要因を補間
    const interpolated = {
      temperature: this.lerp(before.temperature || 15, after.temperature || 15, ratio),
      humidity: this.lerp(before.humidity || 60, after.humidity || 60, ratio),
      pressure: this.lerp(before.pressure || 1013, after.pressure || 1013, ratio),
      cloudiness: before.cloudiness || 50, // 雲量はStep補間（変化が急なため）
      windSpeed: this.lerp(before.windSpeed || 5, after.windSpeed || 5, ratio),
      feelsLike: this.lerp(before.feelsLike || 15, after.feelsLike || 15, ratio),
      visibility: this.lerp(before.visibility || 10000, after.visibility || 10000, ratio),
      rainVolume: before.rainVolume || 0, // 降雨量もStep補間
      weatherMain: before.weatherMain || 'Clouds',
      weatherDescription: before.weatherDescription || '曇り',
      weatherIcon: before.weatherIcon || '04d'
    };

    // NaN チェック: 計算結果が NaN なら before のデータを使用
    if (isNaN(interpolated.temperature) || isNaN(interpolated.humidity)) {
      return {
        temperature: before.temperature || 15,
        humidity: before.humidity || 60,
        pressure: before.pressure || 1013,
        cloudiness: before.cloudiness || 50,
        windSpeed: before.windSpeed || 5,
        feelsLike: before.feelsLike || 15,
        visibility: before.visibility || 10000,
        rainVolume: before.rainVolume || 0,
        weatherMain: before.weatherMain || 'Clouds',
        weatherDescription: before.weatherDescription || '曇り',
        weatherIcon: before.weatherIcon || '04d'
      };
    }

    return interpolated;
  }

  /**
   * ローカルタイムを YYYY-MM-DD HH:mm:ss 形式で返す
   */
  formatLocalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * 線形補間ヘルパー関数
   * v0: 開始値、v1: 終了値、t: 補間比率（0.0-1.0）
   */
  lerp(v0, v1, t) {
    return v0 * (1 - t) + v1 * t;
  }

  /**
   * targetTime より前で最も近いデータを検索
   */
  findClosestBefore(forecastList, targetTime) {
    const targetUnix = targetTime.getTime() / 1000;
    let closest = null;
    let maxDiff = Infinity;

    for (const item of forecastList) {
      const itemUnix = item.timestamp.getTime() / 1000;
      if (itemUnix <= targetUnix) {
        const diff = targetUnix - itemUnix;
        if (diff < maxDiff) {
          maxDiff = diff;
          closest = item;
        }
      }
    }

    return closest;
  }

  /**
   * targetTime より後で最も近いデータを検索
   */
  findClosestAfter(forecastList, targetTime) {
    const targetUnix = targetTime.getTime() / 1000;
    let closest = null;
    let minDiff = Infinity;

    for (const item of forecastList) {
      const itemUnix = item.timestamp.getTime() / 1000;
      if (itemUnix >= targetUnix) {
        const diff = itemUnix - targetUnix;
        if (diff < minDiff) {
          minDiff = diff;
          closest = item;
        }
      }
    }

    return closest;
  }

  /**
   * 範囲外のデータに対して最も近いデータを使用
   * データがない場合はデフォルト値を返す
   */
  useClosestData(forecastList, targetTime) {
    const targetUnix = targetTime.getTime() / 1000;
    let closest = null;
    let minDiff = Infinity;

    for (const item of forecastList) {
      const itemUnix = item.timestamp.getTime() / 1000;
      const diff = Math.abs(itemUnix - targetUnix);
      if (diff < minDiff) {
        minDiff = diff;
        closest = item;
      }
    }

    // closest から新規オブジェクトを返す
    if (closest) {
      return {
        temperature: closest.temperature || 15,
        humidity: closest.humidity || 60,
        pressure: closest.pressure || 1013,
        cloudiness: closest.cloudiness || 50,
        windSpeed: closest.windSpeed || 5,
        feelsLike: closest.feelsLike || 15,
        visibility: closest.visibility || 10000,
        rainVolume: closest.rainVolume || 0,
        weatherMain: closest.weatherMain || 'Clouds',
        weatherDescription: closest.weatherDescription || '曇り',
        weatherIcon: closest.weatherIcon || '04d'
      };
    }

    // 予報データが完全にない場合のデフォルト値
    return {
      temperature: 15,
      humidity: 60,
      pressure: 1013,
      cloudiness: 50,
      windSpeed: 5,
      feelsLike: 15,
      visibility: 10000,
      rainVolume: 0,
      weatherMain: 'Clouds',
      weatherDescription: '曇り',
      weatherIcon: '04d'
    };
  }

  /**
   * 予報リストを1日ごとに集約する
   * 各日の最高気温、最低気温、平均雲量、平均湿度、平均気圧を計算
   */
  aggregateForecastByDay(forecastList) {
    const dailyData = {};

    // 3時間ごとのデータを日ごとに集約
    forecastList.forEach(item => {
      const date = item.timestamp.toISOString().split('T')[0]; // "YYYY-MM-DD"

      if (!dailyData[date]) {
        dailyData[date] = {
          date: date,
          tempMax: -Infinity,
          tempMin: Infinity,
          tempCurrent: item.temperature,
          cloudAvg: 0,
          humidityAvg: 0,
          pressureAvg: 0,
          rainTotal: 0,
          count: 0,
          items: []
        };
      }

      const data = dailyData[date];
      data.tempMax = Math.max(data.tempMax, item.temperature);
      data.tempMin = Math.min(data.tempMin, item.temperature);
      data.cloudAvg += item.cloudiness;
      data.humidityAvg += item.humidity;
      data.pressureAvg += item.pressure;
      data.rainTotal += item.rainVolume;
      data.count++;
      data.items.push(item);
    });

    // 平均値を計算し、配列に変換
    const result = [];
    Object.keys(dailyData)
      .sort()
      .forEach(date => {
        const data = dailyData[date];
        data.cloudAvg = Math.round(data.cloudAvg / data.count);
        data.humidityAvg = Math.round(data.humidityAvg / data.count);
        data.pressureAvg = Math.round(data.pressureAvg / data.count);
        data.aqi = 50; // デフォルト値（実際の空気質データがない場合）

        // 予報最初の日は除外（不完全なデータ）
        if (data.count > 4) {
          result.push(data);
        }
      });

    return result;
  }

  /**
   * 天気データをフォーマット
   */
  formatWeatherData(data) {
    return {
      timestamp: data.dt ? new Date(data.dt * 1000) : new Date(),
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      cloudiness: data.clouds.all,
      visibility: data.visibility,
      rainVolume: data.rain?.['1h'] || 0,
      snowVolume: data.snow?.['1h'] || 0,
      uvi: data.uvi || null,
      weatherMain: data.weather[0].main,
      weatherDescription: data.weather[0].description,
      weatherIcon: data.weather[0].icon
    };
  }
}

module.exports = WeatherService;
