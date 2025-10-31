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
 * Get current locale configuration
 * @returns {Object} Current locale configuration
 */
function getCurrentLocale() {
  return LOCALE_CONFIG;
}

/**
 * Get currency format configuration for a specific currency
 * @param {string} currency - The currency code (EUR, VND, USD)
 * @returns {Object} Currency format configuration
 */
function getCurrencyFormat(currency = null) {
  const currentCurrency = currency || LOCALE_CONFIG.currency;
  return LOCALE_CONFIG.currencyFormat[currentCurrency] || LOCALE_CONFIG.currencyFormat.EUR;
}

function convertAmountToDefaultCurrency(amount, currency = null) {
  const fromCurrency = (currency || '').toUpperCase();
  const toCurrency = (LOCALE_CONFIG.currency || 'EUR').toUpperCase();
  return convertCurrency(amount, fromCurrency, toCurrency);
}

/**
 * Convert an amount between two currencies using live rates with caching
 * @param {number} amount - Numeric amount to convert
 * @param {string} fromCurrency - Source currency code (e.g. USD)
 * @param {string} toCurrency - Target currency code (e.g. VND)
 * @returns {number} Converted amount (rounded according to target currency format)
 */
function convertCurrency(amount, fromCurrency, toCurrency) {
  try {
    if (!amount || !fromCurrency || !toCurrency || fromCurrency === toCurrency) {
      return Math.round(amount * 100) / 100;
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    // Check cache first
    const cache = CacheService.getScriptCache();
    const cacheKey = `fx_${from}_${to}_${amount}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return parseFloat(cached);
    }

    // Build API URL with amount, from, to, and access_key
    const keyParam = (typeof EXRATE_API !== 'undefined' && EXRATE_API) ? `&access_key=${encodeURIComponent(EXRATE_API)}` : '';
    const url = `https://api.exchangerate.host/convert?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${keyParam}`;
    
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, method: 'get' });
    const status = response.getResponseCode();
    
    if (status >= 200 && status < 300) {
      const data = JSON.parse(response.getContentText());
      if (data && data.success && data.result) {
        const converted = parseFloat(data.result);
        if (!isNaN(converted) && converted > 0) {
          // Round according to target currency format
          const decimals = (getCurrencyFormat(to).decimals || 2);
          const factor = Math.pow(10, decimals);
          const rounded = Math.round(converted * factor) / factor;
          
          // Cache for 1 hour
          cache.put(cacheKey, rounded.toString(), 60 * 60);
          return rounded;
        }
      }
    }

    Logger.log(`Failed to convert ${amount} ${from} to ${to}. Status: ${status}`);
    return amount;
  } catch (error) {
    Logger.log(`convertCurrency error: ${error.toString()}`);
    return amount;
  }
}

/**
 * Get currency example from configuration
 * @param {string} currency - The currency code (optional, uses current locale if not provided)
 * @returns {string} Currency example string
 */
function getInputCurrencyExample(currency = null) {  
  const format = getCurrencyFormat(currency);  
  return format.input_example || formatCurrency(20, currency);
}

function getOutputCurrencyExample(currency = null) {  
  const format = getCurrencyFormat(currency);  
  return format.output_example || formatCurrency(20, currency);
}

/**
 * Get language configuration for a specific language
 * @param {string} language - The language code (optional, uses current locale if not provided)
 * @returns {Object} Language configuration
 */
function getLanguageConfig(language = null) {
  const currentLanguage = language || LOCALE_CONFIG.language;
  return LOCALE_CONFIG.languageConfig[currentLanguage] || LOCALE_CONFIG.languageConfig.vi;
}

/**
 * Get current language instruction
 * @param {string} language - The language code (optional, uses current locale if not provided)
 * @returns {string} Language instruction string
 */
function getLanguageInstruction(language = null) {
  const config = getLanguageConfig(language);
  return config.languageInstruction;
}

/**
 * Get current date format
 * @param {string} language - The language code (optional, uses current locale if not provided)
 * @returns {string} Date format string
 */
function getDateFormat(language = null) {
  const config = getLanguageConfig(language);
  return config.dateFormat;
}

/**
 * Get current time format
 * @param {string} language - The language code (optional, uses current locale if not provided)
 * @returns {string} Time format string
 */
function getTimeFormat(language = null) {
  const config = getLanguageConfig(language);
  return config.timeFormat;
}

/**
 * Format number with locale-specific separators
 * @param {number} number - The number to format
 * @param {string} currency - The currency code (optional, uses current locale if not provided)
 * @returns {string} Formatted number string
 */
function formatNumber(number, currency = null) {
  try {
    const format = getCurrencyFormat(currency);
    const { thousandsSeparator, decimalSeparator, decimals } = format;
    
    // Round to specified decimal places
    const roundedNumber = Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    
    // Convert to string and split by decimal point
    const numberStr = roundedNumber.toString();
    const parts = numberStr.split('.');
    
    // Format integer part with thousands separator
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    // Handle decimal part
    let decimalPart = '';
    if (decimals > 0 && parts.length > 1) {
      decimalPart = decimalSeparator + parts[1].padEnd(decimals, '0').substring(0, decimals);
    } else if (decimals > 0 && parts.length === 1) {
      decimalPart = decimalSeparator + '0'.repeat(decimals);
    }
    
    return integerPart + decimalPart;
  } catch (error) {
    Logger.log(`Error formatting number: ${error.toString()}`);
    return number.toString();
  }
}

/**
 * Format currency amount based on locale
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (optional, uses current locale if not provided)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = null) {
  try {
    const format = getCurrencyFormat(currency);
    const { symbol, position } = format;
    const formattedNumber = formatNumber(amount, currency);
    
    if (position === 'before') {
      return `${symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${symbol}`;
    }
  } catch (error) {
    Logger.log(`Error formatting currency: ${error.toString()}`);
    return amount.toString();
  }
}

/**
 * Parse currency string to number
 * @param {string} currencyString - The currency string to parse
 * @param {string} currency - The currency code (optional, uses current locale if not provided)
 * @returns {number} Parsed number
 */
function parseCurrency(currencyString, currency = null) {
  try {
    const format = getCurrencyFormat(currency);
    const { symbol, thousandsSeparator, decimalSeparator } = format;
    
    // Remove currency symbol
    let cleanString = currencyString.replace(new RegExp(`\\${symbol}`, 'g'), '');
    
    // Remove thousands separators
    if (thousandsSeparator) {
      cleanString = cleanString.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '');
    }
    
    // Replace decimal separator with dot for parsing
    if (decimalSeparator && decimalSeparator !== '.') {
      cleanString = cleanString.replace(new RegExp(`\\${decimalSeparator}`, 'g'), '.');
    }
    
    return parseFloat(cleanString) || 0;
  } catch (error) {
    Logger.log(`Error parsing currency: ${error.toString()}`);
    return 0;
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
    const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`([^\\\\])${escapedChar}`, 'g');
    converted = converted.replace(regex, `$1\\${char}`);
    
    // Also handle characters at the beginning of the string
    const startRegex = new RegExp(`^${escapedChar}`, 'g');
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


