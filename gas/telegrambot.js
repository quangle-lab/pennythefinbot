//xử lý nhận và gửi tin nhắn với Telegram Bot

//check the messages from Telegram (tagging the bot or replying to the bot)
function checkTelegramMessages() {  
  //Telegram bot settings
  const telegramToken = TELEGRAM_TOKEN;
  const botUsername = BOT_USERNAME
  const props = PropertiesService.getScriptProperties();

  //Prompt settings
  //const promptsSettings = props.getProperty("sheet_ContextConfig") || '🤖Tùy chỉnh Prompts';
  
  //browse through all the messages
  const lastUpdateId = props.getProperty("telegram_lastUpdateId") || '0';
  const updatesUrl = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${parseInt(lastUpdateId) + 1}`;
  const response = UrlFetchApp.fetch(updatesUrl);
  const updates = JSON.parse(response.getContentText()).result || [];

  //const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  //for each update (messages and callback queries)
  for (const update of updates) {
    // Handle callback queries from inline keyboard buttons
    if (update.callback_query) {
      try {
        handleCallbackQuery(update.callback_query);
        // Update last processed update ID
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        continue;
      } catch (error) {
        Logger.log(`Error handling callback query: ${error.toString()}`);
        // Still update the last processed ID to avoid reprocessing
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        continue;
      }
    }
    
    // Handle regular messages
    if (!update.message) continue;
    const msg = update.message;    
    const replyText = msg.text || "";
    const hasPhoto = msg.photo && msg.photo.length > 0;
    const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from?.username === botUsername;
    const isMentioningBot = msg.entities?.some(e =>
      e.type === "mention" &&
      replyText.substring(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername.toLowerCase()}`
    );
    
    // Skip if not a reply to bot, not mentioning bot, and not a photo message
    if (!isReplyToBot && !isMentioningBot && !hasPhoto) continue;

    // Get the context of the original message
    const originalText = isReplyToBot ? msg.reply_to_message.text : "";

    // Handle photo messages differently
    if (hasPhoto) {
      try {
        // Get the highest resolution photo
        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;
        
        // Process the receipt photo
        const photoResult = processReceiptPhoto(fileId, replyText);
        
        if (photoResult.success) {
          sendTelegramMessage(photoResult.message);
        } else {
          sendTelegramMessage(`❌ Lỗi khi xử lý ảnh: ${photoResult.error}`);
        }
        
        // Update last processed update ID and continue to next message
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        continue;
        
      } catch (error) {
        sendTelegramMessage(`❌ Lỗi khi xử lý ảnh hóa đơn: ${error.toString()}`);
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        continue;
      }
    }

    // Step 1: Detect user intent using OpenAI
    const interpretation = detectUserIntent (originalText, replyText);
    sendLog(interpretation);

    if (!interpretation || !interpretation.intents) {
      sendTelegramMessage("😅 Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?");
      continue;
    }

    const intents = interpretation.intents || [];
    let allMessages = [];
    let allLogs = [];
    let hasError = false;
    let replyMarkup = null;

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

        // Collect reply markup if available
        if (actionResult.replyMarkup) {
          replyMarkup = actionResult.replyMarkup;
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
      sendTelegramMessage(finalMessage, replyMarkup);
    }

    if (allLogs.length > 0) {
      allLogs.forEach(log => sendLog(log));
    }
  
    // Update last processed update ID
    props.setProperty("telegram_lastUpdateId", update.update_id.toString());

  }
}

//send message to Telegram
function sendTelegramMessage (message, replyMarkup = null) {
  const props = PropertiesService.getScriptProperties();
  const debugChannel = props.getProperty("telegram_DebugChat") || '-4847069897';
  const debugMode = props.getProperty("debug_Mode") || 'off';

  var payload = {
      chat_id: CHAT_ID,
      message_thread_id: THREAD_ID,   
      parse_mode: `MarkdownV2`,
      text: convertToMarkdownV2(message),
  }
  
  // Add reply markup if provided
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  
  if (debugMode === 'on') {
    payload = {
      chat_id: debugChannel,
      parse_mode: `MarkdownV2`,
      text: convertToMarkdownV2(message),
    }
    // Add reply markup for debug mode too
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
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

//send log to Telegram
function sendLog (message) {
  const props = PropertiesService.getScriptProperties();
  const logChannel = props.getProperty("telegram_logsChat") || '-4826732207';
  const payload = {    
    chat_id: logChannel,
    parse_mode: `MarkdownV2`,
    text: message,
  };
  var response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });  
}

