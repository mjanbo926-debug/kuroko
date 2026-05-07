const SYSTEM_PROMPT = `あなたは訪問マッサージ師の業務をサポートする報告書作成の専門アシスタントです。
医師・ケアマネジャー・介護事業所・医療機関に提出する公式書類として、以下のルールを厳守して文章を作成・添削してください。

【必須ルール】
1. 敬体（です・ます調）で統一する
2. 断定を避け、観察・所見ベースの表現を使う
   - 「〜がみられます」「〜の傾向がうかがえます」「〜と思われます」
   - 「〜の様子でした」「〜していただきました」「〜と伺っております」
3. 医学的診断や治療効果の断定は禁止
   - NG：「改善した」→ OK：「改善の傾向がみられます」
   - NG：「治った」→ OK：「症状の軽減がみられます」
4. 主語は「ご利用者様」「患者様」を使用
5. 施術者の立場を明確にし、専門職として客観的に記述する
6. 箇条書きは使わず、文章形式（〜。〜。）で記述する
7. 略語・口語・記号（→、/、&など）は使用しない
8. そのまま医療機関・関係機関に提出できる正式な文体に整える

【出力形式】
添削・作成後の文章のみを出力してください。説明・注釈・前置きは一切不要です。`;

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
  const prompt = `以下の文章を、医師・ケアマネジャー・医療機関に提出できる正式な報告書の文体に添削してください。内容の意味は変えず、表現・文体のみ整えてください。

${text}`;
  const data = await callApi([{ role: 'user', content: prompt }], apiKey);
  return data.content[0].text;
}

export async function correctMonthlyReport(sections, apiKey) {
  const text = `① 体調・生活状況\n${sections.healthCondition || ''}\n\n② 身体状況（疼痛・可動域・筋緊張など）\n${sections.physicalCondition || ''}\n\n③ 施術内容\n${sections.treatmentContent || ''}\n\n④ 施術中・施術後の反応\n${sections.treatmentResponse || ''}\n\n⑤ 生活面での気になる点・連携事項\n${sections.lifeObservations || ''}\n\n⑥ 今後の対応方針\n${sections.futurePolicy || ''}`;

  const prompt = `以下は訪問マッサージの月次報告書の下書きです。医師・ケアマネジャー・介護事業所に提出できる正式な文体に添削してください。

【添削の注意点】
- 各項目の番号と見出し（①〜⑥）はそのまま保持すること
- 箇条書きは文章形式に変換すること
- 記録が「記録なし」「なし」「空白」の項目は「今月は特記事項はございませんでした。」などと補完すること
- 全体を通じて一貫した敬体・観察表現で統一すること

${text}`;

  const data = await callApi([{ role: 'user', content: prompt }], apiKey);
  return data.content[0].text;
}

export async function summarizeMonthlyReport(patientName, year, month, dailyReportList, apiKey) {
  const reportsText = dailyReportList
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r =>
      `【${r.date}】\n体調・生活状況：${r.condition || '記録なし'}\n施術内容：${r.notes || '記録なし'}\nADL変化・気になる点：${r.adlNotes || '記録なし'}\n特記事項：${r.specialNotes || 'なし'}`
    ).join('\n\n---\n\n');

  const prompt = `以下は${patientName}様の${year}年${month}月分の施術日報（${dailyReportList.length}回分）です。
これをもとに、医師・ケアマネジャー・介護事業所に提出する月次報告書の各項目を1ヶ月分としてまとめてください。

【作成の注意点】
- 日報の内容を要約・統合し、当月全体の傾向・状態を報告書として記述すること
- 箇条書きは使わず、文章形式（〜がみられます。〜の傾向がうかがえます。）で記述すること
- 観察・所見ベースの表現を使い、断定表現は避けること
- 各項目は2〜3文程度にまとめること
- 記録が少ない項目は「今月は特記事項はございませんでした。」などと記述すること

【日報データ】
${reportsText}

以下のJSON形式のみで出力してください（コードブロック・説明文不要）:
{"healthCondition":"体調・生活状況","physicalCondition":"身体状況（疼痛・可動域・筋緊張など）","treatmentContent":"施術内容","treatmentResponse":"施術中・施術後の反応","lifeObservations":"生活面での気になる点・連携事項","futurePolicy":"今後の対応方針"}`;

  const data = await callApi([{ role: 'user', content: prompt }], apiKey);
  const text = data.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AIの返答を解析できませんでした。もう一度お試しください。');
  return JSON.parse(match[0]);
}

