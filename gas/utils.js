// Utility functions for Penny the Finance Bot
// Core utility functions for image processing, data formatting, and common operations

/**
 * Convert image blob to base64 string
 * @param {Blob} photoBlob - The image blob to convert
 * @returns {string} Base64 encoded string
 */
function convertImageToBase64(photoBlob) {
  try {
    const base64 = Utilities.base64Encode(photoBlob.getBytes());
    return base64;
  } catch (error) {
    Logger.log(`Error converting image to base64: ${error.toString()}`);
    throw new Error(`Failed to convert image to base64: ${error.toString()}`);
  }
}

/**
 * Validate image format before processing
 * @param {Blob} imageBlob - The image blob to validate
 * @returns {boolean} True if valid image format
 */
function validateImageFormat(imageBlob) {
  try {
    const contentType = imageBlob.getContentType();
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/octet-stream'];
    return validTypes.includes(contentType.toLowerCase());
  } catch (error) {
    Logger.log(`Error validating image format: ${error.toString()}`);
    return false;
  }
}

/**
 * Format currency amount based on locale
 * @param {number} amount - The amount to format
 * @param {string} locale - The locale (EUR, VND, etc.)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, locale = 'EUR') {
  try {
    switch (locale.toUpperCase()) {
      case 'EUR':
        return `€${amount.toFixed(2)}`;
      case 'VND':
        return `${amount.toLocaleString('vi-VN')} VND`;
      default:
        return `${amount.toFixed(2)} ${locale}`;
    }
  } catch (error) {
    Logger.log(`Error formatting currency: ${error.toString()}`);
    return `${amount}`;
  }
}

/**
 * Generate unique transaction ID
 * @returns {string} Unique transaction ID
 */
function generateTransactionId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `TX${timestamp}${random}`;
  }

/**
 * Download photo from Telegram API
 * @param {string} fileId - Telegram file ID
 * @returns {Blob} Downloaded photo blob
 */
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

/**
 * Process receipt photo and extract transaction data
 * @param {string} fileId - Telegram file ID
 * @param {string} userMessage - Optional user message with the photo
 * @returns {Object} Result object with success status and data/error
 */
function processReceiptPhoto(fileId, userMessage = "") {
  try {
    // Download the photo
    const photoBlob = getTelegramPhoto(fileId);
    
    // Validate image format
    if (!validateImageFormat(photoBlob)) {
      return {
        success: false,
        error: "Định dạng ảnh không được hỗ trợ. Vui lòng gửi ảnh JPG, PNG, GIF hoặc WebP."
      };
    }
    
    // Convert to base64
    const base64Image = convertImageToBase64(photoBlob);
    
    // Analyze the receipt using OpenAI Vision API
    const analysisResult = analyzeReceiptPhoto(base64Image, userMessage);
    
    if (!analysisResult.success) {
      return {
        success: false,
        error: analysisResult.error
      };
    }
    
    // Process the extracted transaction data
    const transactionData = analysisResult.data;
    const addResult = addConfirmedTransaction(transactionData.tab, {
      type: transactionData.type,
      date: transactionData.date,
      description: transactionData.desc,
      amount: transactionData.amount,
      location: transactionData.location,
      category: transactionData.category,
      bankComment: transactionData.comment || "từ ảnh hóa đơn"
    });
    
    if (!addResult.success) {
      return {
        success: false,
        error: addResult.error
      };
    }
    
    return {
      success: true,
      message: addResult.message,
      data: transactionData
    };
    
  } catch (error) {
    Logger.log(`Error in handleReceiptPhoto: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi xử lý ảnh hóa đơn: ${error.toString()}`
    };
  }
}

//--------- TELEGRAM BUTTON UTILITIES --------------//

/**
 * Create a delete button for a transaction
 * @param {string} transactionId - The transaction ID
 * @param {string} sheetName - The sheet name where the transaction is stored
 * @returns {Object} Telegram inline keyboard button object
 */
function createDeleteButton(transactionId, sheetName) {
  return {
    text: "🗑️Xóa",
    callback_data: `delete_${transactionId}_${sheetName}`
  };
}

/**
 * Create a keep transaction button for keeping the new transaction
 * @param {string} transactionId - The transaction ID
 * @returns {Object} Telegram inline keyboard button object
 */
function createKeepButton(transactionId) {
  return {
    text: "✅Giữ",
    callback_data: `keep_${transactionId}`
  };
}

/**
 * Parse callback data from Telegram button clicks
 * @param {string} callbackData - The callback data from the button click
 * @returns {Object} Parsed data with action, transactionId, sheetName, and transactionData
 */
