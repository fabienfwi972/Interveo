// === Rapport de fin de chantier — Apps Script (Code.gs) v1.2 ===
// Ajouts v1.2 : sections Meubles/Électroménager/Prestation du poseur
// avec menus déroulants et champs dynamiques (commentaire ou "À la charge du client").

const SETTINGS = {
  DRIVE_PHOTO_FOLDER_ID: '1VNK-FIxFCKdwA2tRo2OCyrFmTPmBWa_0',
  RAPPORT_SHEET_ID: '',
  RAPPORT_SHEET_NAME: 'Rapports_Pose',
  AVIVA_LOGO_FILE_ID: '',
  SENDER_NAME: 'Intervéo — Rapports de pose',
  POSEURS: {
    'Fabien': 'belkai97200@gmail.com',
    'Mendel': 'mendle.marchand@cuisines-aviva.com'
  }
};

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const id = params.id || '';
  const tmpl = HtmlService.createTemplateFromFile('formulaire');
  tmpl.prefillJson = JSON.stringify(loadReportById_(id));
  tmpl.poseurs = JSON.stringify(Object.keys(SETTINGS.POSEURS));
  return tmpl.evaluate()
    .setTitle('Rapport de fin de chantier')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveReport(form, isFinal) {
  if (!form) throw new Error('Formulaire vide.');
  const sheet = getOrCreateSheet_();
  const now = new Date();
  const id = form.id && String(form.id).trim() !== '' ? String(form.id) : Utilities.getUuid();

  // Upload photos générales
  const photoFolder = getPhotoFolder_();
  const photoFileIds = [];
  if (Array.isArray(form.photos)) {
    form.photos.forEach((p, idx) => {
      if (!p || !p.dataUrl) return;
      const blob = dataUrlToBlob_(p.dataUrl, p.name || ('photo_' + (idx+1)));
      const file = photoFolder.createFile(blob);
      file.setName(safeName_(form.clientName) + '_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + (idx+1));
      photoFileIds.push(file.getId());
    });
  }

  const record = buildRecordRow_(id, form, photoFileIds, now, isFinal);
  upsertRow_(sheet, id, record);

  if (!isFinal) {
    return { 
      status: 'draft_saved', 
      id, 
      resumeUrl: ScriptApp.getService().getUrl() + '?id=' + encodeURIComponent(id) 
    };
  }

  const pdfBlob = buildPdf_(form, photoFileIds, now);
  const pdfName = makePdfName_(form, now);
  pdfBlob.setName(pdfName + '.pdf');
  const pdfFile = DriveApp.getRootFolder().createFile(pdfBlob);

  const toEmails = collectRecipients_(form);
  const body = [
    'Bonjour,',
    '',
    'Veuillez trouver ci-joint le rapport de fin de chantier.',
    '',
    'Client : ' + (form.clientName || ''),
    'Date des travaux : ' + (form.workDate || ''),
    'Adresse : ' + [form.siteAddress, form.siteZip, form.siteCity].filter(Boolean).join(' '),
    '',
    'Cordialement,',
    SETTINGS.SENDER_NAME
  ].join('\n');

  if (toEmails.length > 0) {
    MailApp.sendEmail({
      to: toEmails.join(','),
      subject: 'Rapport de fin de chantier — ' + (form.clientName || '') + ' — ' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
      body: body,
      name: SETTINGS.SENDER_NAME,
      attachments: [pdfBlob]
    });
  }

  updateStatus_(sheet, id, 'Final', pdfFile.getUrl());
  return { status: 'final_saved', id, pdfUrl: pdfFile.getUrl() };
}

function getOrCreateSheet_() {
  let ss;
  if (SETTINGS.RAPPORT_SHEET_ID && SETTINGS.RAPPORT_SHEET_ID.trim() !== '') {
    ss = SpreadsheetApp.openById(SETTINGS.RAPPORT_SHEET_ID);
  } else {
    const files = DriveApp.getFilesByName('Rapports_Pose_Auto');
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create('Rapports_Pose_Auto');
    }
  }
  let sheet = ss.getSheetByName(SETTINGS.RAPPORT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SETTINGS.RAPPORT_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Statut','Horodatage',
      'Client','Email client','Téléphone',
      'Poseur','Email poseur','Date travaux',
      'Adresse chantier','CP','Ville',
      'PDF URL','Photos (IDs)',
      'Meubles JSON','Electro JSON','Prestation poseur JSON',
      'Données JSON'
    ]);
  }
  return sheet;
}

function getPhotoFolder_() {
  return DriveApp.getFolderById(SETTINGS.DRIVE_PHOTO_FOLDER_ID);
}

