//xử lý các API calls với LLM (v0.3 hỗ trợ OpenAI /responses)

//tạo payload OpenAI với conversation context
function createOpenAIPayload(systemMessage, userMessage, temperature = 0.5, includeContext = true) {
  const payload = {
    model: "gpt-4.1",    
    input: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    temperature: temperature
  };

  // Add conversation context if requested
  if (includeContext) {
    const context = getConversationContext();
    if (context.previous_response_id) {
      payload.previous_response_id = context.previous_response_id;
    }
  }

  return payload;
}

//--------- INTENT DETECTION --------------//
//xác định ý định trong yêu cầu của người sử dụng
function detectUserIntentWithOpenAI(originalText, replyText) {
  const apiKey = OPENAI_TOKEN;

  // Check if we need to reset conversation (new topic detection)
  resetConversationIfNeeded();

  // Log current conversation context for debugging
  logConversationContext();

  //build the prompt
  const promptData = generateIntentDetectionPrompt(originalText, replyText);

  // Create payload with conversation context
  const payload = createOpenAIPayload(promptData.systemMessage, promptData.userMessage, 0.6, false);

  const options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", options);
  Logger.log (response);

  const json = JSON.parse(response.getContentText());
  const content = json.output[0].content[0].text;

  // Update conversation context
  updateConversationContext(json.id, 'intent_detection');

  Logger.log (content);

  try {
    return JSON.parse(content);
  } catch (e) {
    return {intent: "unknown"};
  }
}

//--------- TRANSACTION CLASSIFICATION --------------//
//phân loại giao dịch
function classifyTransactionWithOpenAI(subject, body) {
  const apiKey = OPENAI_TOKEN;
  const props = PropertiesService.getScriptProperties();
  const previous_response_id = props.getProperty('previous_response_id') || '';

  // Sử dụng prompt builder từ promptsHandler
  const promptData = generateClassifyTransactionPrompt(subject, body);
  const payload = createOpenAIPayload(promptData.systemMessage, promptData.userMessage, 0.5, false);

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  try {
    const json = JSON.parse(response.getContentText());
    const reply = JSON.parse(json.output[0].content[0].text);
    return reply;
  } catch (e) {
    return {
      tab: '🛒 Chi phí biến đổi',
      category: 'Khác',
      note: 'Không phân loại được với AI',
    };
  }
}

//xác định prompt để cải thiện phân loại giao dịch
function detectNewContextWithOpenAI(originalTx, originalText, replyText) {
  const apiKey = OPENAI_TOKEN;
  const props = PropertiesService.getScriptProperties();
  const previous_response_id = props.getProperty('previous_response_id') || '';

  // Sử dụng prompt builder từ promptsHandler
  const promptData = generateDetectNewContextPrompt(originalTx, originalText, replyText);

  const payload = createOpenAIPayload (promptData.userMessage, promptData.systemMessage, 0.5, false)

  const options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", options);
  const json = JSON.parse(response.getContentText());
  const content = json.output[0].content[0].text;
  const new_response_id = json.id;
  props.setProperty('previous_response_id', new_response_id);
  Logger.log (content);

  try {
    return JSON.parse(content);
  } catch (e) {
    return { intent: "unknown" };
  }
}

//--------- DATA ANALYSIS --------------//
//phân tích dữ liệu (giao dịch, dự toán)
function analyseDataWithOpenAI(promptData) {
  const apiKey = OPENAI_TOKEN;

  // Create payload with conversation context
  const payload = createOpenAIPayload(promptData.systemMessage, promptData.userMessage, 0.5, false);

  const options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", options);
    const json = JSON.parse(response.getContentText());

    // Update conversation context
    updateConversationContext(json.id, 'data_analysis');

    Logger.log (json.output[0].content[0].text);

    return json.output[0].content[0].text;
  } catch (e) {
    return "😱Không thể phân tích. Đã xảy ra lỗi." + e;
  }
}

