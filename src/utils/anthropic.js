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

const MONTHLY_REPORT_PROMPT = `あなたは訪問マッサージ師の業務をサポートするアシスタントです。
会社およびケアマネジャーへの月次報告書を作成・添削してください。

【文体のルール】
1. 丁寧語（です・ます調）で書く
2. 専門職らしい自然な文章にする
   - OK：「体調は安定していました」「筋緊張の緩和を図りました」「特に気になる変化はありませんでした」「〜の様子が見られました」
   - NG：「〜の可能性がございます」「〜であります」「幸いです」「〜させていただきました」の多用
3. 過度な敬語・書き言葉は使わない（読みやすさを優先）
4. 観察した事実を簡潔・明確に伝える
5. 箇条書きは使わず文章形式で書く
6. 略語・記号（→、/、&など）は使わない

【出力形式】
作成・添削後の文章のみを出力してください。説明・前置きは不要です。`;

const FAMILY_REPORT_PROMPT = `あなたは訪問マッサージ師の業務をサポートするアシスタントです。
患者様のご家族に送付する月次施術報告書を作成・添削してください。

【文体のルール】
1. 丁寧で温かみのある文章にする（です・ます調）
2. 医療・介護の専門用語は使わず、わかりやすい言葉で説明する
   - NG：「筋緊張の亢進」→ OK：「筋肉のこわばり・張り」
   - NG：「拘縮」→ OK：「関節が固まった状態」
   - NG：「ADL」→ OK：「日常の動作」
   - NG：「廃用症候群」→ OK：「体を動かす機会が減ったことによる筋力低下」
3. ご家族が読んで安心・納得できる表現を心がける
4. 体調の変化や気になる点は正確に、でもやさしく伝える
5. 箇条書きは使わず文章形式で書く
6. 略語・記号（→、/、&など）は使わない

【出力形式】
作成・添削後の文章のみを出力してください。説明・前置きは不要です。`;

async function callApi(messages, apiKey) {
  const key = (apiKey || '').trim();
  if (!key) throw new Error('APIキーが設定されていません。設定画面でAnthropicのAPIキーを入力してください。');
  let response;
  try {
    response = await fetch('/anthropic-api/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: SYSTEM_PROMPT, messages }),
    });
  } catch (e) {
    throw new Error(`ネットワークエラー：インターネット接続を確認してください。（${e.message}）`);
  }
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

export function getMonthlySystemPrompt(target) {
  if (target === 'family') return FAMILY_REPORT_PROMPT;
  return MONTHLY_REPORT_PROMPT;
}

export async function correctMonthlyReport(sections, apiKey, target = 'company') {
  const key = (apiKey || '').trim();
  if (!key) throw new Error('APIキーが設定されていません。');
  const isFamily = target === 'family';
  const text = `『体調』\n${sections.healthCondition || ''}\n\n『身体の様子』\n${sections.physicalCondition || ''}\n\n『施術内容』\n${sections.treatmentContent || ''}\n\n『気になる事』\n${sections.lifeObservations || ''}`;
  const prompt = isFamily
    ? `以下は訪問マッサージの月次報告書（ご家族送付用）の下書きです。添削してください。\n\n【添削の注意点】\n- 各項目の見出し（『体調』『身体の様子』『施術内容』『気になる事』）はそのまま保持すること\n- 専門用語はやさしい言葉に言い換えること\n- 末尾の締め文は出力しないこと\n\n${text}`
    : `以下は訪問マッサージの月次報告書（会社LINE報告用）の下書きです。添削してください。\n\n【添削の注意点】\n- 各項目の見出し（『体調』『身体の様子』『施術内容』『気になる事』）はそのまま保持すること\n- 『身体の様子』は簡潔な名詞・体言止めのリスト形式を維持すること\n- 末尾の締め文は出力しないこと\n\n${text}`;
  const systemPrompt = getMonthlySystemPrompt(target);
  let response;
  try {
    response = await fetch('/anthropic-api/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: prompt }] }),
    });
  } catch (e) {
    throw new Error(`ネットワークエラー：インターネット接続を確認してください。（${e.message}）`);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `APIエラー (${response.status})`);
  }
  const data = await response.json();
  return data.content[0].text.trim();
}

