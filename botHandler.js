//xử lý nhận và gửi tin nhắn với Telegram Bot

//kiểm tra và xác định yêu cầu từ tin nhắn reply hoặc có mention bot
function checkTelegramMessages() {  
  //Telegram bot settings
  const telegramToken = TELEGRAM_TOKEN;
  const botUsername = BOT_USERNAME
  const props = PropertiesService.getScriptProperties();

  //Prompt settings
  const promptsSettings = props.getProperty("sheet_ContextConfig") || '🤖Tùy chỉnh Prompts';
  const debugChat = props.getProperty("telegram_DebugChat") || '-4847069897';
  
  //lấy tin nhắn từ Telegram
  const lastUpdateId = props.getProperty("telegram_lastUpdateId") || '0';
  const updatesUrl = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${parseInt(lastUpdateId) + 1}`;
  const response = UrlFetchApp.fetch(updatesUrl);
  const updates = JSON.parse(response.getContentText()).result || [];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  for (const update of updates) {
    if (!update.message) continue;
    const msg = update.message;    
    const replyText = msg.text || "";
    const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from?.username === botUsername;
    const isMentioningBot = msg.entities?.some(e =>
      e.type === "mention" &&
      replyText.substring(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername.toLowerCase()}`
    );
    if (!isReplyToBot && !isMentioningBot) continue;

    // Lấy context (nội dung gốc nếu có)
    const originalText = isReplyToBot ? msg.reply_to_message.text : "";

    // Dùng OpenAI để phân tích danh sách ý định     
    const interpretation = detectUserIntentWithOpenAI (originalText, replyText);
    sendLog (interpretation);    

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const intents = interpretation.intents || [];

    let allConfirmed = true;
    let confirmationLines = [];
    let confirmation = "";

    let hasError = false;

    intents.forEach((intentObj, index) => {
      if (hasError) return;

      const intent = intentObj.intent;

      if (!intent || intent === "unknown") {
        hasError = true;
        allConfirmed = false;
        confirmation = `🤖 Không xác định được ý định số ${index + 1}. Bạn có thể xác nhận lại toàn bộ yêu cầu không?`;
        return;
      }

      try {
        switch (intent) {
          case "modifyTx": {
            const { tab, newtab, row } = intentObj;
            const sheet = ss.getSheetByName(tab);
            if (!sheet) throw `❌ Không tìm thấy sheet "${tab}".`;

            const current = {
              date: sheet.getRange(row, 1).getValue(),
              desc: sheet.getRange(row, 2).getValue(),
              amount: sheet.getRange(row, 3).getValue(),
              location: sheet.getRange(row, 4).getValue(),
              category: sheet.getRange(row, 5).getValue(),
              comment: sheet.getRange(row, 6).getValue(),
            };

            if (!newtab) {
              sheet.getRange(row, 1).setValue(intentObj.date || current.date);
              sheet.getRange(row, 2).setValue(intentObj.desc || current.desc);
              sheet.getRange(row, 3).setValue(intentObj.amount || current.amount);
              sheet.getRange(row, 4).setValue(intentObj.location || current.location);
              sheet.getRange(row, 5).setValue(intentObj.category || current.category);
              sheet.getRange(row, 6).setValue(intentObj.comment || current.comment);
            } else {
              const newSheet = ss.getSheetByName(newtab);
              newSheet.appendRow([
                current.date,
                current.desc,
                current.amount,
                current.location,
                intentObj.category,
                current.comment,
              ]);
              sheet.deleteRow(row);
            }

            const promptsSettingsTab = ss.getSheetByName(promptsSettings);          
            const instruction = detectNewContextWithOpenAI(current, originalText, replyText);

            if (
              instruction.instructionGroup &&
              instruction.instructionName &&
              instruction.instructionContent
            ) {
              promptsSettingsTab.appendRow([
                instruction.instructionGroup,
                instruction.instructionName,
                instruction.instructionContent,
              ]);
              sendLog (instruction);
            }

            confirmationLines.push(intentObj.confirmation || `✅ Đã cập nhật giao dịch ở tab ${tab}, dòng ${row}`);
            break;
          }

          case "deleteTx": {
            const { tab, row } = intentObj;
            const sheet = ss.getSheetByName(tab);
            sheet.deleteRow(row);
            confirmationLines.push(intentObj.confirmation || `🗑️ Đã xoá giao dịch ở tab ${tab}, dòng ${row}`);
            break;
          }

          case "addTx": {
            const { tab } = intentObj;
            const sheet = ss.getSheetByName(tab);
            if (!sheet) throw `❌ Không tìm thấy sheet "${tab}".`;

            const dateTx = intentObj.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
            const lastRow = sheet.getLastRow();

            sheet.appendRow([
              dateTx,
              intentObj.desc,
              intentObj.amount,
              intentObj.location,
              intentObj.category,
              intentObj.comment,
              intentObj.suggestion
            ]);

            const rowID = lastRow + 1;
            
            confirmationLines.push(intentObj.confirmation || `✏️ Đã thêm *${intentObj.amount} EUR* cho *${intentObj.desc}* vào ${tab}, dòng ${rowID}`);
            break;
          }

          case "getMonthlyReport": {
            let monthText = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");
            if (intentObj.month && intentObj.year) {
              monthText = `${intentObj.month}/${intentObj.year}`;
            }

            const dashboardPrompt = generateExpenseAnalyticsPrompt(monthText, "dashboard");
            const result = analyseDataWithOpenAI(dashboardPrompt);
            confirmationLines.push(intentObj.confirmation || result);
            break;
          }

          case "getFundBalance": {
            const result = getFundBalances(); // optional: add month input
            confirmationLines.push(intentObj.confirmation || `🏦 Số dư các quỹ:\n${result}`);
            break;
          }

          case "getExCatTx": {
            const result = getExCatTx(intentObj.group, intentObj.category, intentObj.monthText);
            confirmationLines.push(intentObj.confirmation || `💰 Giao dịch: ${result}`);
            break;
          }

          case "createBudget": {
            const { sourceMonth, month } = intentObj;
            const confirmation = createNewBudget(month, sourceMonth);
            confirmationLines.push(intentObj.confirmation || confirmation);

            let budgetPrompt = generateBudgetAnalyticsPrompt (month, sourceMonth);  
            let budgetAnlyticsResp = analyseDataWithOpenAI (budgetPrompt);
            confirmationLines.push(budgetAnlyticsResp);

            break;
          }

          case "modifyBudget": {
            const { month, changes } = intentObj;
            const lines = [];

            changes.forEach(change => {
              const category = change.category;
              const group = change.group;
              const note = change["ghi chú"];
              const amount = parseFloat(change.amount.replace(/[€\s]/g, ""));
              const line = setBudgetChange(month, group, category, amount, note);
              lines.push(line);
            });

            confirmationLines.push(intentObj.confirmation || lines.join("\n"));
            break;
          }

          default: {
            confirmationLines.push(intentObj.confirmation || intentObj.reply || `🤖 Tôi chưa hiểu rõ yêu cầu "${intent}".`);
            Logger.log (intentObj.reply);
            break;
          }
        }
      } catch (err) {
        hasError = true;
        allConfirmed = false;
        confirmation = `⚠️ Lỗi khi xử lý intent thứ ${index + 1}: ${err}`;
      }
    });

    // Kết quả cuối cùng
    if (allConfirmed) {
      confirmation = confirmationLines.join("\n\n");
      sendTelegramMessage (confirmation);
    }
  
    // Cập nhật updateId
    props.setProperty("telegram_lastUpdateId", update.update_id.toString());

  }
}

