//xử lý nhận và gửi tin nhắn với Telegram Bot

//========= MESSAGE PROCESSING =========//

/**
 * Process a single Telegram update (webhook or polling)
 * This is the main entry point for processing Telegram updates
 * @param {Object} update - Telegram Update object
 * @returns {Object} - Result object with success status
 */
function processTelegramUpdate(update) {
  if (!update || !update.update_id) {
    Logger.log('Invalid update object received');
    return { success: false, error: 'Invalid update object' };
  }

  const botUsername = BOT_USERNAME;
  const props = PropertiesService.getScriptProperties();

  try {
    // Handle callback queries from inline keyboard buttons
    if (update.callback_query) {
      try {
        handleCallbackQuery(update.callback_query);
        // Update last processed update ID for tracking (webhook doesn't need this but keeping for logs)
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        return { success: true };
      } catch (error) {
        Logger.log(`Error handling callback query: ${error.toString()}`);
        // Still update the last processed ID to avoid reprocessing
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        return { success: false, error: error.toString() };
      }
    }
    
    // Handle regular messages
    if (!update.message) {
      // Update ID for non-message updates (e.g., edited_message, channel_post)
      props.setProperty("telegram_lastUpdateId", update.update_id.toString());
      return { success: true, skipped: true };
    }

    const msg = update.message;    
    const replyText = msg.text || "";
    const hasPhoto = msg.photo && msg.photo.length > 0;
    const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from?.username === botUsername;
    const isMentioningBot = msg.entities?.some(e =>
      e.type === "mention" &&
      replyText.substring(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername.toLowerCase()}`
    );
    
    // Skip if not a reply to bot, not mentioning bot, and not a photo message
    if (!isReplyToBot && !isMentioningBot && !hasPhoto) {
      props.setProperty("telegram_lastUpdateId", update.update_id.toString());
      return { success: true, skipped: true };
    }

    // Get the context of the original message
    const originalText = isReplyToBot ? msg.reply_to_message.text : "";

    // Handle photo messages differently
    if (hasPhoto) {
      try {
        // Get the highest resolution photo
        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;
        
        // Process the receipt photo
        const photoResult = handleReceiptPhoto(fileId, replyText);
        
        if (photoResult.success) {
          sendTelegramMessage(photoResult.message, photoResult.replyMarkup);
        } else {
          sendTelegramMessage(`❌ Lỗi khi xử lý ảnh: ${photoResult.error}`);
        }
        
        // Update last processed update ID
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        return { success: true };
        
      } catch (error) {
        sendTelegramMessage(`❌ Lỗi khi xử lý ảnh hóa đơn: ${error.toString()}`);
        props.setProperty("telegram_lastUpdateId", update.update_id.toString());
        return { success: false, error: error.toString() };
      }
    }

    // Step 0: Check for project mode
    const projectResult = processProjectMode(originalText, replyText);
    
    // Step 1: Detect user intent using OpenAI
    let interpretation;
    if (projectResult.isProjectMode && projectResult.isProjectValid && projectResult.isProjectActive) {
      // Use project-specific intent detection (returns unified intents with project_tag)
      interpretation = detectProjectIntent(originalText, replyText, projectResult);
    } else if (projectResult.isProjectMode && (!projectResult.isProjectValid || !projectResult.isProjectActive)) {
      // Project mode detected but invalid/inactive
      const errorMessage = `❌ Dự án không hợp lệ hoặc không hoạt động: ${projectResult.error}`;
      sendTelegramMessage(errorMessage);
      props.setProperty("telegram_lastUpdateId", update.update_id.toString());
      return { success: true };
    } else {
      // Normal mode - use existing intent detection
      interpretation = detectUserIntent(originalText, replyText);
    }
    sendLog(interpretation);

    if (!interpretation || !interpretation.intents) {
      sendTelegramMessage("😅 Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?");
      props.setProperty("telegram_lastUpdateId", update.update_id.toString());
      return { success: true };
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
        // Note: project_tag is now in intentObj, no need for separate projectContext
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

    return { success: true };

  } catch (error) {
    Logger.log(`Error processing Telegram update ${update.update_id}: ${error.toString()}`);
    props.setProperty("telegram_lastUpdateId", update.update_id.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Polling-based message checking (backward compatibility / fallback)
 * This function polls Telegram's getUpdates API
 */
function checkTelegramMessagesPolling() {  
  const telegramToken = TELEGRAM_TOKEN;
  const props = PropertiesService.getScriptProperties();

  try {
    //browse through all the messages
    const lastUpdateId = props.getProperty("telegram_lastUpdateId") || '0';
    const updatesUrl = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${parseInt(lastUpdateId) + 1}`;
    const response = UrlFetchApp.fetch(updatesUrl);
    const updates = JSON.parse(response.getContentText()).result || [];

    // Process each update
    for (const update of updates) {
      processTelegramUpdate(update);
    }

    return { success: true, processed: updates.length };

  } catch (error) {
    Logger.log(`Error in checkTelegramMessagesPolling: ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Backward compatibility: Keep old function name pointing to polling
 * This ensures existing triggers continue to work
 */
function checkTelegramMessages() {
  return checkTelegramMessagesPolling();
}

//========= WEBHOOK HANDLER =========//

/**
 * Webhook entry point for Telegram updates (doPost)
 * This function is called by Telegram when a webhook is configured
 * @param {Object} e - Event object from Google Apps Script
 * @returns {TextOutput} - HTTP response
 */
function doPost(e) {
  try {
    // Validate request
    if (!e || !e.postData || !e.postData.contents) {
      Logger.log('Invalid webhook request: missing postData.contents');
      return ContentService.createTextOutput('Bad Request: Missing post data')
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Parse incoming update from Telegram
    let update;
    try {
      update = JSON.parse(e.postData.contents);
    } catch (parseError) {
      Logger.log(`Error parsing webhook JSON: ${parseError.toString()}`);
      return ContentService.createTextOutput('Bad Request: Invalid JSON')
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Validate update structure
    if (!update || typeof update !== 'object' || !update.update_id) {
      Logger.log('Invalid update structure received');
      return ContentService.createTextOutput('Bad Request: Invalid update structure')
        .setMimeType(ContentService.MimeType.TEXT);
    }

    // Phase 3: Validate secret token if configured
    // Note: Google Apps Script doesn't directly expose HTTP headers in doPost
    // Telegram sends the secret token in X-Telegram-Bot-Api-Secret-Token header
    // For Apps Script, we'll validate that the request comes from a valid Update structure
    // Secret token validation would require additional infrastructure or manual verification
    const props = PropertiesService.getScriptProperties();
    const expectedToken = props.getProperty('telegram_webhookSecret');
    
    if (expectedToken) {
      // In Google Apps Script, we cannot directly access custom HTTP headers
      // The secret token validation would need to be done at a proxy level
      // or we can validate based on other request characteristics
      // For now, we log that secret token is configured but validation is limited
      Logger.log('Secret token is configured. Note: Apps Script cannot directly validate custom headers.');
      // Additional validation can be added here based on update structure
      // For example, validating update_id format, message structure, etc.
    }

    // Process the update
    Logger.log(`Processing webhook update: ${update.update_id}`);
    const result = processTelegramUpdate(update);

    if (result.success) {
      // Return 200 OK to Telegram
      return HtmlService.createHtmlOutput('OK');
    } else {
      // Still return OK to Telegram even if processing had issues
      // (to avoid retries for processing errors, only network errors should retry)
      Logger.log(`Update processed with errors: ${result.error || 'Unknown error'}`);
      return HtmlService.createHtmlOutput('OK');
    }

  } catch (error) {
    Logger.log(`Critical error in doPost: ${error.toString()}`);
    // Return OK to prevent Telegram from retrying too aggressively
    // Real errors should be logged, not cause retries
    return ContentService.createTextOutput('OK')
      .setMimeType(ContentService.MimeType.TEXT);
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
    text: convertToMarkdownV2(message),
  };
  var response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });  

  Logger.log (response);
}

//send weekly report
function sendWeeklyReport () {
  var monthText = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");  
  const monthDashboardPrompt = generateExpenseAnalyticsPrompt("This is the automatic weekly report", monthText, "dashboard");
  const message = analyseData(monthDashboardPrompt);
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

function getTelegramPhoto(fileId) {
  try {
    const telegramToken = TELEGRAM_TOKEN;
    
    // Get file info from Telegram
    const fileInfoUrl = `https://api.telegram.org/bot${telegramToken}/getFile?file_id=${fileId}`;
    const fileInfoResponse = UrlFetchApp.fetch(fileInfoUrl);
    const fileInfo = JSON.parse(fileInfoResponse.getContentText());
    
    if (!fileInfo.ok) {
      throw new Error(`Failed to get file info: ${fileInfo.description}`);
    }
    
    // Download the file
    const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${fileInfo.result.file_path}`;
    const fileResponse = UrlFetchApp.fetch(fileUrl);
    
    return fileResponse.getBlob();
    
  } catch (error) {
    Logger.log(`Error downloading Telegram photo: ${error.toString()}`);
    throw new Error(`Failed to download photo: ${error.toString()}`);
  }
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

//========= WEBHOOK MANAGEMENT =========//

/**
 * Setup Telegram webhook
 * @param {string} webhookUrl - The URL where Telegram should send updates
 * @param {string} secretToken - Optional secret token for webhook security
 * @param {Array} allowedUpdates - Optional array of update types to receive
 * @returns {Object} - Result object with success status and message
 */
function setupTelegramWebhook(webhookUrl, secretToken = null, allowedUpdates = null) {
  try {
    if (!webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL is required'
      };
    }

    // Validate URL format
    if (!webhookUrl.startsWith('https://')) {
      return {
        success: false,
        error: 'Webhook URL must use HTTPS'
      };
    }

    const props = PropertiesService.getScriptProperties();
    const telegramToken = TELEGRAM_TOKEN;

    // Build payload for setWebhook
    const payload = {
      url: webhookUrl
    };

    // Add secret token if provided
    if (secretToken) {
      payload.secret_token = secretToken;
      // Store secret token in ScriptProperties
      props.setProperty('telegram_webhookSecret', secretToken);
    }

    // Add allowed updates if provided
    if (allowedUpdates && Array.isArray(allowedUpdates) && allowedUpdates.length > 0) {
      payload.allowed_updates = allowedUpdates;
    }

    // Call Telegram API to set webhook
    const response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseData = JSON.parse(response.getContentText());

    if (responseData.ok) {
      // Store webhook URL in ScriptProperties
      props.setProperty('telegram_webhookUrl', webhookUrl);
      
      Logger.log(`Webhook set successfully: ${webhookUrl}`);
      return {
        success: true,
        message: `Webhook set successfully: ${webhookUrl}`,
        description: responseData.description || 'Webhook is set',
        result: responseData.result
      };
    } else {
      Logger.log(`Failed to set webhook: ${responseData.description}`);
      return {
        success: false,
        error: responseData.description || 'Unknown error setting webhook',
        errorCode: responseData.error_code
      };
    }

  } catch (error) {
    Logger.log(`Error setting webhook: ${error.toString()}`);
    return {
      success: false,
      error: `Failed to set webhook: ${error.toString()}`
    };
  }
}

/**
 * Delete Telegram webhook (fallback to polling)
 * @returns {Object} - Result object with success status and message
 */
function deleteTelegramWebhook() {
  try {
    const telegramToken = TELEGRAM_TOKEN;
    const props = PropertiesService.getScriptProperties();

    // Call Telegram API to delete webhook
    const response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
      method: 'POST',
      contentType: 'application/json',
      muteHttpExceptions: true
    });

    const responseData = JSON.parse(response.getContentText());

    if (responseData.ok) {
      // Clear webhook URL from ScriptProperties
      props.deleteProperty('telegram_webhookUrl');
      // Optionally keep secret token for future use, or delete it:
      // props.deleteProperty('telegram_webhookSecret');
      
      Logger.log('Webhook deleted successfully');
      return {
        success: true,
        message: 'Webhook deleted successfully. Bot will use polling mode.',
        description: responseData.description || 'Webhook is removed'
      };
    } else {
      Logger.log(`Failed to delete webhook: ${responseData.description}`);
      return {
        success: false,
        error: responseData.description || 'Unknown error deleting webhook',
        errorCode: responseData.error_code
      };
    }

  } catch (error) {
    Logger.log(`Error deleting webhook: ${error.toString()}`);
    return {
      success: false,
      error: `Failed to delete webhook: ${error.toString()}`
    };
  }
}

/**
 * Get Telegram webhook information
 * @returns {Object} - Result object with webhook info
 */
function getTelegramWebhookInfo() {
  try {
    const telegramToken = TELEGRAM_TOKEN;

    // Call Telegram API to get webhook info
    const response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/getWebhookInfo`, {
      method: 'GET',
      muteHttpExceptions: true
    });

    const responseData = JSON.parse(response.getContentText());

    if (responseData.ok && responseData.result) {
      const webhookInfo = responseData.result;
      
      Logger.log(`Webhook info retrieved: ${JSON.stringify(webhookInfo)}`);
      return {
        success: true,
        url: webhookInfo.url || null,
        hasCustomCertificate: webhookInfo.has_custom_certificate || false,
        pendingUpdateCount: webhookInfo.pending_update_count || 0,
        lastErrorDate: webhookInfo.last_error_date || null,
        lastErrorMessage: webhookInfo.last_error_message || null,
        maxConnections: webhookInfo.max_connections || null,
        allowedUpdates: webhookInfo.allowed_updates || null,
        isSet: webhookInfo.url !== '' && webhookInfo.url !== null
      };
    } else {
      Logger.log(`Failed to get webhook info: ${responseData.description}`);
      return {
        success: false,
        error: responseData.description || 'Unknown error getting webhook info',
        errorCode: responseData.error_code
      };
    }

  } catch (error) {
    Logger.log(`Error getting webhook info: ${error.toString()}`);
    return {
      success: false,
      error: `Failed to get webhook info: ${error.toString()}`
    };
  }
}

//========= SECURITY =========//

/**
 * Generate a secure random secret token for webhook
 * @param {number} length - Length of the token (default: 32)
 * @returns {string} - Generated secret token
 */
function generateWebhookSecretToken(length = 32) {
  try {
    // Generate a secure random string using Apps Script's Utilities
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      token += chars.charAt(randomIndex);
    }
    
    Logger.log(`Generated webhook secret token (length: ${length})`);
    return token;
    
  } catch (error) {
    Logger.log(`Error generating secret token: ${error.toString()}`);
    throw new Error(`Failed to generate secret token: ${error.toString()}`);
  }
}