export async function summarizeMonthlyReport(patientName, year, month, dailyReportList, apiKey, target = 'company') {
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
    }).join('\n\n---\n\n');

  const isFamily = target === 'family';
  const prompt = `以下は${patientName}様の${year}年${month}月分の施術日報（${dailyReportList.length}回分）です。
これをもとに、${isFamily ? 'ご家族に送付する' : '会社に報告する'}月次報告書の各項目をまとめてください。

【各項目の書き方】
- healthCondition（体調）：当月の体調や生活状況の変化を2〜3文で文章形式（です・ます調）で記述${isFamily ? '（専門用語は使わずわかりやすく）' : ''}
- physicalCondition（身体の様子）：主な身体症状・問題点を${isFamily ? 'やさしい言葉で2〜3文の文章形式で記述（専門用語は平易な言葉に言い換える）' : '簡潔な名詞・体言止めのリスト形式で列挙（例：筋力低下（廃用症候群）\\n頸肩部の筋緊張）改行区切りで箇条書き風に'}
- treatmentContent（施術内容）：実施した施術内容を2〜4文で文章形式で記述（施術回数は記載しないこと）${isFamily ? '（専門用語は使わずわかりやすく）' : ''}
- lifeObservations（気になる事）：生活面・身体面で気になった点・注意事項を1〜3文で文章形式で記述。特になければ空文字

【日報データ】
${reportsText}

以下のJSON形式のみで出力してください（コードブロック・説明文不要）:
{"healthCondition":"体調の文章","physicalCondition":"症状リスト（改行区切り）","treatmentContent":"施術内容の文章","lifeObservations":"気になる事の文章"}`;

  const key = (apiKey || '').trim();
  if (!key) throw new Error('APIキーが設定されていません。設定画面でAnthropicのAPIキーを入力してください。');
  let response;
  try {
    response = await fetch('/anthropic-api/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: getMonthlySystemPrompt(target), messages: [{ role: 'user', content: prompt }] }),
    });
  } catch (e) {
    throw new Error(`ネットワークエラー：インターネット接続を確認してください。（${e.message}）`);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `APIエラー (${response.status})`);
  }
  const data = await response.json();
  const text = data.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AIの返答を解析できませんでした。もう一度お試しください。');
  return JSON.parse(match[0]);
}

