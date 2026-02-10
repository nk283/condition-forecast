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
      { name: '湿度', key: 'humidity', emoji: '💧' },
      { name: '日照', key: 'illumination', emoji: '☀️' },
      { name: '空気質', key: 'airQuality', emoji: '💨' },
      { name: '気圧', key: 'pressure', emoji: '🎈' },
      { name: 'スケジュール', key: 'schedule', emoji: '📅' }
    ];

    factors.forEach(factor => {
      const score = result.factorScores[factor.key];
      const bar = this.createScoreBar(score);
      report += `${factor.emoji} ${factor.name}: ${score}/100 ${bar}\n`;
    });

    report += '\n';

    // 気象情報
    report += '🌤️  気象情報:\n';
    report += '─────────────────────\n';
    report += `気温: ${weatherData.temperature}℃ (体感: ${weatherData.feelsLike}℃)\n`;
    report += `湿度: ${weatherData.humidity}%\n`;
    report += `気圧: ${weatherData.pressure} hPa\n`;
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
    return {
      date: date.toISOString(),
      score: {
        total: result.totalScore,
        evaluation: result.evaluation.level,
        advice: result.evaluation.advice
      },
      factorScores: result.factorScores,
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
