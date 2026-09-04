/**
 * Review Desk — backend em Google Apps Script
 * Guarda os reviews numa aba "Reviews" da planilha vinculada a este script.
 * Mesmo padrão do contador de e-mails: o site estático (index.html) fala com
 * este Web App por GET (listar) e POST (adicionar/atualizar), e este script
 * lê e escreve na planilha.
 *
 * SETUP — leia o README.md para o passo a passo completo. Resumo:
 * 1. Crie uma Google Sheet nova (pode deixar em branco, a aba é criada sozinha).
 * 2. Extensões > Apps Script. Apague o conteúdo de Code.gs e cole este arquivo inteiro.
 * 3. Troque SHARED_SECRET abaixo por uma senha sua (qualquer texto, sem espaços).
 * 4. Implantar > Nova implantação > tipo "App da Web".
 *      Executar como: Eu (sua conta)
 *      Quem tem acesso: Qualquer pessoa
 * 5. Autorize o script quando o Google pedir. Copie a URL do Web App gerada.
 * 6. Cole essa URL em CONFIG.API_URL no index.html, e a mesma senha em CONFIG.SHARED_SECRET.
 *
 * Sempre que você editar este arquivo, é preciso "Nova implantação" de novo
 * (ou Gerenciar implantações > editar > Nova versão) pra publicar a mudança.
 */

const SHEET_NAME = 'Reviews';
const SHARED_SECRET = '6cSr5yJ2Ce6NqWy5YghMLamDZHPU';

const HEADERS = [
  'id', 'created_at', 'updated_at', 'store', 'stars',
  'review_date', 'review_link', 'ticket_link',
  'status', 'owner', 'risk', 'notes'
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach(function (h, i) { obj[h] = row[i]; });
  return obj;
}

function readAll_() {
  const sheet = getSheet_();
  const range = sheet.getDataRange().getValues();
  const headers = range[0];
  return range.slice(1)
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) { return rowToObject_(headers, r); });
}

function findRowIndexById_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // +2: linha de cabeçalho + índice 1-based
  }
  return -1;
}

function makeId_() {
  const stamp = Utilities.formatDate(new Date(), 'UTC', 'yyMMdd');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return 'R-' + stamp + '-' + rand;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'list';
    if (action === 'list') {
      return jsonOut_({ ok: true, rows: readAll_() });
    }
    return jsonOut_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (body.secret !== SHARED_SECRET) {
      return jsonOut_({ ok: false, error: 'unauthorized' });
    }
    const sheet = getSheet_();
    const now = new Date().toISOString();

    if (body.action === 'add') {
      const d = body.data || {};
      const id = makeId_();
      const row = [
        id, now, now,
        d.store || '', d.stars || '', d.review_date || '',
        d.review_link || '', d.ticket_link || '',
        d.status || 'Investigando', d.owner || '',
        d.risk ? 'TRUE' : 'FALSE', d.notes || ''
      ];
      sheet.appendRow(row);
      return jsonOut_({ ok: true, row: rowToObject_(HEADERS, row) });
    }

    if (body.action === 'update') {
      const idx = findRowIndexById_(sheet, body.id);
      if (idx === -1) return jsonOut_({ ok: false, error: 'not_found' });
      const current = sheet.getRange(idx, 1, 1, HEADERS.length).getValues()[0];
      const currentObj = rowToObject_(HEADERS, current);
      const d = body.data || {};
      const merged = Object.assign({}, currentObj, d, { updated_at: now });
      if ('risk' in d) merged.risk = d.risk ? 'TRUE' : 'FALSE';
      const newRow = HEADERS.map(function (h) { return merged[h]; });
      sheet.getRange(idx, 1, 1, HEADERS.length).setValues([newRow]);
      return jsonOut_({ ok: true, row: rowToObject_(HEADERS, newRow) });
    }

    return jsonOut_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