function parseCallbackData(callbackData) {
  try {
    const parts = callbackData.split('_');
    
    if (parts.length >= 3 && parts[0] === 'delete') {
      return {
        action: 'delete',
        transactionId: parts[1],
        sheetName: parts.slice(2).join('_'), // Handle sheet names with underscores
        transactionData: null,
        existingRows: null
      };
    } else if (parts.length >= 2 && parts[0] === 'keep') {
      return {
        action: 'keep',
        transactionId: parts[1],
        sheetName: null,
        transactionData: null,
        existingRows: null
      };
    } else if (parts.length >= 4 && parts[0] === 'del' && parts[1] === 'existing') {
      return {
        action: 'delete_existing',
        transactionId: parts[2],
        sheetName: parts[3],
        transactionData: null,
        existingRows: parts.slice(4).join('_') // Handle multiple row numbers
      };
    }
    
    return {
      action: 'unknown',
      transactionId: null,
      sheetName: null,
      transactionData: null
    };
  } catch (error) {
    Logger.log(`Error parsing callback data: ${error.toString()}`);
    return {
      action: 'error',
      transactionId: null,
      sheetName: null,
      transactionData: null
    };
  }
}

/**
 * Format inline keyboard for Telegram API
 * @param {Array} buttons - Array of button objects
 * @returns {Object} Telegram inline keyboard markup object
 */
function formatInlineKeyboard(buttons) {
  return {
    inline_keyboard: [buttons]
  };
}

/**
 * Create a single-row inline keyboard with delete button
 * @param {string} transactionId - The transaction ID
 * @param {string} sheetName - The sheet name
 * @returns {Object} Telegram inline keyboard markup object
 */
function createDeleteKeyboard(transactionId, sheetName) {
  const deleteButton = createDeleteButton(transactionId, sheetName);
  return formatInlineKeyboard([deleteButton]);
}

/**
 * Create a confirmation keyboard with Delete Existing and Keep buttons
 * @param {string} transactionId - The new transaction ID
 * @param {string} sheetName - The sheet name
 * @param {string} existingRows - Comma-separated existing row numbers
 * @returns {Object} Telegram inline keyboard markup object
 */
function createDuplicateConfirmationKeyboard(transactionId, sheetName) {
  const deleteExistingButton = createDeleteButton(transactionId, sheetName);
  const keepButton = createKeepButton(transactionId);
  return {
    inline_keyboard: [[deleteExistingButton, keepButton]]
  };
}

