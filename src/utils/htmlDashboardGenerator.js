const fs = require('fs');
const path = require('path');

/**
 * HTML ダッシュボード生成クラス
 */
class HtmlDashboardGenerator {
  constructor(outputPath = 'dashboard.html') {
    this.outputPath = outputPath;
  }

  /**
   * ダッシュボードを生成
   */
  generateDashboard(report, weatherData, scheduleAnalysis, historicalData = {}, forecastData = {}) {
    const html = this.generateHtml(
      report,
      weatherData,
      scheduleAnalysis,
      historicalData,
      forecastData
    );

    fs.writeFileSync(this.outputPath, html);
    return this.outputPath;
  }

  /**
   * HTML を生成
   */
  generateHtml(report, weatherData, scheduleAnalysis, historicalData, forecastData = {}) {
    const dates = Object.keys(historicalData).sort();
    const scores = dates.map(d => historicalData[d].totalScore);

    // 未来データを準備
    const forecastDates = Object.keys(forecastData).sort();
    const forecastScores = forecastDates.map(d => forecastData[d].totalScore);

    const evaluationColor = this.getEvaluationColor(report.json.score.total);

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>体調予報ダッシュボード</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }

    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    header p {
      font-size: 1.1em;
      opacity: 0.9;
    }

    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
    }

    .card h2 {
      font-size: 1.3em;
      color: #333;
      margin-bottom: 15px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    /* スコアカード */
    .score-card {
      text-align: center;
      grid-column: 1 / -1;
    }

    .score-value {
      font-size: 4em;
      font-weight: bold;
      color: ${evaluationColor};
      margin: 20px 0;
    }

    .score-evaluation {
      font-size: 1.5em;
      color: #666;
      margin: 10px 0;
    }

    .score-advice {
      background: #f0f4ff;
      padding: 15px;
      border-radius: 8px;
      color: #333;
      line-height: 1.6;
    }

    /* ゲージスタイル */
    .gauge-container {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 20px 0;
    }

    .gauge {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: conic-gradient(
        ${evaluationColor} 0deg,
        ${evaluationColor} ${(report.json.score.total / 100) * 360}deg,
        #e0e0e0 ${(report.json.score.total / 100) * 360}deg,
        #e0e0e0 360deg
      );
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2em;
      font-weight: bold;
      color: ${evaluationColor};
    }

    /* 要因スコア表示 */
    .factor-scores {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .factor-item {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }

    .factor-label {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 5px;
    }

    .factor-bar {
      height: 20px;
      background: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 5px;
    }

    .factor-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }

    .factor-value {
      font-size: 0.85em;
      color: #333;
      font-weight: bold;
    }

    /* チャートコンテナ */
    .chart-container {
      position: relative;
      height: 300px;
      margin: 20px 0;
    }

    /* 天気情報 */
    .weather-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .weather-item {
      background: #f0f4ff;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }

    .weather-label {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 8px;
    }

    .weather-value {
      font-size: 1.8em;
      font-weight: bold;
      color: #667eea;
    }

    /* 予定リスト */
    .schedule-list {
      list-style: none;
    }

    .schedule-item {
      background: #f9f9f9;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .schedule-time {
      font-size: 0.85em;
      color: #667eea;
      font-weight: bold;
      min-width: 60px;
    }

    .schedule-title {
      color: #333;
    }

    .schedule-type {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75em;
      margin-left: auto;
    }

    .schedule-empty {
      text-align: center;
      color: #999;
      padding: 20px;
    }

    /* リスク分析 */
    .risks-list {
      list-style: none;
    }

    .risk-item {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 6px;
    }

    .risk-factor {
      font-weight: bold;
      color: #856404;
      margin-bottom: 5px;
    }

    .risk-detail {
      color: #856404;
      font-size: 0.9em;
    }

    /* レスポンシブ */
    @media (max-width: 768px) {
      header h1 {
        font-size: 1.8em;
      }

      .score-value {
        font-size: 2.5em;
      }

      .dashboard {
        grid-template-columns: 1fr;
      }

      .factor-scores {
        grid-template-columns: 1fr;
      }

      .weather-grid {
        grid-template-columns: 1fr;
      }
    }

    footer {
      text-align: center;
      color: white;
      margin-top: 30px;
      opacity: 0.8;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌟 体調予報ダッシュボード</h1>
      <p>${new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })}</p>
    </header>

    <div class="dashboard">
      <!-- 総合スコアカード -->
      <div class="card score-card">
        <h2>📊 総合体調スコア</h2>
        <div class="gauge-container">
          <div class="gauge">
            <div style="text-align: center;">
              <div style="font-size: 0.5em; color: #666;">スコア</div>
              <div>${report.json.score.total}/100</div>
            </div>
          </div>
        </div>
        <div class="score-evaluation">
          ${report.json.score.evaluation}
        </div>
        <div class="score-advice">
          💡 ${report.json.score.advice}
        </div>
      </div>

      <!-- 各要因のスコア -->
      <div class="card">
        <h2>📈 各要因の詳細スコア</h2>
        <div class="factor-scores">
          ${this.generateFactorScores(report.json.factorScores)}
        </div>
      </div>

      <!-- 未来予報 -->
      ${forecastDates.length > 0 ? `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>🔮 未来5日間の体調予報</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
          ${forecastDates.map((date, idx) => {
            const forecastItem = forecastData[date];
            const dateObj = new Date(date);
            const dateLabel = dateObj.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
            const evaluation = this.getEvaluationEmoji(forecastItem.totalScore);
            return `
            <div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 12px; text-align: center; background: #f9f9f9;">
              <div style="font-weight: bold; color: #666; margin-bottom: 8px;">${dateLabel}</div>
              <div style="font-size: 1.8em; margin-bottom: 8px;">${forecastItem.totalScore}</div>
              <div style="font-size: 2em;">${evaluation}</div>
              <div style="font-size: 0.8em; color: #999; margin-top: 8px;">${this.getEvaluationLevel(forecastItem.totalScore)}</div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 時系列グラフ -->
      ${(dates.length > 1 || forecastDates.length > 0) ? `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>📉 スコアの推移（過去${dates.length}日間 + 未来${forecastDates.length}日間）</h2>
        <div class="chart-container">
          <canvas id="timeseriesChart"></canvas>
        </div>
      </div>
      ` : ''}

      <!-- 天気情報 -->
      <div class="card">
        <h2>🌤️ 天気情報</h2>
        <div class="weather-grid">
          <div class="weather-item">
            <div class="weather-label">気温</div>
            <div class="weather-value">${weatherData.temperature}℃</div>
          </div>
          <div class="weather-item">
            <div class="weather-label">体感気温</div>
            <div class="weather-value">${weatherData.feelsLike}℃</div>
          </div>
          <div class="weather-item">
            <div class="weather-label">湿度</div>
            <div class="weather-value">${weatherData.humidity}%</div>
          </div>
          <div class="weather-item">
            <div class="weather-label">気圧</div>
            <div class="weather-value">${weatherData.pressure}<br><span style="font-size: 0.5em;">hPa</span></div>
          </div>
        </div>
        <p style="margin-top: 15px; text-align: center; color: #666;">
          天気: ${weatherData.description}
        </p>
      </div>

      <!-- 予定一覧 -->
      <div class="card">
        <h2>📅 本日の予定</h2>
        ${this.generateScheduleList(scheduleAnalysis)}
      </div>

      <!-- リスク分析 -->
      ${report.json.risks.length > 0 ? `
      <div class="card">
        <h2>⚠️ リスク分析</h2>
        <ul class="risks-list">
          ${report.json.risks.map(risk => `
          <li class="risk-item">
            <div class="risk-factor">【${risk.factor}】</div>
            <div class="risk-detail">
              問題: ${risk.issue}<br>
              影響: ${risk.impact}
            </div>
          </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      <!-- 推奨事項 -->
      <div class="card">
        <h2>🎯 推奨事項</h2>
        <div style="line-height: 1.8; color: #333;">
          ${report.json.recommendations.split('\\n').map(r => r.trim()).filter(r => r).map(r => `<div style="margin-bottom: 8px;">✓ ${r.replace('• ', '')}</div>`).join('')}
        </div>
      </div>
    </div>

    <footer>
      <p>体調予報システム | 生成時刻: ${new Date().toLocaleString('ja-JP')}</p>
    </footer>
  </div>

  <script>
    // 時系列グラフを描画
    ${(dates.length > 1 || forecastDates.length > 0) ? this.generateTimeseriesChart(dates, scores, forecastDates, forecastScores) : ''}
  </script>
</body>
</html>`;

    return html;
  }

  /**
   * 各要因のスコア HTML を生成
   */
  generateFactorScores(factorScores) {
    const factors = [
      { label: '🌡️ 気温', key: 'temperature' },
      { label: '💧 湿度', key: 'humidity' },
      { label: '☀️ 日照', key: 'illumination' },
      { label: '💨 空気質', key: 'airQuality' },
      { label: '🎈 気圧', key: 'pressure' },
      { label: '📅 スケジュール', key: 'schedule' }
    ];

    return factors.map(factor => {
      const score = factorScores[factor.key];
      const color = this.getScoreColor(score);

      return `
        <div class="factor-item">
          <div class="factor-label">${factor.label}</div>
          <div class="factor-bar">
            <div class="factor-bar-fill" style="width: ${score}%; background: ${color};"></div>
          </div>
          <div class="factor-value">${score}/100</div>
        </div>
      `;
    }).join('');
  }

  /**
   * 予定一覧 HTML を生成
   */
  generateScheduleList(scheduleAnalysis) {
    if (scheduleAnalysis.eventCount === 0) {
      return '<div class="schedule-empty">本日の予定はありません</div>';
    }

    return `
      <ul class="schedule-list">
        ${scheduleAnalysis.events.map(event => {
          const timeStr = event.isAllDay
            ? '終日'
            : `${event.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;

          const typeLabel = this.getTypeLabel(event.type);

          return `
            <li class="schedule-item">
              <span class="schedule-time">${timeStr}</span>
              <span class="schedule-title">${event.title}</span>
              <span class="schedule-type">${typeLabel}</span>
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }

  /**
   * 時系列グラフ用の Chart.js コードを生成
   */
  generateTimeseriesChart(dates, scores, forecastDates = [], forecastScores = []) {
    const dateLabels = dates.map(d => {
      const date = new Date(d);
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    });

    const forecastLabels = forecastDates.map(d => {
      const date = new Date(d);
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    });

    // 過去データと未来データを組み合わせたラベル
    const allLabels = [...dateLabels, ...forecastLabels];

    // 未来データがある場合は2つのデータセット、ない場合は1つ
    const datasets = [
      {
        label: '実績',
        data: [...scores, ...Array(forecastScores.length).fill(null)],
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'rgb(102, 126, 234)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ];

    if (forecastScores.length > 0) {
      datasets.push({
        label: '予測',
        data: [...Array(scores.length).fill(null), ...forecastScores],
        borderColor: 'rgb(76, 175, 80)',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'rgb(76, 175, 80)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      });
    }

    return `
      const ctx = document.getElementById('timeseriesChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ${JSON.stringify(allLabels)},
          datasets: ${JSON.stringify(datasets)}
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: { font: { size: 12 } }
            }
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { stepSize: 20 }
            }
          }
        }
      });
    `;
  }

  /**
   * スコアに応じた絵文字を取得
   */
  getEvaluationEmoji(score) {
    if (score >= 80) {
      return '😊';
    } else if (score >= 60) {
      return '😐';
    } else if (score >= 40) {
      return '😓';
    } else {
      return '😰';
    }
  }

  /**
   * スコアに応じた評価レベルを取得
   */
  getEvaluationLevel(score) {
    if (score >= 80) {
      return '良好';
    } else if (score >= 60) {
      return '注意';
    } else if (score >= 40) {
      return '要注意';
    } else {
      return '警告';
    }
  }

  /**
   * スコアに応じた色を取得
   */
  getScoreColor(score) {
    if (score >= 80) {
      return 'rgb(76, 175, 80)'; // 緑
    } else if (score >= 60) {
      return 'rgb(255, 193, 7)'; // 黄
    } else if (score >= 40) {
      return 'rgb(255, 152, 0)'; // オレンジ
    } else {
      return 'rgb(244, 67, 54)'; // 赤
    }
  }

  /**
   * 評価に応じた色を取得
   */
  getEvaluationColor(score) {
    if (score >= 80) {
      return '#4CAF50'; // 緑
    } else if (score >= 60) {
      return '#FFC107'; // 黄
    } else if (score >= 40) {
      return '#FF9800'; // オレンジ
    } else {
      return '#F44336'; // 赤
    }
  }

  /**
   * イベントタイプラベルを取得
   */
  getTypeLabel(type) {
    const labels = {
      'meeting': '会合',
      'outdoor': '外出',
      'sleep': '睡眠',
      'meal': '食事',
      'undefined': '予定'
    };
    return labels[type] || labels['undefined'];
  }
}

module.exports = HtmlDashboardGenerator;
