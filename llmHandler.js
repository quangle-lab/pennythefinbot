//xử lý các API calls với LLM (v0.3 hỗ trợ OpenAI /responses)

//phân loại giao dịch
function classifyTransactionWithAI(subject, body) {
  const apiKey = OPENAI_TOKEN;
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  //tạo prompt hoàn cảnh và phân loại
  //const contextPrompt = generateContextExpensePrompt ();
  const familyContext = getFamilyContext ();
  const catInstructions = getCategoriseInstructions ();  
  const catPrompt = getTxCat ();

  let mainPrompt = `
  ${familyContext}
  \n${catInstructions} 
  \n${catPrompt}

  - Tiêu đề email: ${subject}
  - Nội dung email: ${body}

  Trả về kết quả dưới dạng JSON 9 khóa sau, không có dấu code block, không có lời giải thích: 
    - tab: tên tab cần thêm giao dịch đúng như trong danh sách
    - category: mục theo đúng tên mục như mô tả
    - type: có 2 giá trị "🤑Thu" hoặc "💸Chi"
    - date: ngày phát sinh giao dịch theo định dạng DD/MM/YYYY
    - desc: ghi chú về giao dịch, ngắn gọn, tối đa 30 ký tự
    - amount: số tiền giao dịch theo định dạng €20.00 (bỏ dấu + hay - nếu cần thiết)
    - location: thành phố nơi phát sinh giao dịch, nếu không đoán được thì ghi N/A
    - bankcomment: trích chú thích Ngân hàng, chỉ ghi thông tin địa điểm phát sinh giao dịch    
  `; 

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      model: 'gpt-4.1',
      input: [
        { role: "system", content: `Bạn là một cố vấn tài chính cá nhân. Bạn đang đọc email thông báo giao dịch của ngân hàng để phân loại giúp khách hàng.Mốc thời gian hiện tại là  ${currentTime}` },
        { role: "user", content: mainPrompt }
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
function analyseDataWithOpenAI(promptText) {
  const apiKey = OPENAI_TOKEN;
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  const payload = {
    model: "gpt-4.1", 
    input: [
      { role: "system", content: `
      Bạn là một chuyên gia tài chính cá nhân đang trao đổi với khách hàng qua Telegram. 
      Mốc thời gian hiện tại là tháng ${currentTime}
      Hãy dựa vào mục tiêu của khách hàng, phân tích thẳng thắng, rõ ràng để giúp khách hoàn thành mục tiêu tài chính cá nhân của mình.`},
      { role: "user", content: promptText }
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
function detectUserIntentWithOpenAI(promptText) {  
  const apiKey = OPENAI_TOKEN;
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");
  
  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: `Bạn là một cố vấn tài chính cá nhân đang trao đổi với khách hàng qua Telegram và Email. Mốc thời gian hiện tại là tháng ${currentTime}.`
      },
      {
        role: "user",
        content: promptText
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

//xác định prompt để cải thiện nhận diện
function detectNewContextWithAI(originalTx, originalText, replyText) {  

  const apiKey = OPENAI_TOKEN    
  const originalTxDesc = `Đây là giao dịch gốc ngày ${originalTx.date}, miêu tả: ${originalTx.desc}, số tiền: ${originalTx.amount}, nơi phát sinh: ${originalTx.location}, mục phân loại: ${originalTx.category}, ghi chú của ngân hàng: ${originalTx.comment} `;
  const userText = `Tin nhắn của bạn: ${originalText}\nPhản hồi của khách hàng: ${replyText}\n`


  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext ();
  const categoriseInstructions = getCategoriseInstructions ();
  const categories = getTxCat ();
  
  let mainPrompt = `
  Hướng dẫn:
  \n${familyContext}
  \n${categoriseInstructions}
  \n${categories}

  Đây là thông tin giao dịch gốc ${originalTxDesc}\n
  Đây là tin nhắn của bạn kèm phàn hồi của khách hàng ${userText}\n  

  Hãy 
  - so sánh giữa tin nhắn gốc, tin phản hồi của của khách hàng và thông tin giao dịch gốc
  - so sánh với các hướng dẫn trong phần Chỉ dẫn phân loại. 
      - Nếu đã tồn tại instructionGroup, instructionName, instructionContent có giá trị tương tự trong phần Hướng dẫn, trả về JSON với giá trị "" cho tất cả các khóa.
      - Nếu chưa tồn tại chỉ dẫn, ghi lại điểm cần lưu ý để lần sau bạn có thể phân loại giao dịch chính xác hơn mà không cần hướng dẫn của người dùng và trả lại JSON theo cấu trúc sau, không có dấu code block
      {
        "instructionGroup": có 1 trong 3 giá trị: 
          - "Hoàn cảnh": bổ sung thông tin về hoàn cảnh gia đình như thành phần gia đình, con cái, nhà cửa
          - "Chỉ dẫn phân loại": bổ sung thông tin để việc phân loại tốt hơn như nơi phát sinh giao dịch,các địa điểm, cửa hàng và các mục tương ứng
          - "Chỉ dẫn dự toán": bổ sung thông tin để việc phân loại tốt hơn như nơi phát sinh giao dịch, các địa điểm, cửa hàng và các mục tương ứng
        "instructionName": tên của topic, ví dụ: 
            Hoàn cảnh: Gia đinh, con cái, xe, thú cưng, thói quen sống
            Chỉ dẫn phân loại: hướng dẩn để cải thiện phân loại dựa trên phần hồi của khách hàng, ghi chú gốc của ngân hàng
        "instructionContent": điểm cần lưu ý để lần sau bạn có thể phân loại giao dịch chính xác hơn
        Ví dụ: 
          "instructionGroup":"Chỉ dẫn phân loại"
          "instructionName":"Hoàn tiền bảo hiểm"	
          "instructionContent":"GENERATION là tiền hoàn bảo hiểm, ghi vào mục Thu trong Quỹ gia đình"
      }
  `   

  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: `Bạn là một chuyên gia tài chính cá nhân. Mốc thời gian hiện tại là ${currentTime}
        - Bạn phân loại các giao dịch của khách hàng và ghi chú những tiêu chí cần thiết để luôn luôn cải thiện việc phân loại giao dịch. 
        - Bạn chỉ có quyền phân loại sai 1 lần. Bạn phải ghi chép cụ thể hướng dẫn để đảm bảo lỗi phân loại sai không diễn ra lần nữa mà không cần khách hàng xác nhận.`                
      },
      {
        role: "user",
        content: mainPrompt
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

/*//phân loại tin trả lời v0.2
function classifyReplyWithAI(originalMsg, replyMsg) {
  const apiKey = OPENAI_TOKEN;

  //tạo prompt hoàn cảnh và phân loại
  const contextprompt = generateContextPrompt ();
  const catprompt = generateTxCatPrompt ();

  const mainprompt = `
  ${contextprompt}
  \n${catprompt}
  
  Tin nhắn thông báo biến động tài khoản và tin phản hồi của chủ tài khoản như sau. 
   - Tin nhắn thông báo: ${originalMsg}
   - Tin nhắn phản hồi: ${replyMsg}

  Bạn là chuyên gia cố vấn tài chính cá nhân, căn cứ vào Hướng dẫn phân loại trên  đây, xác định hành động cần làm trong tin nhắn phản hồi, trả về kết quả dưới dạng JSON 10 khóa sau, không có dấu code block, không có lời giải thích: 
    - action: tên hành động cần làm, chọn 1 trong 3 giá trị sau
        - update: sửa dòng trong tin nhắn thông báo
        - delete: xóa dòng trong tin nhắn thông báo
        - move: chuyển dòng trong tin nhắn thông báo sang 1 tab khác
    - tab: tên tab mới đúng như trong danh sách nếu cần đổi giao dịch qua tab khác    
    - date: ngày phát sinh giao dịch theo định dạng DD/MM/YYYY    
    - desc: mô tả về giao dịch, ngắn gọn, tối đa 30 ký tự
    - amount: số tiền giao dịch theo định dạng €20.00 (bỏ dấu + hay - nếu cần thiết)
    - location: nơi phát sinh giao dịch. 3 giá trị thường gặp là Rennes, Nantes, N/A
    - category: mục mới theo đúng tên mục như mô tả         
    - comment: lời chú thích của Ngân hàng như trong thông báo gốc    
    - row: số thứ tự của dòng cần cập nhật
    - confirmation: tin nhắn xác nhận thay đổi cần làm    
  `;

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      model: 'gpt-4.1',
      input: [{ role: 'user', content: mainprompt }],
      temperature: 0.5,
    }),
    muteHttpExceptions: true,
  });

  try {
    const json = JSON.parse(response.getContentText());
    const reply = JSON.parse(json.output[0].content[0].text);
    return reply;
  } catch (e) {
    Logger.log("AI Error: " + e);
    return {
      tab: '',
      category: 'Unclassified',
      note: message,
    };
  }
}*/