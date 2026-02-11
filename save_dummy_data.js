#!/usr/bin/env node

/**
 * テスト用スクリプト: 2月10日の24時間ダミーデータを保存
 *
 * 使用方法:
 *   node save_dummy_data.js
 */

const DataStorage = require('./src/utils/dataStorage');

console.log('🔄 ダミーデータを保存しています...\n');

const dataStorage = new DataStorage();
const result = dataStorage.saveDummy24hData();

if (result) {
  console.log('\n✅ ダミーデータの保存が完了しました。');
  console.log('次回、npm start を実行すると、2月10日のデータが保持され、');
  console.log('2月11日・12日のデータで上書きされることを確認できます。');
} else {
  console.log('\n❌ ダミーデータの保存に失敗しました。');
  process.exit(1);
}