//--------- MARKDOWN V2 FORMATTING --------------//
function escapeRegex(char) {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape special characters for Telegram MarkdownV2
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdownV2(text) {
  if (!text) return '';
  
  // Characters that need escaping in MarkdownV2
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  
  let escapedText = text.toString();
  
  // Escape each special character
  specialChars.forEach(char => {
    const regex = new RegExp('\\' + char, 'g');
    escapedText = escapedText.replace(regex, '\\' + char);
  });
  
  return escapedText;
}

/**
 * Format text as bold in MarkdownV2
 * @param {string} text - Text to make bold
 * @returns {string} Bold formatted text
 */
function formatBold(text) {
  if (!text) return '';
  return `*${escapeMarkdownV2(text)}*`;
}

/**
 * Format text as italic in MarkdownV2
 * @param {string} text - Text to make italic
 * @returns {string} Italic formatted text
 */
function formatItalic(text) {
  if (!text) return '';
  return `_${escapeMarkdownV2(text)}_`;
}

/**
 * Format text as underline in MarkdownV2
 * @param {string} text - Text to underline
 * @returns {string} Underlined formatted text
 */
function formatUnderline(text) {
  if (!text) return '';
  return `__${escapeMarkdownV2(text)}__`;
}

/**
 * Format text as strikethrough in MarkdownV2
 * @param {string} text - Text to strikethrough
 * @returns {string} Strikethrough formatted text
 */
function formatStrikethrough(text) {
  if (!text) return '';
  return `~${escapeMarkdownV2(text)}~`;
}

/**
 * Format text as spoiler in MarkdownV2
 * @param {string} text - Text to hide as spoiler
 * @returns {string} Spoiler formatted text
 */
function formatSpoiler(text) {
  if (!text) return '';
  return `||${escapeMarkdownV2(text)}||`;
}

/**
 * Format text as inline code in MarkdownV2
 * @param {string} text - Text to format as code
 * @returns {string} Code formatted text
 */
function formatInlineCode(text) {
  if (!text) return '';
  return `\`${escapeMarkdownV2(text)}\``;
}

/**
 * Format text as block quote in MarkdownV2
 * @param {string} text - Text to format as quote
 * @returns {string} Quote formatted text
 */
function formatBlockQuote(text) {
  if (!text) return '';
  const lines = text.toString().split('\n');
  return lines.map(line => `> ${escapeMarkdownV2(line)}`).join('\n');
}

/**
 * Convert MarkdownV1 to MarkdownV2 format
 * @param {string} text - Text with MarkdownV1 formatting
 * @returns {string} Text with MarkdownV2 formatting
 */
function convertToMarkdownV2(text) {
  if (!text) return '';
  
  let converted = text.toString();
  
  // Characters that must be escaped in MarkdownV2 (excluding formatting chars)
  const specialChars = ['[', ']', '(', ')', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  
  // Handle bold text: *text* -> *text* (preserve asterisks, escape content)
  converted = converted.replace(/\*([^*]+)\*/g, (match, content) => {
    // Only escape the content, keep the asterisks for formatting
    const escapedContent = escapeMarkdownV2(content);
    return `*${escapedContent}*`;
  });
  
  // Handle italic text: _text_ -> _text_ (preserve underscores, escape content)
  converted = converted.replace(/_([^_]+)_/g, (match, content) => {
    // Only escape the content, keep the underscores for formatting
    const escapedContent = escapeMarkdownV2(content);
    return `_${escapedContent}_`;
  });
  
  // Handle inline code: `text` -> `text` (preserve backticks, escape content)
  converted = converted.replace(/`([^`]+)`/g, (match, content) => {
    // Only escape the content, keep the backticks for formatting
    const escapedContent = escapeMarkdownV2(content);
    return '`' + escapedContent + '`';
  });
  
  // Handle strikethrough: ~text~ -> ~text~ (preserve tildes, escape content)
  converted = converted.replace(/~([^~]+)~/g, (match, content) => {
    // Only escape the content, keep the tildes for formatting
    const escapedContent = escapeMarkdownV2(content);
    return `~${escapedContent}~`;
  });
  
  // Handle links: [text](url) -> [text](url) (preserve brackets and parentheses, escape content)
  converted = converted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Only escape the content, keep the brackets and parentheses for formatting
    const escapedLinkText = escapeMarkdownV2(linkText);
    const escapedUrl = escapeMarkdownV2(url);
    return `[${escapedLinkText}](${escapedUrl})`;
  });
  
  // Now escape any remaining special characters that weren't part of MarkdownV1 formatting
  // We need to escape characters that are not already escaped
  specialChars.forEach(char => {
    // Create a regex that matches the character if it's not already escaped
    // Use a simpler approach that works in all JavaScript environments
    const regex = new RegExp(`([^\\\\])${char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    converted = converted.replace(regex, `$1\\${char}`);
    
    // Also handle characters at the beginning of the string
    const startRegex = new RegExp(`^${char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    converted = converted.replace(startRegex, `\\${char}`);
  });
  
  return converted;
}

/**
 * Format a message for Telegram MarkdownV2 with proper escaping
 * @param {string} message - Message to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted message
 */
function formatTelegramMessage(message, options = {}) {
  if (!message) return '';
  
  const {
    bold = [],
    italic = [],
    underline = [],
    strikethrough = [],
    spoiler = [],
    inlineCode = [],
    blockQuote = false
  } = options;
  
  let formatted = message.toString();
  
  // Apply formatting to specified text segments
  bold.forEach(text => {
    const escaped = escapeMarkdownV2(text);
    formatted = formatted.replace(new RegExp(escapeMarkdownV2(text), 'g'), `*${escaped}*`);
  });
  
  italic.forEach(text => {
    const escaped = escapeMarkdownV2(text);
    formatted = formatted.replace(new RegExp(escapeMarkdownV2(text), 'g'), `_${escaped}_`);
  });
  
  underline.forEach(text => {
    const escaped = escapeMarkdownV2(text);
    formatted = formatted.replace(new RegExp(escapeMarkdownV2(text), 'g'), `__${escaped}__`);
  });
  
  strikethrough.forEach(text => {
    const escaped = escapeMarkdownV2(text);
    formatted = formatted.replace(new RegExp(escapeMarkdownV2(text), 'g'), `~${escaped}~`);
  });
  
  spoiler.forEach(text => {
    const escaped = escapeMarkdownV2(text);
    formatted = formatted.replace(new RegExp(escapeMarkdownV2(text), 'g'), `||${escaped}||`);
  });
  
  inlineCode.forEach(text => {
    const escaped = escapeMarkdownV2(text);
    formatted = formatted.replace(new RegExp(escapeMarkdownV2(text), 'g'), `\`${escaped}\``);
  });
  
  // Apply block quote if requested
  if (blockQuote) {
    formatted = formatBlockQuote(formatted);
  }
  
  return formatted;
}