export async function streamGenerateReport({ patientName, period, dailyReportList, reportType, experienceReport, pastReports, target = 'company' }, apiKey, onChunk) {
  const key = (apiKey || '').trim();
  if (!key) throw new Error('APIキーが設定されていません。設定画面でAnthropicのAPIキーを入力してください。');

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

  const isFamily = target === 'family';
  const formatSection = reportType === 'monthly'
    ? isFamily
      ? `以下の4項目の見出しをそのまま使い、ご家族に送付する月次施術報告書を作成してください：

『体調』
（当月の体調・生活状況の変化を2〜3文で。専門用語は使わずわかりやすく温かみのある文章で）

『身体の様子』
（主な身体の状態を2〜3文で文章形式で。専門用語はやさしい言葉に言い換えること）

『施術内容』
（実施した施術内容を2〜4文で文章形式で。専門用語は使わずわかりやすく。施術回数は記載しないこと）

『気になる事』
（生活面・身体面で気になった点を1〜3文で。なければ「今月は特に気になる点はありませんでした。」）

※末尾の締め文は出力しないこと（固定文を別途付加する）`
      : `以下の4項目の見出しをそのまま使い、会社LINE報告用の月次報告書を作成してください：

『体調』
（当月の体調・生活状況の変化を2〜3文で文章形式で）

『身体の様子』
（主な症状・問題点を名詞・体言止めで改行区切りのリスト形式で。例：筋力低下（廃用症候群）
頸肩部の筋緊張
下肢の疼痛）

『施術内容』
（実施した施術内容を2〜4文で文章形式で。施術回数は記載しないこと）

『気になる事』
（生活面・身体面の気になる点・注意事項を1〜3文で。なければ「今月は特記事項はございませんでした。」）

※末尾の締め文は出力しないこと（固定文を別途付加する）`
    : `以下の項目の見出しをそのまま使い、各項目を2〜3文で記述してください：

■ 施術開始時の状況
■ 施術内容
■ 声かけ・メンタルケア
■ 現状
■ 今後の取り組み
■ 特記事項`;

  // 副業先半年報告書用：体験カルテ・過去報告書コンテキスト
  let additionalContext = '';
  if (reportType === 'sixmonth') {
    if (experienceReport) {
      const ef = experienceReport.form || {};
      const symptomsText = ef.symptoms
        ? Object.entries(ef.symptoms)
            .filter(([, v]) => {
              const sel = Array.isArray(v.selected) ? v.selected : [v.selected];
              return sel.length > 0 && !sel.every(s => s === '無' || s === '');
            })
            .map(([type, v]) => {
              const sel = Array.isArray(v.selected) ? v.selected : [v.selected];
              const areas = sel.filter(s => s && s !== '無').join('・');
              return `${type}：${areas}${v.otherText ? `（${v.otherText}）` : ''}`;
            }).join('、') || 'なし'
        : '';
      const areasText = (ef.treatmentAreas || []).join('、') || '';
      const posText = ef.positionContents
        ? Object.entries(ef.positionContents).filter(([, v]) => v).map(([p, v]) => `${p}：${v}`).join('　／　')
        : (ef.planTreatment || '');
      additionalContext += `\n【初回体験カルテ（施術開始時の情報）】\n主訴・現状：${ef.chiefComplaint || ''}\n症状：${symptomsText}\n開始時の目標：${ef.initialGoal || ef.treatmentGoal || ''}\n施術部位：${areasText}\n施術内容（体位別）：${posText}\n追記・注意点：${ef.notes1 || ef.communicationNotes || ''}`;
    }
    if (pastReports?.length > 0) {
      additionalContext += '\n\n【過去の施術報告書（参考）】\n' + pastReports.slice(0, 2).map(r => {
        const f = r.form || {};
        const date = r.createdAt?.split('T')[0]?.replace(/-/g, '/') || '';
        return `◆ ${date}作成分\n施術開始時の状況：${f.initialStatus || ''}\n長期目標：${f.longTermGoal || ''}\n短期目標：${f.shortTermGoal || ''}\n現状：${f.currentStatus || ''}\n今後の取り組み：${f.futureApproach || ''}`;
      }).join('\n\n');
    }
  }

  const typeLabel = reportType === 'monthly' ? '月次' : '半年次';
  const prompt = `以下は${patientName}様の${period}の施術記録です（${count}回分）。
これをもとに、主治医・ケアマネジャー・介護事業所に提出する${typeLabel}施術報告書を作成してください。${additionalContext}

【施術サマリー】
- 施術回数：${count}回${topParts.length ? `\n- 主な施術部位：${topParts.join('・')}` : ''}${topTreats.length ? `\n- 主な施術内容：${topTreats.join('・')}` : ''}${topCondition ? `\n- 全体的な状態傾向：${topCondition}` : ''}

【施術記録（時系列）】
${reportsText}

【出力フォーマット】
${formatSection}

【共通ルール】
- です・ます調で統一
- 観察・所見ベースの表現（〜がみられます、〜の傾向がうかがえます）
- 医学的断定・治療効果の断定は避ける
- 箇条書きは使わず文章形式で
- 各項目の見出しの後に改行して本文を記述すること
- 余分な前置き・後書き・説明は不要
${reportType === 'sixmonth' && additionalContext ? '- 体験カルテの主訴・目標と現在の状況を比較し変化・進捗を反映すること\n- 過去の報告書がある場合は前回との変化・継続点を意識して記述すること' : ''}`;

  let response;
  try {
    response = await fetch('/anthropic-api/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        stream: true,
        system: reportType === 'monthly' ? getMonthlySystemPrompt(target) : SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    throw new Error(`ネットワークエラー：インターネット接続を確認してください。（${e.message}）`);
  }

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

export async function summarizePatientDailyReports(patientName, dailyReportList, apiKey, experienceReport = null, pastReports = []) {
  const reportsText = dailyReportList
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => {
      const lines = [];
      if (r.bodyParts?.length) lines.push(`部位：${r.bodyParts.join('・')}`);
      if (r.treatmentTags?.length) lines.push(`施術：${r.treatmentTags.join('・')}`);
      if (r.patientCondition) lines.push(`状態：${r.patientCondition}`);
      if (r.condition) lines.push(`体調：${r.condition}`);
      if (r.treatment || r.notes) lines.push(`メモ：${r.treatment || r.notes}`);
      if (r.adlNotes) lines.push(`ADL：${r.adlNotes}`);
      if (r.specialNotes) lines.push(`特記：${r.specialNotes}`);
      return `【${r.date}】\n${lines.join('\n') || '（記録なし）'}`;
    }).join('\n\n---\n\n');

  // 体験カルテのコンテキスト
  let karteContext = '';
  if (experienceReport) {
    const ef = experienceReport.form || {};
    // 症状サマリー
    const symptomsText = ef.symptoms
      ? Object.entries(ef.symptoms)
          .filter(([, v]) => {
            const sel = Array.isArray(v.selected) ? v.selected : [v.selected];
            return sel.length > 0 && !sel.every(s => s === '無' || s === '');
          })
          .map(([type, v]) => {
            const sel = Array.isArray(v.selected) ? v.selected : [v.selected];
            const areas = sel.filter(s => s && s !== '無').join('・');
            return `${type}：${areas}${v.otherText ? `（${v.otherText}）` : ''}`;
          })
          .join('、') || 'なし'
      : '';
    // 施術部位
    const areasText = (ef.treatmentAreas || []).join('、') || '';
    // 体位別施術内容
    const posText = ef.positionContents
      ? Object.entries(ef.positionContents).filter(([, v]) => v).map(([p, v]) => `${p}：${v}`).join('　／　')
      : (ef.planTreatment || '');
    karteContext = `
【初回体験カルテ（施術開始時の情報）】
主訴・現状：${ef.chiefComplaint || ''}
症状：${symptomsText}
開始時の目標：${ef.initialGoal || ef.treatmentGoal || ''}
施術部位：${areasText}
施術内容（体位別）：${posText}
追記・注意点：${ef.notes1 || ef.communicationNotes || ''}`;
  }

  // 過去の施術報告書コンテキスト（最新2件）
  let pastContext = '';
  if (pastReports.length > 0) {
    pastContext = '\n\n【過去の施術報告書（参考）】\n' + pastReports.slice(0, 2).map(r => {
      const f = r.form || {};
      const date = r.createdAt?.split('T')[0]?.replace(/-/g, '/') || '';
      return `◆ ${date}作成分\n施術開始時の状況：${f.initialStatus || ''}\n長期目標：${f.longTermGoal || ''}\n短期目標：${f.shortTermGoal || ''}\n現状：${f.currentStatus || ''}\n今後の取り組み：${f.futureApproach || ''}`;
    }).join('\n\n');
  }

  const prompt = `以下は${patientName}様の施術日報（${dailyReportList.length}回分）です。
体験カルテ・過去の報告書・日報をすべて参照して、医師・ケアマネジャー・介護事業所に提出する半年施術報告書の各項目を作成してください。
${karteContext}${pastContext}

【作成の注意点】
- 日報の内容を要約・統合し、期間全体の傾向・変化を報告書として記述すること
- 体験カルテの主訴・目標と現在の状況を比較し、変化・進捗を反映すること
- 過去の報告書がある場合は、前回との変化・継続点を意識して記述すること
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
