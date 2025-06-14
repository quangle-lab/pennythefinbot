//xử lý nhận và gửi tin nhắn với Telegram Bot

//kiểm tra và xác định yêu cầu từ tin nhắn reply hoặc có mention bot
function checkTelegramMessages() {  
  //Telegram bot settings
  const telegramToken = TELEGRAM_TOKEN;
  const botUsername = BOT_USERNAME
  const props = PropertiesService.getScriptProperties();

  //Prompt settings
  const promptsSettings = props.getProperty("sheet_ContextConfig") || '🤖Tùy chỉnh Prompts';
  
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

    // Step 1: Detect user intent using OpenAI
    const interpretation = detectUserIntentWithOpenAI(originalText, replyText);
    sendLog(interpretation);

    if (!interpretation || !interpretation.intents) {
      sendTelegramMessage("😅 Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?");
      continue;
    }

    const intents = interpretation.intents || [];
    let allMessages = [];
    let allLogs = [];
    let hasError = false;

    // Step 2: Process each intent through actionHandler
    intents.forEach((intentObj, index) => {
      if (hasError) return;

      const intent = intentObj.intent;

      if (!intent || intent === "unknown") {
        hasError = true;
        const errorMessage = `🤖 Không xác định được ý định số ${index + 1}. Bạn có thể xác nhận lại toàn bộ yêu cầu không?`;
        allMessages.push(errorMessage);
        return;
      }

      try {
        // Step 3: Call action handler for each intent
        const actionResult = handleIntent(intentObj, originalText, replyText);

        // Collect messages and logs
        if (actionResult.messages && actionResult.messages.length > 0) {
          allMessages = allMessages.concat(actionResult.messages);
        }

        if (actionResult.logs && actionResult.logs.length > 0) {
          allLogs = allLogs.concat(actionResult.logs);
        }

        // Log any errors
        if (!actionResult.success) {
          Logger.log(`Action failed for intent ${intentObj.intent}: ${actionResult.messages.join(', ')}`);
        }

      } catch (err) {
        hasError = true;
        const errorMessage = `⚠️ Lỗi khi xử lý intent thứ ${index + 1}: ${err}`;
        allMessages.push(errorMessage);
        Logger.log(`Error processing intent ${intent}: ${err}`);
      }
    });

    // Step 4: Send messages and logs
    if (allMessages.length > 0) {
      const finalMessage = allMessages.join("\n\n");
      sendTelegramMessage(finalMessage);
    }

    if (allLogs.length > 0) {
      allLogs.forEach(log => sendLog(log));
    }
  
    // Cập nhật updateId
    props.setProperty("telegram_lastUpdateId", update.update_id.toString());

  }
}

//gửi tin nhắn Telegram
function sendTelegramMessage (message) {
  const props = PropertiesService.getScriptProperties();
  const debugChannel = props.getProperty("telegram_DebugChat") || '-4847069897';
  const debugMode = props.getProperty("debug_Mode") || 'off';

  var payload = {
      chat_id: CHAT_ID,
      message_thread_id: THREAD_ID,   
      parse_mode: `Markdown`,
      text: message,
  }
  if (debugMode === 'on') {
    payload = {
      chat_id: debugChannel,
      parse_mode: `Markdown`,
      text: message,
    }
  }

  var response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

  Logger.log (response);

  return;
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

//tạo dự toán tháng mới và gửi thông báo hàng tháng
function initMonthlyBudget () {
  const monthFormat = "MM/yyyy";

  const now = new Date();
  const thisMonthText = Utilities.formatDate(now, Session.getScriptTimeZone(), monthFormat);

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthText = Utilities.formatDate(nextMonth, Session.getScriptTimeZone(), monthFormat);

  //tạo budget tháng mới trong Tab dự toán
  let creationResult = createBudgetSelectively(nextMonthText, thisMonthText);
  if (creationResult.summary) {
    sendTelegramMessage(creationResult.summary);
  } else if (creationResult.error) {
    sendTelegramMessage(creationResult.error);
  }

  //phân tích điểm cần cải thiện của dự toán tháng mới và gửi cho người dùng
  let budgetPrompt = generateBudgetAnalyticsPrompt (nextMonthText, thisMonthText);  
  let budgetAnlyticsResp = analyseDataWithOpenAI (budgetPrompt);
  
  sendTelegramMessage (budgetAnlyticsResp);
}





  






