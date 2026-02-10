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
