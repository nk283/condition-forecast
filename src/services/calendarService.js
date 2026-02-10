const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class CalendarService {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.oauth2Client = null;
    this.calendar = null;
    this.tokenPath = path.join(__dirname, '../../token.json');
  }

  /**
   * OAuth2 クライアントを初期化
   */
  initOAuth2Client() {
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    // トークンが保存されている場合は読み込む
    if (fs.existsSync(this.tokenPath)) {
      const token = JSON.parse(fs.readFileSync(this.tokenPath));
      this.oauth2Client.setCredentials(token);
    }
  }

  /**
   * Google Calendar API クライアントを初期化
   */
  initCalendarClient() {
    if (!this.oauth2Client) {
      this.initOAuth2Client();
    }
    this.calendar = google.calendar({
      version: 'v3',
      auth: this.oauth2Client
    });
  }

  /**
   * 認証 URL を取得
   */
  getAuthUrl() {
    if (!this.oauth2Client) {
      this.initOAuth2Client();
    }
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly']
    });
  }

  /**
   * 認証済みか確認
   */
  isAuthenticated() {
    return fs.existsSync(this.tokenPath);
  }

  /**
   * トークンが有効か確認
   */
  hasValidToken() {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const token = JSON.parse(fs.readFileSync(this.tokenPath));
      // トークンの有効期限チェック
      if (token.expiry_date && new Date(token.expiry_date) < new Date()) {
        return false; // 期限切れ
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * トークンをリフレッシュ（認証コードから新規取得）
   */
  async refreshToken(code) {
    if (!this.oauth2Client) {
      this.initOAuth2Client();
    }
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
  }

  /**
   * トークンを自動更新（リフレッシュトークンを使用）
   */
  async autoRefreshToken() {
    try {
      if (!this.oauth2Client) {
        this.initOAuth2Client();
      }

      const token = JSON.parse(fs.readFileSync(this.tokenPath));
      this.oauth2Client.setCredentials(token);

      // トークンをリフレッシュ
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const updatedToken = {
        ...credentials,
        refresh_token: credentials.refresh_token || token.refresh_token
      };

      fs.writeFileSync(this.tokenPath, JSON.stringify(updatedToken));
      this.oauth2Client.setCredentials(updatedToken);
      return true;
    } catch (error) {
      console.error('トークン自動更新エラー:', error.message);
      return false;
    }
  }

  /**
   * 指定期間のイベントを取得
   */
  async getEvents(startDate, endDate) {
    try {
      if (!this.calendar) {
        this.initCalendarClient();
      }

      // トークンが期限切れの場合は自動更新
      if (!this.hasValidToken()) {
        const refreshed = await this.autoRefreshToken();
        if (!refreshed) {
          throw new Error('トークンの更新に失敗しました。もう一度認証してください。');
        }
        this.initCalendarClient(); // トークン更新後にクライアントを再初期化
      }

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('カレンダーデータ取得エラー:', error.message);
      throw error;
    }
  }

  /**
   * 特定日の予定を取得
   */
  async getEventsForDate(date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    return this.getEvents(startDate, endDate);
  }

  /**
   * 72時間（昨日24h + 今日24h + 明日24h）の予定を取得
   * 時刻情報を保持したまま返す（1時間単位のスコア計算用）
   */
  async getScheduleFor72h() {
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 昨日
      const endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);   // 明後日

      const events = await this.getEvents(startTime, endTime);

      // 時刻情報を保持したまま返す
      return events
        .filter(event => event.start && event.end) // 無効なイベントを除外
        .map(event => ({
          summary: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          type: this.classifyEventType(event.summary, event.description || '')
        }));
    } catch (error) {
      console.warn('72時間予定取得エラー:', error.message);
      return []; // エラー時は空配列を返す
    }
  }

  /**
   * イベント種別を分類（内部ヘルパー）
   */
  classifyEventType(summary, description) {
    const text = (summary + description).toLowerCase();

    if (text.includes('会') || text.includes('meeting') || text.includes('打ち合わせ')) {
      return 'meeting';
    }
    if (text.includes('外出') || text.includes('outdoor') || text.includes('出張')) {
      return 'outdoor';
    }
    if (text.includes('寝') || text.includes('睡眠') || text.includes('sleep')) {
      return 'sleep';
    }
    if (text.includes('食') || text.includes('meal') || text.includes('食事')) {
      return 'meal';
    }

    return 'other';
  }

  /**
   * 予定の詳細情報を解析
   */
  analyzeSchedule(events) {
    const analysis = {
      hasEvents: events.length > 0,
      eventCount: events.length,
      hasMeetings: false,
      hasOutdoorActivities: false,
      sleepInterruption: false,
      mealInterruption: false,
      events: []
    };

    events.forEach(event => {
      const eventDetail = {
        title: event.summary,
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        isAllDay: !event.start.dateTime,
        description: event.description || ''
      };

      // キーワードで自動判定
      const title = (event.summary + event.description).toLowerCase();

      if (title.includes('会') || title.includes('meeting') || title.includes('打ち合わせ')) {
        analysis.hasMeetings = true;
        eventDetail.type = 'meeting';
      }

      if (title.includes('外出') || title.includes('outdoor') || title.includes('出張')) {
        analysis.hasOutdoorActivities = true;
        eventDetail.type = 'outdoor';
      }

      if (title.includes('寝') || title.includes('睡眠') || title.includes('sleep')) {
        analysis.sleepInterruption = true;
        eventDetail.type = 'sleep';
      }

      if (title.includes('食') || title.includes('meal') || title.includes('食事')) {
        analysis.mealInterruption = true;
        eventDetail.type = 'meal';
      }

      analysis.events.push(eventDetail);
    });

    return analysis;
  }
}

module.exports = CalendarService;
