const TELEGRAM_TOKEN = 'N/A';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const CHAT_ID = '-n/a';
const THREAD_ID = 'n/a'; //Topic Cập nhật chi tiêu trong Telegram
const SPREADSHEET_ID = 'n/a';
const OPENAI_TOKEN = 'N/A'

function processReplies() {
  const props = PropertiesService.getScriptProperties();
  const lastUpdateId = props.getProperty('lastUpdateId') || '0';
  const response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${parseInt(lastUpdateId) + 1}`);
  const updates = JSON.parse(response.getContentText());

  for (const update of updates.result) {
    if (!update.message || !update.message.reply_to_message) continue;

    const reply = update.message.text;
    const original = update.message.reply_to_message.text;
    const match = original.match(/row ID: (.+)/);
    if (!match) continue;

    const [sheetName, rowId] = match[1].split('|');
    const interpretation = classifyReplyWithAI(reply);

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    const row = parseInt(rowId);
    sheet.getRange(row, 5).setValue(interpretation.category);
    sheet.getRange(row, 6).setValue(interpretation.note);

    props.setProperty('lastUpdateId', update.update_id.toString());
  }
}

function botReporting() {

}

function reportTx(date, note, amount, location, category, tx, targetSheet) {
  const message = `📆*${date}* tại 📍*${location}*\n 💸*${amount} EUR* sử dụng cho *${note}*\n✏️Phân loại *${category}* vào *${targetSheet}*\n _🗒️Ghi chú từ ngân hàng: ${tx}_\n`;
  const payload = {
    chat_id: CHAT_ID,
    message_thread_id: THREAD_ID,
    parse_mode: `Markdown`,
    text: message,
  };
  UrlFetchApp.fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  });
}

function reportDailySummary() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  //const sheetsToCheck = ["🛒Chi phí biến đổi", "🏡Chi phí cố định"];
  const sheetsToCheck = ["🛒Chi phí biến đổi"];
  let totalPlanned = 0;
  let totalActual = 0;
  let totalTransactions = 0;
  let messages = [];

  for (const name of sheetsToCheck) {
    const sheet = ss.getSheetByName(name);
    const data = sheet.getDataRange().getValues();
    let actual = 0;
    let planned = 0;
    let count = 0;

    for (let i = 1; i < data.length; i++) {
      if (Utilities.formatDate(data[i][0], "dd/MM/yyyy") === today) {
        count++;
        const amount = parseFloat(data[i][2]) || 0;
        const plannedValue = parseFloat(data[i][3]) || 0;
        actual += amount;
        planned += plannedValue;
      }
    }
    totalActual += actual;
    totalPlanned += planned;
    totalTransactions += count;

    messages.push(`📊 ${name} có ${count} giao dịch hôm nay\nThực chi: ${actual.toFixed(2)} EUR\nDự chi: ${planned.toFixed(2)} EUR`);
  }

  const finalMessage = `📅 Báo cáo chi tiêu ngày ${today}\n${messages.join("\n\n")}\n\n🧾 Tổng: ${totalTransactions} giao dịch\n💰 Thực chi: ${totalActual.toFixed(2)} EUR\n📋 Dự chi: ${totalPlanned.toFixed(2)} EUR`;

  const payload = {
    chat_id: CHAT_ID,
    message_thread_id: THREAD_ID,
    parse_mode: `Markdown`,
    text: finalMessage,
  };
  UrlFetchApp.fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  });
}