//send weekly report
function sendWeeklyReport () {
  var monthText = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");  
  const monthDashboardPrompt = generateExpenseAnalyticsPrompt("This is the automatic weekly report", monthText, "dashboard");
  const message = analyseDataWithOpenAI(monthDashboardPrompt);
  sendTelegramMessage (message);
}

//send monthly budget
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

//handle callback queries from inline keyboard buttons
function handleCallbackQuery(callbackQuery) {
  try {
    const { id, data, message } = callbackQuery;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    
    Logger.log(`Callback query received: ${data}`);
    
    // Parse the callback data
    const parsedData = parseCallbackData(data);
    
    if (parsedData.action === 'delete') {
      // Handle delete transaction
      const deleteResult = deleteTransactionById(parsedData.sheetName, parsedData.transactionId);
      
      if (deleteResult.success) {
        // Update the original message to show deletion confirmation
        const updatedMessage = `\~${convertToMarkdownV2(message.text)}\~\n🗑️*Đã xóa giao dịch*`;
        
        // Edit the original message
        editTelegramMessage(chatId, messageId, updatedMessage);
        
        // Answer the callback query
        answerCallbackQuery(id, "✅ Giao dịch đã được xóa");
        
        Logger.log(`Transaction deleted successfully: ${parsedData.transactionId}`);
      } else {
        // Handle deletion error
        answerCallbackQuery(id, `❌ Lỗi: ${deleteResult.error}`);
        Logger.log(`Failed to delete transaction: ${deleteResult.error}`);
      }
    } else if (parsedData.action === 'keep') {
      // Handle keep transaction (skip action)
      try {
        // Update the original message to show keep confirmation
        const updatedMessage = `_${convertToMarkdownV2(message.text)}_\n✅*Giữ giao dịch*`;
        
        // Edit the original message
        editTelegramMessage(chatId, messageId, updatedMessage);
        
        // Answer the callback query
        answerCallbackQuery(id, "✅ Đã giữ giao dịch");
        
        Logger.log(`Transaction kept: ${parsedData.transactionId}`);
      } catch (error) {
        answerCallbackQuery(id, "❌ Lỗi khi giữ giao dịch");
        Logger.log(`Error keeping transaction: ${error.toString()}`);
      }
    } else {
      // Unknown callback data
      answerCallbackQuery(id, "❌ Lệnh không được hỗ trợ");
      Logger.log(`Unknown callback data: ${data}`);
    }
    
  } catch (error) {
    Logger.log(`Error handling callback query: ${error.toString()}`);
    // Try to answer the callback query with error message
    try {
      answerCallbackQuery(callbackQuery.id, "❌ Đã xảy ra lỗi khi xử lý yêu cầu");
    } catch (answerError) {
      Logger.log(`Failed to answer callback query: ${answerError.toString()}`);
    }
  }
}

//edit a Telegram message
function editTelegramMessage(chatId, messageId, newText) {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: "MarkdownV2"
    };

    const response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    Logger.log(`Edit message response: ${response.getContentText()}`);
    return response;
    
  } catch (error) {
    Logger.log(`Error editing message: ${error.toString()}`);
    throw error;
  }
}

//answer a callback query
function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  try {
    const payload = {
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: showAlert
    };

    const response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    Logger.log(`Answer callback query response: ${response.getContentText()}`);
    return response;
    
  } catch (error) {
    Logger.log(`Error answering callback query: ${error.toString()}`);
    throw error;
  }
}





  