//xác định khả năng thực hiện mục tiêu
function checkAffordabilityWithOpenAI(replyText, item, amount, category, group, timeframe) {
  const apiKey = OPENAI_TOKEN;
  const props = PropertiesService.getScriptProperties();
  const previous_response_id = props.getProperty('previous_response_id') || '';

  // Sử dụng prompt builder từ promptsHandler
  const promptData = generateAffordabilityAnalysisPrompt(replyText, item, amount, category, group, timeframe);

  const payload = createOpenAIPayload (promptData.userMessage, promptData.systemMessage, 0.5, true)

  const options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", options);
  const json = JSON.parse(response.getContentText());
  const content = json.output[0].content[0].text;

  const new_response_id = json.id;
  props.setProperty('previous_response_id', new_response_id);
  
  Logger.log (content);

  return content;
}

//xử lý yêu cầu coaching tài chính
function handleFinancialCoachingWithAI(userQuestion) {
  const apiKey = OPENAI_TOKEN;

  // Check if we need to reset conversation (new coaching session)
  resetConversationIfNeeded();

  // Log current conversation context for debugging
  logConversationContext();

  // Build comprehensive coaching prompt with financial data
  const coachingPrompt = generateFinancialCoachingPrompt(userQuestion);

  // Create payload with conversation context
  const payload = createOpenAIPayload(coachingPrompt.systemMessage, coachingPrompt.userMessage, 0.7, false);

  const options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", options);

    Logger.log  (response);

    const json = JSON.parse(response.getContentText());
    const coachingAdvice = json.output[0].content[0].text;

    // Update conversation context
    updateConversationContext(json.id, 'financial_coaching');

    Logger.log('Financial Coaching Response:', coachingAdvice);

    return coachingAdvice;
  } catch (e) {
    return "😱 Không thể cung cấp lời khuyên tài chính. Đã xảy ra lỗi: " + e.toString();
  }
}

//--------- CONVERSATION CONTEXT --------------//

//quản lý conversation context với OpenAI
function getConversationContext() {
  const props = PropertiesService.getScriptProperties();
  return {
    previous_response_id: props.getProperty('previous_response_id') || '',
    conversation_start: props.getProperty('conversation_start') || '',
    last_interaction: props.getProperty('last_interaction') || ''
  };
}

//cập nhật context
function updateConversationContext(response_id, interaction_type = 'general') {
  const props = PropertiesService.getScriptProperties();
  const currentTime = new Date().getTime().toString();

  if (response_id) {
    props.setProperty('previous_response_id', response_id);
  }

  props.setProperty('last_interaction', currentTime);
  props.setProperty('last_interaction_type', interaction_type);

  // Set conversation start if not already set
  if (!props.getProperty('conversation_start')) {
    props.setProperty('conversation_start', currentTime);
  }
}

//reset context khi quá 30 phút
function resetConversationContext() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('previous_response_id');
  props.deleteProperty('conversation_start');
  props.deleteProperty('last_interaction');
  props.deleteProperty('last_interaction_type');
}

//log conversation context để debug
function logConversationContext() {
  const context = getConversationContext();
  Logger.log('Conversation Context:', {
    has_previous_response: !!context.previous_response_id,
    conversation_start: context.conversation_start,
    last_interaction: context.last_interaction,
    time_since_start: context.conversation_start ?
      (new Date().getTime() - parseInt(context.conversation_start)) / 1000 / 60 + ' minutes' : 'N/A'
  });
}

//reset conversation khi cần thiết (ví dụ: bắt đầu chủ đề mới)
function resetConversationIfNeeded(forceReset = false) {
  const props = PropertiesService.getScriptProperties();
  const lastInteraction = props.getProperty('last_interaction');
  const currentTime = new Date().getTime();

  // Reset conversation if:
  // 1. Forced reset
  // 2. No previous interaction
  // 3. Last interaction was more than 30 minutes ago
  const thirtyMinutes = 30 * 60 * 1000;

  if (forceReset ||
      !lastInteraction ||
      (currentTime - parseInt(lastInteraction)) > thirtyMinutes) {

    Logger.log('Resetting conversation context');
    resetConversationContext();
    return true;
  }

  return false;
}

