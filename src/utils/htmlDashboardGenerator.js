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
  generateDashboard(report, weatherData, scheduleAnalysis, historicalData = {}, forecastData = {}, detailedAnalysis = []) {
    const html = this.generateHtml(
      report,
      weatherData,
      scheduleAnalysis,
      historicalData,
      forecastData,
      detailedAnalysis
    );

    fs.writeFileSync(this.outputPath, html);
    return this.outputPath;
  }

  /**
   * HTML を生成
   */
  generateHtml(report, weatherData, scheduleAnalysis, historicalData, forecastData = {}, detailedAnalysis = []) {
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

    .factor-reasoning {
      font-size: 0.75em;
      color: #888;
      margin-top: 5px;
      line-height: 1.4;
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
              <div>${Math.round(report.json.score.total)}/100</div>
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
          ${this.generateFactorScores(report.json.factorScores, weatherData, detailedAnalysis)}
        </div>
      </div>

      <!-- 未来予報 -->
      ${forecastDates.length > 0 ? `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>🔮 未来5日間の体調予報</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
          ${forecastDates.map((date, idx) => {
            const forecastItem = forecastData[date];
            const dateObj = new Date(date);
            const dateLabel = dateObj.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
            const evaluation = this.getEvaluationEmoji(forecastItem.totalScore);
            const factors = [
              { label: '🌡️ 気温', key: 'temperature' },
              { label: '🌡️ 気温差', key: 'temperatureDifference' },
              { label: '💧 湿度', key: 'humidity' },
              { label: '☀️ 日照', key: 'illumination' },
              { label: '💨 空気質', key: 'airQuality' },
              { label: '🎈 気圧', key: 'pressure' },
              { label: '📅 スケジュール', key: 'schedule' }
            ];
            const factorHtml = factors.map(factor => {
              const score = forecastItem.factorScores[factor.key];
              if (score === undefined) return '';
              const color = this.getScoreColor(score);
              return '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<span>' + factor.label + '</span>' +
                '<span style="font-weight: bold; color: ' + color + ';">' + Math.round(score) + '</span>' +
                '</div>';
            }).join('');
            return '<div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #f9f9f9;">' +
              '<div style="font-weight: bold; color: #666; margin-bottom: 10px; font-size: 1.1em;">' + dateLabel + '</div>' +
              '<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #e0e0e0;">' +
              '<div style="text-align: center;">' +
              '<div style="font-size: 2em; font-weight: bold;">' + Math.round(forecastItem.totalScore) + '</div>' +
              '<div style="font-size: 2em;">' + evaluation + '</div>' +
              '</div>' +
              '<div style="font-size: 0.85em; color: #666;">' +
              this.getEvaluationLevel(forecastItem.totalScore) +
              '</div>' +
              '</div>' +
              '<div style="font-size: 0.85em; line-height: 1.8;">' +
              factorHtml +
              '</div>' +
              '</div>';
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
  generateFactorScores(factorScores, weatherData = {}, detailedAnalysis = []) {
    const factors = [
      { label: '🌡️ 気温', key: 'temperature' },
      { label: '🌡️ 気温差', key: 'temperatureDifference' },
      { label: '💧 湿度', key: 'humidity' },
      { label: '☀️ 日照', key: 'illumination' },
      { label: '💨 空気質', key: 'airQuality' },
      { label: '🎈 気圧', key: 'pressure' },
      { label: '📅 スケジュール', key: 'schedule' }
    ];

    return factors.map(factor => {
      const score = factorScores[factor.key];
      if (score === undefined) return ''; // スコアがない場合はスキップ
      const roundedScore = Math.round(score);
      const color = this.getScoreColor(roundedScore);

      // スコア根拠を取得
      const reasoning = this.getScoreReasoning(factor.key, roundedScore, weatherData, detailedAnalysis);

      return `
        <div class="factor-item">
          <div class="factor-label">${factor.label}</div>
          <div class="factor-bar">
            <div class="factor-bar-fill" style="width: ${roundedScore}%; background: ${color};"></div>
          </div>
          <div class="factor-value">${roundedScore}/100</div>
          <div class="factor-reasoning">${reasoning}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * スコア根拠を取得
   */
  getScoreReasoning(factorKey, score, weatherData, detailedAnalysis) {
    switch(factorKey) {
      case 'temperature':
        if (score === 100) {
          return `${weatherData.temperature}℃は最適範囲(5-10℃)内`;
        } else if (score >= 70) {
          return `${weatherData.temperature}℃は快適範囲内`;
        } else {
          return `${weatherData.temperature}℃は快適範囲外`;
        }

      case 'temperatureDifference':
        if (score === 100) {
          return '日中の気温差が安定(≤10℃)';
        } else {
          const penalty = 100 - score;
          const estimatedDiff = Math.round((penalty / 3) + 10);
          return `気温差が${estimatedDiff}℃程度`;
        }

      case 'humidity':
        if (score === 100) {
          return `${weatherData.humidity}%は最適範囲(40-60%)`;
        } else if (score >= 70) {
          return `${weatherData.humidity}%は許容範囲内`;
        } else {
          return `${weatherData.humidity}%は不適切`;
        }

      case 'illumination':
        const cloudiness = weatherData.cloudiness;
        let cloudDesc = '';
        if (cloudiness <= 20) cloudDesc = '快晴';
        else if (cloudiness <= 40) cloudDesc = '晴れ';
        else if (cloudiness <= 60) cloudDesc = '曇り';
        else if (cloudiness <= 80) cloudDesc = '曇天';
        else cloudDesc = '厚い雲';
        return `雲量${cloudiness}%で${cloudDesc}`;

      case 'airQuality':
        if (score === 100) {
          return '屋内のみの予定';
        } else {
          return 'AQI指標に基づく';
        }

      case 'pressure':
        if (score === 100) {
          return `${weatherData.pressure} hPaは最適範囲`;
        } else if (score >= 80) {
          return `${weatherData.pressure} hPaは許容範囲`;
        } else {
          return `${weatherData.pressure} hPa（低/高気圧）`;
        }

      case 'schedule':
        if (score === 100) {
          return '特に負担となる予定がない';
        } else {
          const issues = detailedAnalysis
            .filter(a => a.factor === 'スケジュール')
            .map(a => a.issue)
            .join(', ');
          return issues || 'スケジュール負荷あり';
        }

      default:
        return '';
    }
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

  /**
   * 72時間の1時間刻みダッシュボードを生成
   */
  generateHourlyDashboard(hourlyScores) {
    const html = this.generateHourlyHtml(hourlyScores);
    const outputPath = 'dashboard_72h.html';
    fs.writeFileSync(outputPath, html);
    return outputPath;
  }

  /**
   * 72時間HTML を生成
   */
  generateHourlyHtml(hourlyScores) {
    if (!hourlyScores || hourlyScores.length === 0) {
      return '<html><body>No data available</body></html>';
    }

    // グラフ用データ準備
    const labels = hourlyScores.map(s => {
      const date = new Date(s.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:00`;
    });

    const totalScores = hourlyScores.map(s => s.totalScore);
    const tempScores = hourlyScores.map(s => s.factorScores.temperature);
    const tempDiffScores = hourlyScores.map(s => s.factorScores.temperatureDiff12h);
    const humidityScores = hourlyScores.map(s => s.factorScores.humidity);
    const illuminationScores = hourlyScores.map(s => s.factorScores.illumination);
    const scheduleScores = hourlyScores.map(s => s.factorScores.schedule);

    // 現在時刻を取得
    const now = new Date();
    let currentIndex = -1;

    // テーブルHTMLを生成
    let tableHtml = '<table class="hourly-table"><thead><tr>';
    tableHtml += '<th>時刻</th><th>総合</th><th>気温</th><th>気温差12h</th>';
    tableHtml += '<th>湿度</th><th>日照</th><th>気圧</th><th>空気質</th><th>予定</th>';
    tableHtml += '</tr></thead><tbody>';

    hourlyScores.forEach((score, index) => {
      const date = new Date(score.timestamp);
      const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:00`;
      const color = this.getScoreColor(score.totalScore);

      // 現在時刻を判定（時間単位で比較）
      const isCurrentHour =
        date.getUTCFullYear() === now.getUTCFullYear() &&
        date.getUTCMonth() === now.getUTCMonth() &&
        date.getUTCDate() === now.getUTCDate() &&
        date.getUTCHours() === now.getUTCHours();

      if (isCurrentHour) {
        currentIndex = index;
      }

      const rowClass = isCurrentHour ? 'class="current-hour"' : '';
      tableHtml += `<tr ${rowClass}>
        <td>${timeStr}</td>
        <td style="background-color: ${color}; color: white; font-weight: bold;">${score.totalScore}</td>
        <td>${Math.round(score.factorScores.temperature)}</td>
        <td>${Math.round(score.factorScores.temperatureDiff12h)}</td>
        <td>${Math.round(score.factorScores.humidity)}</td>
        <td>${Math.round(score.factorScores.illumination)}</td>
        <td>${Math.round(score.factorScores.pressure)}</td>
        <td>${Math.round(score.factorScores.airQuality)}</td>
        <td>${score.factorScores.schedule === 0 ? '📅' : '✓'}</td>
      </tr>`;
    });

    tableHtml += '</tbody></table>';

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>体調予報 - 72時間詳細分析</title>
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
      max-width: 1400px;
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

    .card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }

    .card h2 {
      margin-bottom: 15px;
      color: #333;
    }

    canvas {
      max-height: 300px;
    }

    .hourly-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85em;
      margin-top: 10px;
    }

    .hourly-table th,
    .hourly-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
    }

    .hourly-table th {
      background-color: #667eea;
      color: white;
      font-weight: bold;
    }

    .hourly-table tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    .hourly-table tr:hover {
      background-color: #f0f0f0;
    }

    .hourly-table tr.current-hour {
      background-color: #fff3cd;
      font-weight: bold;
      border-left: 4px solid #ffc107;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 1000px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }

    .legend {
      display: flex;
      gap: 20px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 3px;
    }

    .note {
      background-color: #fff9c4;
      border-left: 4px solid #fbc02d;
      padding: 10px;
      margin-top: 10px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌤️ 72時間体調予報 - 詳細分析</h1>
      <p>1時間刻みで体調スコアを表示します</p>
    </header>

    <div class="card">
      <h2>📊 総合スコア推移（72時間）</h2>
      <canvas id="totalScoreChart"></canvas>
      <div class="legend">
        <div class="legend-item"><div class="legend-color" style="background-color: rgb(76, 175, 80);"></div>良好 (80-100)</div>
        <div class="legend-item"><div class="legend-color" style="background-color: rgb(255, 193, 7);"></div>注意 (60-79)</div>
        <div class="legend-item"><div class="legend-color" style="background-color: rgb(255, 152, 0);"></div>要注意 (40-59)</div>
        <div class="legend-item"><div class="legend-color" style="background-color: rgb(244, 67, 54);"></div>警告 (0-39)</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2>🌡️ 気温スコア推移</h2>
        <canvas id="temperatureChart"></canvas>
      </div>

      <div class="card">
        <h2>💨 気温差（12h）スコア推移</h2>
        <canvas id="tempDiffChart"></canvas>
        <div class="note">⚠️ 過去12時間の気温差が5℃超過で減点</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2>💧 湿度スコア推移</h2>
        <canvas id="humidityChart"></canvas>
        <div class="note">💦 最適湿度 40-60%（気温20℃以上で高湿度の影響大）</div>
      </div>

      <div class="card">
        <h2>☀️ 日照スコア推移</h2>
        <canvas id="illuminationChart"></canvas>
        <div class="note">💡 日没後（18:00以降）は中立値（70点）</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h2>📅 予定スコア推移</h2>
        <canvas id="scheduleChart"></canvas>
        <div class="note">📍 予定あり=0点、なし=100点</div>
      </div>
    </div>

    <div class="card">
      <h2>📈 時間別詳細スコア表</h2>
      <div class="note">表をスクロールして詳細をご確認ください</div>
      ${tableHtml}
    </div>
  </div>

  <script>
    // 総合スコアグラフ
    new Chart(document.getElementById('totalScoreChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '総合スコア',
          data: ${JSON.stringify(totalScores)},
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: function(context) {
            const value = context.parsed.y;
            if (value >= 80) return 'rgb(76, 175, 80)';
            if (value >= 60) return 'rgb(255, 193, 7)';
            if (value >= 40) return 'rgb(255, 152, 0)';
            return 'rgb(244, 67, 54)';
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { min: 0, max: 100 }
        }
      }
    });

    // 気温スコアグラフ
    new Chart(document.getElementById('temperatureChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '気温スコア',
          data: ${JSON.stringify(tempScores)},
          borderColor: 'rgb(255, 152, 0)',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 100 } }
      }
    });

    // 気温差スコアグラフ
    new Chart(document.getElementById('tempDiffChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '気温差スコア（5℃超過で減点）',
          data: ${JSON.stringify(tempDiffScores)},
          borderColor: 'rgb(244, 67, 54)',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 100 } }
      }
    });

    // 湿度スコアグラフ
    new Chart(document.getElementById('humidityChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '湿度スコア（最適 40-60%）',
          data: ${JSON.stringify(humidityScores)},
          borderColor: 'rgb(33, 150, 243)',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 100 } }
      }
    });

    // 日照スコアグラフ
    new Chart(document.getElementById('illuminationChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '日照スコア（日没後は中立値）',
          data: ${JSON.stringify(illuminationScores)},
          borderColor: 'rgb(255, 193, 7)',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 100 } }
      }
    });

    // 予定スコアグラフ
    new Chart(document.getElementById('scheduleChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: [{
          label: '予定スコア（予定あり=0, なし=100）',
          data: ${JSON.stringify(scheduleScores)},
          backgroundColor: function(context) {
            return context.parsed.y === 0 ? 'rgba(244, 67, 54, 0.7)' : 'rgba(76, 175, 80, 0.7)';
          }
        }]
      },
      options: {
        responsive: true,
        scales: { y: { min: 0, max: 100 } }
      }
    });
  </script>
</body>
</html>`;

    return html;
  }
}

module.exports = HtmlDashboardGenerator;