function upsertRow_(sheet, id, record) {
  const data = sheet.getDataRange().getValues();
  const idx = data.findIndex(r => r[0] === id);
  if (idx >= 0) {
    sheet.getRange(idx+1,1,1,record.length).setValues([record]);
  } else {
    sheet.appendRow(record);
  }
}

function updateStatus_(sheet, id, statut, pdfUrl) {
  const data = sheet.getDataRange().getValues();
  const idx = data.findIndex(r => r[0] === id);
  if (idx >= 0) {
    if (statut) sheet.getRange(idx+1, 2).setValue(statut);
    if (pdfUrl) sheet.getRange(idx+1, 13).setValue(pdfUrl);
  }
}

function buildRecordRow_(id, form, photoFileIds, now, isFinal) {
  const tz = Session.getScriptTimeZone();
  const poseurEmail = resolvePoseurEmail_(form.poseur);
  return [
    id,
    isFinal ? 'Final' : 'Brouillon',
    Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss'),
    form.clientName || '',
    form.clientEmail || '',
    form.clientPhone || '',
    form.poseur || '',
    poseurEmail || '',
    form.workDate || '',
    form.siteAddress || '',
    form.siteZip || '',
    form.siteCity || '',
    '', // PDF URL
    (photoFileIds || []).join(','),
    JSON.stringify(form.meubles || {}),
    JSON.stringify(form.electromenager || {}),
    JSON.stringify(form.prestaPoseur || {}),
    JSON.stringify(form || {})
  ];
}

function resolvePoseurEmail_(poseurName) {
  if (!poseurName) return '';
  const email = SETTINGS.POSEURS[poseurName];
  return email || '';
}

function collectRecipients_(form) {
  const arr = [];
  const poseurEmail = resolvePoseurEmail_(form.poseur);
  if (poseurEmail) arr.push(poseurEmail);
  if (form.clientEmail) arr.push(form.clientEmail);
  return arr.filter(Boolean);
}

function safeName_(s) {
  if (!s) return 'rapport';
  return String(s).replace(/[\\/:*?"<>|]/g, '_').trim();
}

function makePdfName_(form, now) {
  const tz = Session.getScriptTimeZone();
  const stamp = Utilities.formatDate(now, tz, 'yyyyMMdd_HHmmss');
  return 'Rapport_pose_' + safeName_(form.clientName || 'client') + '_' + stamp;
}

function dataUrlToBlob_(dataUrl, defaultName) {
  const matches = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!matches) throw new Error('DataURL invalide.');
  const mime = matches[1] || 'application/octet-stream';
  const b64 = matches[2];
  const bytes = Utilities.base64Decode(b64);
  const blob = Utilities.newBlob(bytes, mime, defaultName || 'file');
  return blob;
}

function loadReportById_(id) {
  if (!id) return null;
  const sheet = getOrCreateSheet_();
  const data = sheet.getDataRange().getValues();
  const idx = data.findIndex(r => r[0] === id);
  if (idx < 0) return null;
  const row = data[idx];
  try {
    const json = JSON.parse(row[18] || '{}');
    json.id = row[0];
    return json;
  } catch (err) {
    return null;
  }
}

function buildPdf_(form, photoFileIds, now) {
  const tz = Session.getScriptTimeZone();
  const ctx = {
    logoDataUrl: getLogoDataUrl_(),
    clientName: form.clientName || '',
    clientEmail: form.clientEmail || '',
    clientPhone: form.clientPhone || '',
    poseur: form.poseur || '',
    workDate: form.workDate || '',
    siteAddress: form.siteAddress || '',
    siteZip: form.siteZip || '',
    siteCity: form.siteCity || '',
    meubles: form.meubles || {},
    electromenager: form.electromenager || {},
    prestaPoseur: form.prestaPoseur || {},
    commentaires: form.commentaires || '',
    divers: form.divers || '',
    createdAt: Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm'),
    photos: (photoFileIds || []).map(id => ({id, url: 'https://drive.google.com/uc?export=view&id=' + id})),
    signatureClient: form.signature || '',
    signaturePoseur: form.signaturePoseur || ''
  };
  const html = HtmlService.createTemplateFromFile('template_pdf').evaluate().getContent();
  const filled = html.replace('__DATA__', JSON.stringify(ctx));
  const blob = Utilities.newBlob(filled, 'text/html', 'rapport.html');
  const pdf = blob.getAs('application/pdf');
  return pdf;
}

function getLogoDataUrl_() {
  if (!SETTINGS.AVIVA_LOGO_FILE_ID) return '';
  try {
    const f = DriveApp.getFileById(SETTINGS.AVIVA_LOGO_FILE_ID);
    const blob = f.getBlob();
    const b64 = Utilities.base64Encode(blob.getBytes());
    return 'data:' + blob.getContentType() + ';base64,' + b64;
  } catch (err) {
    return '';
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
