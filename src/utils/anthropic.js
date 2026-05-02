const SYSTEM_PROMPT = `あなたは訪問マッサージの報告書を添削する専門アシスタントです。
以下のルールに従って文章を添削してください：

【添削ルール】
1. 断定表現を避け、観察ベースの表現に変換する
2. 以下の表現を積極的に使用する：
   - 「〜がみられます」
   - 「〜の傾向がうかがえます」
   - 「〜と思われます」
   - 「〜していただきました」
   - 「〜の様子でした」
   - 「〜と伺っております」
3. 医学的判断や治療効果の断定は禁止（例：「改善した」→「改善の傾向がみられます」）
4. 敬体（です・ます調）で統一する
5. そのまま医療機関や関係者に提出できる文体に整形する
6. 主語は「ご利用者様」「患者様」などを使用する

添削後の文章のみを出力してください。説明や注釈は不要です。`;

async function callApi(messages, apiKey) {
  if (!apiKey) throw new Error('APIキーが設定されていません。設定画面でAnthropicのAPIキーを入力してください。');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system: SYSTEM_PROMPT, messages }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `APIエラー (${response.status})`);
  }
  return response.json();
}

export async function correctText(text, apiKey) {
  const data = await callApi([{ role: 'user', content: `以下の文章を添削してください：\n\n${text}` }], apiKey);
  return data.content[0].text;
}

export async function correctMonthlyReport(sections, apiKey) {
  const text = `① 体調・生活状況\n${sections.healthCondition || ''}\n\n② 身体状況（疼痛・可動域・筋緊張など）\n${sections.physicalCondition || ''}\n\n③ 施術内容\n${sections.treatmentContent || ''}\n\n④ 施術中・施術後の反応\n${sections.treatmentResponse || ''}\n\n⑤ 生活面での気になる点・連携事項\n${sections.lifeObservations || ''}\n\n⑥ 今後の対応方針\n${sections.futurePolicy || ''}`;
  const data = await callApi([{ role: 'user', content: `以下の月次報告書を添削してください。各項目の番号と見出しはそのまま保持してください：\n\n${text}` }], apiKey);
  return data.content[0].text;
}

export async function summarizePatientDailyReports(patientName, dailyReportList, apiKey) {
  const reportsText = dailyReportList
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r =>
      `【${r.date}】\n体調：${r.condition || '記録なし'}\n施術：${r.treatment || '記録なし'}\n反応：${r.reaction || '記録なし'}\n声かけ：${r.mentalCare || '記録なし'}\nADL変化：${r.adlNotes || '記録なし'}\n特記：${r.specialNotes || 'なし'}`
    ).join('\n\n---\n\n');

  const prompt = `以下は${patientName}様の施術日報（${dailyReportList.length}回分）です。これらをもとに半年施術報告書の各項目を観察ベースの文体で作成してください。

${reportsText}

以下のJSON形式のみで出力してください（コードブロック・説明文不要）:
{"initialStatus":"施術開始時の状況","treatmentContent":"半年間の施術内容まとめ","mentalCare":"声かけ・メンタルケアのまとめ","currentStatus":"直近の現状","futureApproach":"今後の取り組み方針","specialNotes":"特記事項まとめ"}`;

  const data = await callApi([{ role: 'user', content: prompt }], apiKey);
  const text = data.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AIの返答を解析できませんでした。もう一度お試しください。');
  return JSON.parse(match[0]);
}