export async function streamGenerateReport({ patientName, period, dailyReportList, reportType }, apiKey, onChunk) {
  if (!apiKey) throw new Error('APIキーが設定されていません。設定画面でAnthropicのAPIキーを入力してください。');

  const count = dailyReportList.length;

  const partCounts = {};
  const treatCounts = {};
  const conditionCounts = {};
  dailyReportList.forEach(r => {
    (r.bodyParts || []).forEach(p => { partCounts[p] = (partCounts[p] || 0) + 1; });
    (r.treatmentTags || []).forEach(t => { treatCounts[t] = (treatCounts[t] || 0) + 1; });
    if (r.patientCondition) conditionCounts[r.patientCondition] = (conditionCounts[r.patientCondition] || 0) + 1;
  });

  const topParts = Object.entries(partCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const topTreats = Object.entries(treatCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const topCondition = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const reportsText = dailyReportList
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => {
      const lines = [];
      if (r.bodyParts?.length) lines.push(`部位：${r.bodyParts.join('・')}`);
      if (r.treatmentTags?.length) lines.push(`施術：${r.treatmentTags.join('・')}`);
      if (r.patientCondition) lines.push(`状態：${r.patientCondition}`);
      if (r.condition) lines.push(`体調：${r.condition}`);
      if (r.notes) lines.push(`メモ：${r.notes}`);
      if (r.adlNotes) lines.push(`ADL：${r.adlNotes}`);
      if (r.specialNotes) lines.push(`特記：${r.specialNotes}`);
      return `【${r.date}】\n${lines.join('\n') || '（記録なし）'}`;
    }).join('\n\n');

  const typeLabel = reportType === 'monthly' ? '月次' : '半年次';
  const prompt = `以下は${patientName}様の${period}の施術記録です（${count}回分）。
これをもとに、主治医・ケアマネジャー・介護事業所に提出する${typeLabel}施術報告書の文章を作成してください。

【施術サマリー】
- 施術回数：${count}回${topParts.length ? `\n- 主な施術部位：${topParts.join('・')}` : ''}${topTreats.length ? `\n- 主な施術内容：${topTreats.join('・')}` : ''}${topCondition ? `\n- 全体的な状態傾向：${topCondition}` : ''}

【施術記録（時系列）】
${reportsText}

【出力要件】
- です・ます調で統一
- 観察・所見ベースの表現（〜がみられます、〜の傾向がうかがえます）
- 医学的断定・治療効果の断定は避ける
- 400〜600文字程度
- 対象期間・施術回数・経過の変化・現在の状態・今後の方針を含む
- 箇条書きは使わず文章形式で
- 報告書文章のみ出力（前置き・説明・見出し不要）`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `APIエラー (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const data = JSON.parse(jsonStr);
        if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
          fullText += data.delta.text;
          onChunk(data.delta.text);
        }
      } catch {}
    }
  }
  return fullText;
}

export async function summarizePatientDailyReports(patientName, dailyReportList, apiKey) {
  const reportsText = dailyReportList
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r =>
      `【${r.date}】\n体調・生活状況：${r.condition || '記録なし'}\n施術内容：${r.treatment || r.notes || '記録なし'}\nADL変化・気になる点：${r.adlNotes || '記録なし'}\n特記事項：${r.specialNotes || 'なし'}`
    ).join('\n\n---\n\n');

  const prompt = `以下は${patientName}様の施術日報（${dailyReportList.length}回分）です。
これらをもとに、医師・ケアマネジャー・介護事業所に提出する半年施術報告書の各項目を作成してください。

【作成の注意点】
- 日報の内容を要約・統合し、期間全体の傾向・変化を報告書として記述すること
- 箇条書きは使わず、文章形式（〜がみられます。〜の傾向がうかがえます。）で記述すること
- 観察・所見ベースの表現を使い、断定表現は避けること
- 各項目は2〜4文程度でまとめること

【日報データ】
${reportsText}

以下のJSON形式のみで出力してください（コードブロック・説明文不要）:
{"initialStatus":"施術開始時の状況（2〜3文）","treatmentContent":"半年間の施術内容まとめ（2〜4文）","mentalCare":"精神面・生活面のサポート内容（2〜3文）","currentStatus":"直近の現状・身体状況（2〜3文）","futureApproach":"今後の施術方針・取り組み（2〜3文）","specialNotes":"特記事項・連携事項（なければ空文字）"}`;

  const data = await callApi([{ role: 'user', content: prompt }], apiKey);
  const text = data.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AIの返答を解析できませんでした。もう一度お試しください。');
  return JSON.parse(match[0]);
}
