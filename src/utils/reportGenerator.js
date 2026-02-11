/**
 * 体調予報レポート生成クラス
 */
class ReportGenerator {
  generateReport(result, detailedAnalysis, weatherData, date) {
    const textReport = this.generateTextReport(result, detailedAnalysis, weatherData, date);
    const jsonReport = this.generateJsonReport(result, detailedAnalysis, weatherData, date);

    return {
      text: textReport,
      json: jsonReport,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * テキスト形式のレポートを生成
   */
  generateTextReport(result, detailedAnalysis, weatherData, date) {
    let report = '';

    // ヘッダー
    report += `📅 ${date.toLocaleDateString('ja-JP')}\n`;
    report += `⏰ ${date.toLocaleTimeString('ja-JP')}\n\n`;

    // スコアと評価
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📊 体調スコア: ${result.totalScore}/100\n`;
    report += `${result.evaluation.emoji} 評価: ${result.evaluation.level}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // アドバイス
    report += `💡 アドバイス:\n${result.evaluation.advice}\n\n`;

    // 各要因のスコア
    report += '📈 各要因の詳細スコア:\n';
    report += '─────────────────────\n';
    const factors = [
      { name: '気温', key: 'temperature', emoji: '🌡️' },
      { name: '気温差', key: 'temperatureDifference', emoji: '🌡️' },
      { name: '湿度', key: 'humidity', emoji: '💧' },
      { name: '日照', key: 'illumination', emoji: '☀️' },
      { name: '空気質', key: 'airQuality', emoji: '💨' },
      { name: '気圧', key: 'pressure', emoji: '🎈' },
      { name: 'スケジュール', key: 'schedule', emoji: '📅' }
    ];

    factors.forEach(factor => {
      const score = result.factorScores[factor.key];
      if (score === undefined) return; // スコアがない場合はスキップ
      const roundedScore = Math.round(score);
      const bar = this.createScoreBar(roundedScore);
      report += `${factor.emoji} ${factor.name}: ${roundedScore}/100 ${bar}\n`;
    });

    report += '\n';

    // スコア算出根拠
    report += '📐 スコア算出根拠:\n';
    report += '─────────────────────\n';
    report += this.getScoreReasoning(result.factorScores, weatherData, detailedAnalysis) + '\n';

    // 気象情報
    report += '🌤️  気象情報:\n';
    report += '─────────────────────\n';
    report += `気温: ${weatherData.temperature}℃ (体感: ${weatherData.feelsLike}℃)\n`;
    report += `湿度: ${weatherData.humidity}%\n`;
    report += `気圧: ${weatherData.pressure} hPa\n`;
    report += `雲量: ${weatherData.cloudiness}%\n`;
    report += `天気: ${weatherData.weatherDescription}\n\n`;

    // 詳細分析
    if (detailedAnalysis.length > 0) {
      report += '⚠️  リスク分析:\n';
      report += '─────────────────────\n';
      detailedAnalysis.forEach(item => {
        report += `• 【${item.factor}】\n`;
        report += `  問題: ${item.issue}\n`;
        report += `  影響: ${item.impact}\n\n`;
      });
    } else {
      report += '✨ 特に懸念事項はありません。\n\n';
    }

    // 推奨事項
    report += '🎯 推奨事項:\n';
    report += '─────────────────────\n';
    report += this.getRecommendations(result.totalScore, detailedAnalysis);

    return report;
  }

  /**
   * JSON形式のレポートを生成
   */
  generateJsonReport(result, detailedAnalysis, weatherData, date) {
    // 各スコアを整数に丸める
    const roundedFactorScores = {};
    Object.keys(result.factorScores).forEach(key => {
      roundedFactorScores[key] = Math.round(result.factorScores[key]);
    });

    return {
      date: date.toISOString(),
      score: {
        total: result.totalScore,
        evaluation: result.evaluation.level,
        advice: result.evaluation.advice
      },
      factorScores: roundedFactorScores,
      weather: {
        temperature: weatherData.temperature,
        feelsLike: weatherData.feelsLike,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        description: weatherData.weatherDescription,
        visibility: weatherData.visibility,
        windSpeed: weatherData.windSpeed
      },
      risks: detailedAnalysis,
      recommendations: this.getRecommendations(result.totalScore, detailedAnalysis)
    };
  }

  /**
   * スコアバーを作成
   */
  createScoreBar(score) {
    const barLength = 20;
    const filledLength = Math.round((score / 100) * barLength);
    const emptyLength = barLength - filledLength;
    return '[' + '█'.repeat(filledLength) + '░'.repeat(emptyLength) + ']';
  }

  /**
   * スコア算出根拠を取得
   */
  getScoreReasoning(factorScores, weatherData, detailedAnalysis) {
    const reasoning = [];

    // 気温の根拠
    const tempScore = Math.round(factorScores.temperature);
    if (tempScore === 100) {
      reasoning.push(`• 気温: ${weatherData.temperature}℃は最適範囲(5-10℃)内のため100点`);
    } else if (tempScore >= 70) {
      const tempMsg = weatherData.temperature < 5
        ? `${weatherData.temperature}℃は寒冷だが快適範囲(5-20℃)内`
        : `${weatherData.temperature}℃は快適範囲(5-20℃)内`;
      reasoning.push(`• 気温: ${tempMsg}のため${tempScore}点`);
    } else {
      const tempMsg = weatherData.temperature < 5
        ? `${weatherData.temperature}℃は非常に寒い`
        : `${weatherData.temperature}℃は高温`;
      reasoning.push(`• 気温: ${tempMsg}のため${tempScore}点`);
    }

    // 気温差の根拠（72時間モード対応: 過去12時間の気温差が5℃以上で減点）
    const tempDiffScore = Math.round(factorScores.temperatureDifference);
    const tempDiff12h = weatherData.tempDiff12h !== undefined ? weatherData.tempDiff12h : 0;
    if (tempDiffScore === 100) {
      reasoning.push(`• 気温差: 過去12時間の気温差が安定(≤5℃)しているため100点`);
    } else {
      // 気温差を推定（逆計算）: penalty = (diff - 5) * 10
      // score = 100 - penalty → penalty = 100 - score
      const penalty = 100 - tempDiffScore;
      const estimatedDiff = (penalty / 10) + 5;
      const displayDiff = tempDiff12h > 0 ? tempDiff12h : Math.round(estimatedDiff * 10) / 10;
      reasoning.push(`• 気温差: 過去12時間の気温差が${displayDiff}℃あるため${tempDiffScore}点`);
    }

    // 湿度の根拠
    const humidityScore = Math.round(factorScores.humidity);
    if (humidityScore === 100) {
      reasoning.push(`• 湿度: ${weatherData.humidity}%は最適範囲(40-60%)内のため100点`);
    } else if (humidityScore >= 70) {
      reasoning.push(`• 湿度: ${weatherData.humidity}%はやや不快だが許容範囲のため${humidityScore}点`);
    } else {
      const humidityMsg = weatherData.humidity < 40
        ? `${weatherData.humidity}%は乾燥`
        : `${weatherData.humidity}%は高湿度`;
      reasoning.push(`• 湿度: ${humidityMsg}のため${humidityScore}点`);
    }

    // 日照の根拠
    const illuminationScore = Math.round(factorScores.illumination);
    const cloudiness = weatherData.cloudiness;
    let cloudDesc = '';
    if (cloudiness <= 20) {
      cloudDesc = '快晴';
    } else if (cloudiness <= 40) {
      cloudDesc = '晴れ';
    } else if (cloudiness <= 60) {
      cloudDesc = '曇り';
    } else if (cloudiness <= 80) {
      cloudDesc = '曇天';
    } else {
      cloudDesc = '厚い雲';
    }
    reasoning.push(`• 日照: 雲量${cloudiness}%で${cloudDesc}のため${illuminationScore}点`);

    // 空気質の根拠
    const airQualityScore = Math.round(factorScores.airQuality);
    if (airQualityScore === 100) {
      reasoning.push(`• 空気質: 屋内のみの予定のため影響なし、100点`);
    } else {
      reasoning.push(`• 空気質: AQI指数に基づき${airQualityScore}点`);
    }

    // 気圧の根拠
    const pressureScore = Math.round(factorScores.pressure);
    if (pressureScore === 100) {
      reasoning.push(`• 気圧: ${weatherData.pressure} hPaは1015 hPa以上のため100点（快適）`);
    } else {
      // 1015 hPaから990 hPaへ直線的に低下（25 hPa差で100点低下）
      // スコア = 100 - (1015 - 実際の気圧) * 4
      const diff = 1015 - weatherData.pressure;
      const reason = diff >= 0
        ? `${weatherData.pressure} hPaは1015 hPaより${diff}低いため`
        : `${weatherData.pressure} hPaは基準より高いため`;
      reasoning.push(`• 気圧: ${reason}${pressureScore}点`);
    }

    // スケジュールの根拠
    const scheduleScore = Math.round(factorScores.schedule);
    if (scheduleScore === 100) {
      reasoning.push(`• スケジュール: 特に負担となる予定がないため100点`);
    } else {
      const issues = [];
      if (detailedAnalysis.some(a => a.factor === 'スケジュール')) {
        const scheduleRisk = detailedAnalysis.find(a => a.factor === 'スケジュール');
        issues.push(scheduleRisk.issue);
      }
      reasoning.push(`• スケジュール: ${issues.length > 0 ? issues[0] : 'スケジュール負荷あり'}のため${scheduleScore}点`);
    }

    return reasoning.join('\n');
  }

  /**
   * スコアに基づいた推奨事項を取得
   */
  getRecommendations(score, detailedAnalysis) {
    const recommendations = [];

    // スコアレベルに応じた推奨事項
    if (score >= 80) {
      recommendations.push('• 通常通りの活動を継続してください');
      recommendations.push('• 特に制限のない状況です');
    } else if (score >= 60) {
      recommendations.push('• 無理のない範囲で活動してください');
      recommendations.push('• こまめに休息をとりましょう');
      recommendations.push('• 十分な水分補給を心がけてください');
    } else if (score >= 40) {
      recommendations.push('• 活動量を控えめにしてください');
      recommendations.push('• 十分な睡眠（7時間以上）をとりましょう');
      recommendations.push('• バランスの良い栄養をとることが重要です');
      recommendations.push('• 無理な外出は避けてください');
    } else {
      recommendations.push('• できるだけ休息を優先してください');
      recommendations.push('• 必要な外出のみに限定してください');
      recommendations.push('• 医師の診察が必要な場合もあります');
      recommendations.push('• 十分な睡眠と栄養補給を最優先に');
    }

    // リスク分析に基づいた個別推奨事項
    detailedAnalysis.forEach(risk => {
      if (risk.factor === '気温') {
        if (risk.issue.includes('寒い')) {
          recommendations.push('• 暖かい衣服を着用してください');
        } else if (risk.issue.includes('高温')) {
          recommendations.push('• こまめに水分補給し、涼しい環境にいてください');
        }
      }

      if (risk.factor === '湿度') {
        recommendations.push('• エアコンで湿度管理をしてください');
        recommendations.push('• 除湿機の使用を検討してください');
      }

      if (risk.factor === '日照') {
        recommendations.push('• 日中に窓辺で過ごす時間を増やしてください');
        recommendations.push('• 可能なら外に出て日光を浴びてください');
      }

      if (risk.factor === '空気質') {
        recommendations.push('• マスクの着用を検討してください');
        recommendations.push('• 空気清浄機の使用を検討してください');
      }

      if (risk.factor === '気圧') {
        recommendations.push('• 偏頭痛薬を常備してください');
        recommendations.push('• こまめに休息をとりましょう');
      }
    });

    return recommendations.join('\n');
  }
}

module.exports = ReportGenerator;
