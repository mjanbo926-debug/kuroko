import * as XLSX from 'xlsx';

function col(wch) { return { wch }; }

export function generatePartTimeExperienceExcel(patient, formData) {
  const wb = XLSX.utils.book_new();
  const days = Array.isArray(patient.visitDays) ? patient.visitDays.join('・') : (patient.visitDays || '');

  const ws1 = XLSX.utils.aoa_to_sheet([
    ['副業先 体験報告書 ー 患者情報シート'],
    [],
    ['カルテNo', formData.karteNo || '', '記録日', formData.implementDate || ''],
    ['氏名', patient.name || '', '性別', patient.gender || ''],
    ['生年月日', patient.birthDate || '', '年齢', patient.age ? `${patient.age}歳` : ''],
    ['住所', patient.address || ''],
    ['保険情報', formData.insuranceInfo || ''],
    ['同意医師', patient.consentDoctor || '', '同意病院', patient.consentHospital || ''],
    ['ケアマネージャー', patient.careManager || ''],
    [],
    ['【ADL状況】'],
    ['寝返り', patient.adl?.turning || '', '起き上り', patient.adl?.sittingUp || ''],
    ['立ち上り', patient.adl?.standingUp || '', '移乗', patient.adl?.transfer || ''],
    ['立位', patient.adl?.standing || '', '歩行', patient.adl?.walking || ''],
    [],
    ['【生活スケジュール】'],
    [formData.lifeSchedule || ''],
  ]);
  ws1['!cols'] = [col(20), col(30), col(20), col(30)];
  XLSX.utils.book_append_sheet(wb, ws1, '患者情報');

  const ws2 = XLSX.utils.aoa_to_sheet([
    ['副業先 体験報告書 ー カルテシート'],
    [],
    ['患者名', patient.name || '', '実施日', formData.implementDate || ''],
    ['傷病名', patient.diagnosis || ''],
    ['既往歴', patient.medicalHistory || ''],
    [],
    ['【主訴】'],
    [formData.chiefComplaint || ''],
    [],
    ['【初回施術内容】'],
    [formData.initialTreatment || ''],
    [],
    ['【施術目標】'],
    [formData.treatmentGoal || ''],
    [],
    ['【コミュニケーション面の気になる点】'],
    [formData.communicationNotes || ''],
  ]);
  ws2['!cols'] = [col(25), col(35), col(20), col(25)];
  XLSX.utils.book_append_sheet(wb, ws2, 'カルテ');

  const ws3 = XLSX.utils.aoa_to_sheet([
    ['副業先 体験報告書 ー 施術計画書シート'],
    [],
    ['患者名', patient.name || '', '開始日', patient.startDate || ''],
    ['訪問曜日', days, '訪問時間', patient.visitTime || ''],
    [],
    ['【現在の状況】'],
    [formData.currentStatus || ''],
    [],
    ['【目標】'],
    [formData.planGoal || ''],
    [],
    ['【施術内容】'],
    [formData.planTreatment || ''],
    [],
    ['【声かけ・コミュニケーション】'],
    [formData.communication || ''],
  ]);
  ws3['!cols'] = [col(25), col(35), col(20), col(25)];
  XLSX.utils.book_append_sheet(wb, ws3, '施術計画書');

  XLSX.writeFile(wb, `体験報告書_${patient.name}_${formData.implementDate || '未設定'}.xlsx`);
}

export function generatePartTimeSixMonthExcel(patient, formData, correctedText) {
  const wb = XLSX.utils.book_new();
  const days = Array.isArray(patient.visitDays) ? patient.visitDays.join('・') : (patient.visitDays || '');

  const rows = [
    ['副業先 施術報告書'],
    [],
    ['カルテNo', formData.karteNo || '', '記録日', formData.recordDate || ''],
    ['患者名', patient.name || '', '住所', patient.address || ''],
    ['施術開始日', patient.startDate || '', '施術曜日', days],
    ['施術回数', formData.treatmentCount ? `${formData.treatmentCount}回` : ''],
    ['傷病名', patient.diagnosis || ''],
    [],
    ['【施術開始時の状況】'],
    [formData.initialStatus || ''],
    [],
    ['【長期目標】'],
    [formData.longTermGoal || ''],
    [],
    ['【短期目標】'],
    [formData.shortTermGoal || ''],
    [],
    ['【施術内容】'],
    [formData.treatmentContent || ''],
    [],
    ['【声かけ・メンタルケア】'],
    [formData.mentalCare || ''],
    [],
    ['【現状】'],
    [formData.currentStatus || ''],
    [],
    ['【今後の取り組み】'],
    [formData.futureApproach || ''],
    [],
    ['【特記事項】'],
    [formData.specialNotes || ''],
  ];

  if (correctedText) {
    rows.push([], ['【AI添削済み報告文】'], [correctedText]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [col(25), col(35), col(20), col(25)];
  XLSX.utils.book_append_sheet(wb, ws, '施術報告書');

  XLSX.writeFile(wb, `施術報告書_${patient.name}_${formData.recordDate || '未設定'}.xlsx`);
}