//gửi tin nhắn Telegram
function sendTelegramMessage (message) {
  const props = PropertiesService.getScriptProperties();
  //const debugChannel = props.getProperty("telegram_DebugChat") || '-4847069897';

  const payload = {
    chat_id: CHAT_ID,
    message_thread_id: THREAD_ID,
    //chat_id: debugChannel,
    parse_mode: `Markdown`,
    text: message,
  };
  var response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });  
}

//gửi log Telegram
function sendLog (message) {
  const props = PropertiesService.getScriptProperties();
  const logChannel = props.getProperty("telegram_logsChat") || '-4826732207';
  const payload = {    
    chat_id: logChannel,
    parse_mode: `Markdown`,
    text: message,
  };
  var response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });  
}

//gửi tin nhắn báo cáo chi tiêu hàng tuần
function sendWeeklyReport () {
  var monthText = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");  
  const monthDashboardPrompt = generateExpenseAnalyticsPrompt(monthText, "dashboard");
  const message = analyseDataWithOpenAI(monthDashboardPrompt);
  sendTelegramMessage (message);
}

//tạo dự toán tháng mới và gửi thông báo vào ngày 27 hàng tháng
function initMonthlyBudget () {
  const monthFormat = "MM/yyyy";

  const now = new Date();
  const thisMonthText = Utilities.formatDate(now, Session.getScriptTimeZone(), monthFormat);

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthText = Utilities.formatDate(nextMonth, Session.getScriptTimeZone(), monthFormat);

  //tạo budget tháng mới trong Tab dự toán
  let confirmationNewBudget = createNewBudget (nextMonthText, thisMonthText);
  sendTelegramMessage (confirmationNewBudget);

  //phân tích điểm cần cải thiện của dự toán tháng mới và gửi cho người dùng
  let budgetPrompt = generateBudgetAnalyticsPrompt (nextMonthText, thisMonthText);  
  let budgetAnlyticsResp = analyseDataWithOpenAI (budgetPrompt);
  
  sendTelegramMessage (budgetAnlyticsResp);
}





  