/**
 * Setup webhook with automatically generated secret token
 * This is a convenience function that generates and stores the token
 * @param {string} webhookUrl - The URL where Telegram should send updates
 * @param {number} tokenLength - Length of the secret token (default: 32)
 * @returns {Object} - Result object with success status, webhook URL, and secret token
 */
function setupTelegramWebhookWithSecret(webhookUrl, tokenLength = 32) {
  try {
    // Generate secret token
    const secretToken = generateWebhookSecretToken(tokenLength);
    
    // Setup webhook with secret token
    const setupResult = setupTelegramWebhook(webhookUrl, secretToken);
    
    if (setupResult.success) {
      return {
        success: true,
        message: setupResult.message,
        webhookUrl: webhookUrl,
        secretToken: secretToken,
        description: setupResult.description
      };
    } else {
      return {
        success: false,
        error: setupResult.error,
        errorCode: setupResult.errorCode
      };
    }
    
  } catch (error) {
    Logger.log(`Error setting up webhook with secret: ${error.toString()}`);
    return {
      success: false,
      error: `Failed to setup webhook with secret: ${error.toString()}`
    };
  }
}

/**
 * Get the stored webhook secret token
 * @returns {string|null} - The secret token or null if not set
 */
function getWebhookSecretToken() {
  try {
    const props = PropertiesService.getScriptProperties();
    return props.getProperty('telegram_webhookSecret') || null;
  } catch (error) {
    Logger.log(`Error getting webhook secret token: ${error.toString()}`);
    return null;
  }
}