//--------- TRIGGER MANAGEMENT --------------//

/**
 * Create all required triggers for the Penny Finance Bot
 * This function creates triggers for automated tasks
 */
function createTriggers() {
  try {
    // Delete existing triggers first to avoid duplicates
    deleteAllTriggers();
    
    // Trigger 1: Check Telegram messages every minute
    ScriptApp.newTrigger('checkTelegramMessages')
      .timeBased()
      .everyMinutes(1)
      .create();
    
    // Trigger 2: Process bank alerts every 10 minutes
    ScriptApp.newTrigger('processBankAlerts')
      .timeBased()
      .everyMinutes(10)
      .create();
    
    // Trigger 3: Send weekly report every Saturday at 8:00 AM
    ScriptApp.newTrigger('sendWeeklyReport')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.SATURDAY)
      .atHour(8)
      .create();
    
    // Trigger 4: Initialize monthly budget on the 28th at 8:00 AM
    ScriptApp.newTrigger('initMonthlyBudget')
      .timeBased()      
      .onMonthDay(28)
      .atHour(8)
      .create();
    
    Logger.log('All triggers created successfully');
    return {
      success: true,
      message: 'All triggers created successfully'
    };
    
  } catch (error) {
    Logger.log(`Error creating triggers: ${error.toString()}`);
    return {
      success: false,
      error: `Failed to create triggers: ${error.toString()}`
    };
  }
}

/**
 * Delete all existing triggers to avoid duplicates
 */
function deleteAllTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
    });
    Logger.log(`Deleted ${triggers.length} existing triggers`);
  } catch (error) {
    Logger.log(`Error deleting triggers: ${error.toString()}`);
  }
}

/**
 * List all current triggers for debugging
 */
function listTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const triggerList = triggers.map(trigger => ({
      functionName: trigger.getHandlerFunction(),
      triggerSource: trigger.getTriggerSource(),
      eventType: trigger.getEventType()
    }));
    
    Logger.log('Current triggers:', triggerList);
    return triggerList;
  } catch (error) {
    Logger.log(`Error listing triggers: ${error.toString()}`);
    return [];
  }
}

//--------- MARKDOWN V2 TESTING --------------//

/**
 * Test the specific failing case
 */
function testFailingCase() {
  const failingInput = "💸Chi *€20.00* cho *Ăn cơm* _✏️🛒Chi phí biến đổi, mục 🍽️Ăn ngoài, ⚠️ đã vượt: €163.19_ _(ID: TX1758486580960896)_";
  const result = convertToMarkdownV2(failingInput);
  
  Logger.log('=== Testing Failing Case ===');
  Logger.log(`Input: ${failingInput}`);
  Logger.log(`Output: ${result}`);
  
  // Check if the output is valid MarkdownV2
  const hasUnescapedDots = /[^\\]\./.test(result);
  const hasUnescapedUnderscores = /[^\\]_/.test(result);
  const hasUnescapedAsterisks = /[^\\]\*/.test(result);
  
  Logger.log(`Has unescaped dots: ${hasUnescapedDots}`);
  Logger.log(`Has unescaped underscores: ${hasUnescapedUnderscores}`);
  Logger.log(`Has unescaped asterisks: ${hasUnescapedAsterisks}`);
  
  return result;
}

/**
 * Test the specific example from the user query
 */
function testUserExample() {
  const input = "💸Chi *€20.00* cho *Ăn cơm*\n _✏️🛒Chi phí biến đổi, mục 🍽️Ăn ngoài, ⚠️ đã vượt: €143.19_\n_(ID: TX1758488220914260)_";
  const expected = "💸Chi *€20\\.00* cho *Ăn cơm*\n_✏️🛒Chi phí biến đổi, mục 🍽️Ăn ngoài, ⚠️ đã vượt: €143\\.19_\n_\\(ID: TX1758488220914260\\)_";
  const result = convertToMarkdownV2(input);
  
  Logger.log('=== Testing User Example ===');
  Logger.log(`Input: ${input}`);
  Logger.log(`Expected: ${expected}`);
  Logger.log(`Output: ${result}`);
  Logger.log(`Match: ${result === expected}`);
  
  return {
    input: input,
    expected: expected,
    result: result,
    match: result === expected
  };
}

