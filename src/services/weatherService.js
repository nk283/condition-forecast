const axios = require('axios');

class WeatherService {
  constructor(apiKey, lat, lon) {
    this.apiKey = apiKey;
    this.lat = lat;
    this.lon = lon;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
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
   * 72時間（昨日24h + 今日24h + 明日24h）の1時間刻みデータを取得
   * 3時間間隔の予報データから線形補間で1時間刻みデータを生成
   */
  async getHourlyForecast72h() {
    try {
      const forecast3h = await this.getForecast();

      // 現在時刻から-24h ～ +48h の範囲を計算
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 昨日
      const endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);   // 明後日

      const hourlyData = [];

      // 1時間刻みの配列を生成（72時間分）
      for (let i = 0; i < 72; i++) {
        const targetTime = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        const interpolatedData = this.interpolateWeatherData(forecast3h, targetTime);

        hourlyData.push({
          timestamp: targetTime.toISOString(),
          hour: targetTime.getHours(),
          date: targetTime.toLocaleDateString('ja-JP'),
          dateObj: targetTime,
          ...interpolatedData
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
   * 3時間データから1時間データへの線形補間
   */
  interpolateWeatherData(forecast3h, targetTime) {
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
    const targetDiff = targetTimeUnix - beforeTime;
    const ratio = targetDiff / totalDiff; // 0.0 ～ 1.0

    // 各要因を補間
    return {
      temperature: this.lerp(before.temperature, after.temperature, ratio),
      humidity: this.lerp(before.humidity, after.humidity, ratio),
      pressure: this.lerp(before.pressure, after.pressure, ratio),
      cloudiness: before.cloudiness, // 雲量はStep補間（変化が急なため）
      windSpeed: this.lerp(before.windSpeed, after.windSpeed, ratio),
      feelsLike: this.lerp(before.feelsLike, after.feelsLike, ratio),
      visibility: this.lerp(before.visibility, after.visibility, ratio),
      rainVolume: before.rainVolume, // 降雨量もStep補間
      weatherMain: before.weatherMain,
      weatherDescription: before.weatherDescription,
      weatherIcon: before.weatherIcon
    };
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
    return closest ? {
      temperature: closest.temperature,
      humidity: closest.humidity,
      pressure: closest.pressure,
      cloudiness: closest.cloudiness,
      windSpeed: closest.windSpeed,
      feelsLike: closest.feelsLike,
      visibility: closest.visibility,
      rainVolume: closest.rainVolume,
      weatherMain: closest.weatherMain,
      weatherDescription: closest.weatherDescription,
      weatherIcon: closest.weatherIcon
    } : null;
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