/**
 * Update webhook secret token (regenerate and update)
 * Note: This requires the webhook to be updated via setupTelegramWebhook
 * @param {number} tokenLength - Length of the new secret token (default: 32)
 * @returns {Object} - Result object with new secret token
 */
function regenerateWebhookSecretToken(tokenLength = 32) {
  try {
    const props = PropertiesService.getScriptProperties();
    const webhookUrl = props.getProperty('telegram_webhookUrl');
    
    if (!webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL found. Please setup webhook first.'
      };
    }
    
    // Generate new secret token
    const newSecretToken = generateWebhookSecretToken(tokenLength);
    
    // Update webhook with new secret token
    const updateResult = setupTelegramWebhook(webhookUrl, newSecretToken);
    
    if (updateResult.success) {
      return {
        success: true,
        message: 'Webhook secret token regenerated and updated successfully',
        secretToken: newSecretToken
      };
    } else {
      return {
        success: false,
        error: `Failed to update webhook with new secret token: ${updateResult.error}`
      };
    }
    
  } catch (error) {
    Logger.log(`Error regenerating webhook secret token: ${error.toString()}`);
    return {
      success: false,
      error: `Failed to regenerate secret token: ${error.toString()}`
    };
  }
}

//========= WEBHOOK MONITORING =========//

