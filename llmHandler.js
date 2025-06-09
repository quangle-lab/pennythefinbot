//xử lý các API calls với LLM (v0.3 hỗ trợ OpenAI /responses)

//phân loại giao dịch
function classifyTransactionWithOpenAI(subject, body) {
  const apiKey = OPENAI_TOKEN;

  // Sử dụng prompt builder từ promptsHandler
  const promptData = generateClassifyTransactionPrompt(subject, body);

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      model: 'gpt-4.1',
      input: [
        { role: "system", content: promptData.systemMessage },
        { role: "user", content: promptData.userMessage }
      ],
      temperature: 0.5,
    }),
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

//phân tích dữ liệu (giao dịch, dự toán)
function analyseDataWithOpenAI(promptData) {
  const apiKey = OPENAI_TOKEN;

  const payload = {
    model: "gpt-4.1", 
    input: [
      { role: "system", content: promptData.systemMessage},
      { role: "user", content: promptData.userMessage }
    ],
    temperature: 0.5
  };

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
    return json.output[0].content[0].text;
  } catch (e) {
    return "😱Không thể phân tích. Đã xảy ra lỗi." + e;
  }
}

//xác định ý định trong yêu cầu của người sử dụng
function detectUserIntentWithOpenAI(originalText, replyText) {  
  const apiKey = OPENAI_TOKEN;
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  //build the prompt
  const promptData = generateIntentDetectionPrompt(originalText, replyText);
  
  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: promptData.systemMessage
      },
      {
        role: "user",
        content: promptData.userMessage
      }
    ],
    temperature: 0.5
  };

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

  try {    
    return JSON.parse(content);
  } catch (e) {
    return {intent: "unknown"};
  }
}

//xác định prompt để cải thiện phân loại giao dịch
function detectNewContextWithOpenAI(originalTx, originalText, replyText) {
  const apiKey = OPENAI_TOKEN;

  // Sử dụng prompt builder từ promptsHandler
  const promptData = generateDetectNewContextPrompt(originalTx, originalText, replyText);

  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: promptData.systemMessage
      },
      {
        role: "user",
        content: promptData.userMessage
      }
    ],
    temperature: 0.6
  };

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
  Logger.log (content);

  try {
    return JSON.parse(content);
  } catch (e) {
    return { intent: "unknown" };
  }
}

//xác định khả năng thực hiện mục tiêu
function checkAffordabilityWithOpenAI(item, amount, category, group, timeframe) {
  const apiKey = OPENAI_TOKEN;

  // Sử dụng prompt builder từ promptsHandler
  const promptData = generateAffordabilityAnalysisPrompt(item, amount, category, group, timeframe);

  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: promptData.systemMessage
      },
      {
        role: "user",
        content: promptData.userMessage
      }
    ],
    temperature: 0.7
  };

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
  Logger.log (content);

  return content;
}