/**
 * Monitor webhook status and send report to Telegram log channel
 * This function is called by a scheduled trigger to monitor webhook health
 * @returns {Object} - Result object with monitoring status
 */
function monitorWebhookStatus() {
  try {
    const props = PropertiesService.getScriptProperties();
    const webhookUrl = props.getProperty('telegram_webhookUrl');
    
    // Check if webhook is configured
    if (!webhookUrl) {
      const message = `🔍 Webhook Monitor\n\n⚠️ Webhook is not configured. Bot is using polling mode`;
      sendLog(message);
      return {
        success: true,
        message: 'Webhook not configured, monitoring skipped'
      };
    }
    
    // Get webhook information from Telegram
    const webhookInfo = getTelegramWebhookInfo();
    
    if (!webhookInfo.success) {
      const message = `🔍 Webhook Monitor\n\n❌ Error checking webhook status:\n${webhookInfo.error || 'Unknown error'}`;
      sendLog(message);
      return {
        success: false,
        error: webhookInfo.error
      };
    }
    
    // Build status message (plain text, will be converted to MarkdownV2)
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    let statusMessage = `*🔍 Webhook Monitor at ${timestamp}\n*`;
    
    // Webhook status
    if (webhookInfo.isSet && webhookInfo.url) {
      statusMessage += `✅ Active\n`;
      const urlPreview = webhookInfo.url.substring(0, 50) + '<truncated>';
      statusMessage += `📍 URL: ${urlPreview}\n`;
    } else {
      statusMessage += `❌ Webhook Not Set\n`;
    }
    
    // Pending updates
    statusMessage += `⚠️ Pending Updates: ${webhookInfo.pendingUpdateCount}\n`;          
    
    // Last error (if any)
    if (webhookInfo.lastErrorMessage) {
      const errorDate = webhookInfo.lastErrorDate 
        ? Utilities.formatDate(new Date(webhookInfo.lastErrorDate * 1000), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss")
        : "Unknown";
      statusMessage += `❌ Last Error:\n`;
      statusMessage += `Time: ${errorDate}\n`;
      statusMessage += `Message: ${webhookInfo.lastErrorMessage}\n`;
    } else {
      statusMessage += `✅ No Recent Errors\n`;
    }
    
    // Additional info
    if (webhookInfo.hasCustomCertificate) {
      statusMessage += `🔒 Custom Certificate: Yes\n`;
    }
    
    if (webhookInfo.maxConnections) {
      statusMessage += `📊 Max Connections: ${webhookInfo.maxConnections}\n`;
    }
    
    // Convert to MarkdownV2 and send log to Telegram
    sendLog(statusMessage);
    
    // Log to Apps Script logger
    Logger.log(`Webhook monitoring completed: ${webhookInfo.isSet ? 'Active' : 'Not Set'}, Pending: ${webhookInfo.pendingUpdateCount}`);
    
    return {
      success: true,
      webhookInfo: webhookInfo,
      message: 'Webhook status monitored and logged'
    };
    
  } catch (error) {
    Logger.log(`Error monitoring webhook status: ${error.toString()}`);
    const errorMessage = `🔍 Webhook Monitor\n\n❌ Error:\n${error.toString()}`;
    sendLog(errorMessage);
    return {
      success: false,
      error: `Failed to monitor webhook: ${error.toString()}`
    };
  }
}




  






