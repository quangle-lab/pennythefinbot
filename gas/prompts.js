//tạo các prompts

//prompt phân loại cập nhật số dư tài khoản ngân hàng từ email
function generateBankBalanceClassificationPrompt(subject, body) {
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const catInstructions = getCategoriseInstructions();
  const catPrompt = getTxCat();

  let mainPrompt = `
  The current time is ${currentTime}. The date format is ${getDateFormat()}.

  # Identity  
  Bạn là chuyên gia tư vấn tài chính cá nhân đang trao đổi với khách hàng của mình qua mail và Telegram. 
  Nhiệm vụ của bạn là phân tích email từ ngân hàng để xác định loại thông báo và xử lý phù hợp.
  
  # Language Instructions
  ${getLanguageInstruction()}

  # Nội dung email từ ngân hàng của khách hàng
  - Tiêu đề email: ${subject}
  - Nội dung email: ${body}
  
  # Instruction
  ## Bước phân tích
  Dựa vào nội dung email, hãy xác định đây là loại thông báo nào:
  - Bước 1: Kiểm tra tiêu đề email
    - Nếu tiêu đề email có chữ "solde" thì đây là thông báo số dư tài khoản, ví dụ: "Solde - dernières opérations"
    - Nếu tiêu đề email có chữ "opération", "mouvements" thì đây là thông báo giao dịch thông thường. Ví dụ: "Mouvements cartes bancaires", "Opération créditrice", "Opération débitrice"
  - Bước 2: Kiểm tra nội dung email có chứa thông tin về số dư tài khoản không
      - Tìm các từ khóa: "solde", "balance", "compte", "account", "soldes", "balances"
      - Tìm số tài khoản: thường có định dạng "Compte n°X0371 XXXXXX509 01"
      - Tìm số tiền số dư (format: ${getCurrencyExample()})
  - Bước 3: Nếu là thông báo số dư tài khoản, trả về intent "UpdateBankBalance"
  - Bước 4: Nếu là thông báo giao dịch thông thường, trả về intent "AddTx"
  - Bước 5: Trả về thông tin chi tiết theo cấu trúc JSON

  ## Định dạng phản hồi
  Trả về kết quả dưới dạng JSON, không có dấu code block, không có lời giải thích:

  ### Nếu là thông báo số dư tài khoản (UpdateBankBalance):
    {
      "intent": "UpdateBankBalance",
      "accountNumber": "số tài khoản ngân hàng, chỉ trả 5 số cuối và bao gồm khoảng trắng, ví dụ 509 01",
      "balance": "số dư tài khoản theo định dạng ${getCurrencyExample()}",
      "date": "ngày cập nhật số dư theo định dạng DD/MM/YYYY",
      "group": "tên nhóm tương ứng với tài khoản, dùng đúng tên nhóm kèm emoji (Chi phí cố định, Chi phí biến đổi, Quỹ gia đình, Quỹ mục tiêu, Tiết kiệm)"
    }

  ### Nếu là thông báo giao dịch thông thường (AddTx):
    {
      "intent": "AddTx",
      "group": "tên nhóm cần thêm giao dịch đúng như trong danh sách, bao gồm tên và emoji",
      "category": "mục theo đúng tên mục như mô tả",
      "type": "có 2 giá trị '🤑Thu' hoặc '💸Chi'",
      "date": "ngày phát sinh giao dịch theo định dạng DD/MM/YYYY",
      "desc": "ghi chú về giao dịch, ngắn gọn, tối đa 30 ký tự",
      "amount": "số tiền giao dịch theo định dạng ${getCurrencyExample()} (bỏ dấu + hay - nếu cần thiết)",
      "location": "thành phố nơi phát sinh giao dịch, nếu không đoán được thì ghi N/A",
      "bankcomment": "trích chú thích Ngân hàng, chỉ ghi thông tin địa điểm phát sinh giao dịch"
    }

  # Hoàn cảnh gia đình khách hàng và các chỉ dẫn phân loại/dự toán cần thiết
  ${familyContext}
  
  ${catInstructions}
  
  ${catPrompt}

  `;

  return {
    systemMessage: `      
      The current time is ${currentTime}. The date format is ${getDateFormat()}.
      ## PERSISTENCE
      You are a personal finance assistant chatbot named Penny, communicating with users via Telegram. 
      Please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.      
      `,
    userMessage: mainPrompt
  };
}

//prompt phân tích ý định người sử dụng
function generateIntentDetectionPrompt (originalText, replyText) {
  if (originalText) {
    userText = `Tin nhắn của bạn: ${originalText}\nPhản hồi của khách hàng: ${replyText}`
  }
  else userText = `Yêu cầu của khách hàng: ${replyText}`

  //tạo prompt hoàn cảnh gia đình, chỉ dẫn phân loại, chỉ dẫn dự toán và dự toán cho tháng hiện tại
  const familyContext = getFamilyContext ()
  const categoriseInstructions = getCategoriseInstructions ();
  const budgetInstructions = getBudgetInstructions ();
  const categories = getTxCat ();

  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");
  
  let intentDetectionPrompt = `  
  # Identity  
  The current time is ${currentTime}. The date format is ${getDateFormat()}.

  Bạn là chuyên gia tư vấn tài chính cá nhân đang trao đổi với khách hàng của mình qua mail và Telegram.  
  Hãy trò chuyện với khách hàng 1 cách thân thiện và tích cực, dùng emoji vừa phải để sinh động hơn.
  
  # Language Instructions
  ${getLanguageInstruction()}   
  
  # Nội dung trao đổi 
  Đây là nội dung trao đổi giữa bạn và khách hàng: "${userText}", 
  
  # Hướng dẫn
  Luôn luôn tuân thủ tuyệt đối tên của nhóm và mục trong các chỉ dẫn sau đây, bao gồm cả tên và emoji.
  ${categories}
  
  ${budgetInstructions}
  
  ${categoriseInstructions}

  ${familyContext}      
  
  ## Danh sách ý định
  Dựa vào nội dung trao đổi, thông tin dự toán của tháng hiện tại, hãy xác định xem ý định (intent) của khách hàng dựa trên danh sách sau
    - addTx: thêm thủ công 1 giao dịch mới
    - modifyTx: cập nhật dòng giao dịch (số tiền, ngày chi, miêu tả, mục trong cùng nhóm) hoặc chuyển dòng qua nhóm và mục mới. Dùng đúng tên Nhóm và mục như trong Các mục giao dịch
      - Ví dụ 1
        - Tin gốc: "Thu ${getCurrencyExample()} cho Hoàn tiền bảo hiểm GENERATION ✏️Ghi vào 🛟Quỹ gia đình, mục 🚰Thu, dòng 25".
        - Phản hồi của khách hàng: đây là chinh phí bảo hiểm sức khỏe.
        - Ý định: phân loại sai. Cần chuyển từ Nhóm Quỹ gia đình > Thu sang Chi phí cố định > BH sức khỏe.
      - Ví dụ 2
        - Tin gốc: "💸Chi ${getCurrencyExample()} cho Đặt đồ ăn UBER EATS ✏️Ghi vào 🛒Chi phí biến đổi, mục Chợ, dòng 102".
        - Phản hồi của khách hàng: này là tiền ăn ngoài.
        - Ý định: phân loại sai. Cần chuyển từ mục Chợ thành Ăn ngoài.
    - deleteTx: xóa dòng giao dịch           
    - getMonthlyReport: yêu cầu báo cáo chi tiêu cho tháng
      - Ví dụ
        - "Cho mình xem báo cáo chi tiêu tháng này"
        - "Tháng này còn dư bao nhiêu?"
        - "Tháng này còn mục nào chi hay không?"
        - "Mình chi tiêu mục nào nhiều nhất trong nhóm chi phí cố định?"
        - "Chi phí cho mèo tháng này hết bao nhiêu tiền rồi?"
    - addNewBudget: tạo dự toán cho tháng mới hoặc dự án mới        
    - modifyBudget: cập nhật dự toán dự trên thông tin bạn đề nghị
        - Ví dụ 1
          - Tin gốc: "Tăng mục Ăn ngoài lên ${getCurrencyExample()} cho tháng tới"            
          - Ý định: cần tăng mục Ăn ngoài lên ${getCurrencyExample()} cho tháng tới
        - Ví dụ 2
          - Tin gốc: "Giảm mục Xe hơi xuống 0"            
          - Ý định: cần giảm mục Xe hơi xuống 0 cho tháng tới
    - getFundBalance: lấy số dư các quỹ.            
      - Ví dụ
        - Hỏi: tôi còn bao nhiêu tiền trong quỹ
        - Hỏi: tôi còn bao nhiêu tiền trong tài khoản ngân hàng
        - Hỏi: lấy số dư các quỹ gia đình
        - Hỏi: lấy số dư các quỹ mục đích
        - Hỏi: lấy số dư các quỹ tiết kiệm
    - consult: tư vấn tài chính bao gồm kiểm tra khả năng chi trả và coaching tài chính cá nhân
      - Kiểm tra khả năng chi trả: phân tích xem có thể mua/chi trả một khoản tiền nào đó không
        - Ví dụ 1: "Tôi có thể mua chiếc laptop 1000 ${getCurrentLocale().currency.toLowerCase()} không?"
        - Ví dụ 2: "Tôi còn bao nhiêu tiền trong tài khoản ngân hàng tới cuối tháng?"
      - Coaching tài chính: hỏi lời khuyên về quản lý tài chính, tiết kiệm, đầu tư
        - Ví dụ 1: "Tôi có thể làm gì để giảm chi tiêu và để dành được nhiều tiền hơn?"
        - Ví dụ 2: "Tôi có thể làm gì để giảm chi tiêu và để dành được nhiều tiền hơn?"
        - Trả lời: căn cứ vào hoàn cảnh gia đình, bạn có thể tiết kiệm những mục như ăn ngoài, mua sắm, hạn chế thuê bao số như Netflix
    - search: tìm kiếm giao dịch theo các tiêu chí như khoảng thời gian, nhóm, mục, từ khóa trong miêu tả
      - Ví dụ
        - Hỏi: tìm tất cả giao dịch ăn uống tháng 11
        - Hỏi: tìm giao dịch có từ "uber" trong tháng này
        - Hỏi: tìm giao dịch từ 01/11 đến 30/11 trong nhóm chi phí biến đổi
        - others: các intent khác, kèm theo ghi chú trong mục note
          Nếu không xác định được ý định, hãy hỏi khách hàng rõ hơn về ý định của họ. Ngoài ra, chỉ rõ hiện tại bạn hỗ trợ ghi chép và chỉnh sửa giao dịch, lập báo cáo chi tiêu, tạo và chỉnh sửa dự toán cho tháng, tư vấn tài chính (bao gồm kiểm tra khả năng chi trả và coaching tài chính cá nhân), và tìm kiếm giao dịch
          
  ## Tin nhắn nhiều ý định
  Trong một tin nhắn của khách hàng có thể có nhiều ý định:
  - Ví dụ 1: khách hàng yêu cầu chuyển 600 ${getCurrentLocale().currency} từ quỹ mục đích sang quỹ gia đình thì có 2 ý định
    - 1/ intent trong nhóm quỹ gia đình, mục Chuyển nội bộ, số tiền 600 ${getCurrentLocale().currency}
    - 2/ intent trong nhóm quỹ mục đích, mục Thu, số tiền 600 ${getCurrentLocale().currency}
  - Ví dụ 2: khách hàng yêu cầu chi trả tiền cấp cứu mèo bằng quỹ gia đình 200 ${getCurrentLocale().currency} thì có 2 ý định
    - 1/ intent trong nhóm quỹ gia đình, mục Phát sinh, số tiền 200 ${getCurrentLocale().currency}
    - 2/ intent trong nhóm chi phí biến đổi, mục Mèo, số tiền 200 ${getCurrentLocale().currency}
  Trả về 1 danh sách sau dưới dạng JSON, không có dấu code block.
      {"intents": [
        //mảng các intent được miêu tả dưới đây
        {"intent": "",   }    
      ]} 

  ## Cấu trúc phản hồi
  Cho mỗi intent, trả lại JSON theo cấu trúc sau, không có dấu code block
    ### Yêu cầu báo cáo 
      {
        "intent": "getMonthlyReport", 
        "month": tháng xác định được từ tin nhắn khách hàng, "" nếu ko xác định được
        "year": năm xác định được từ tin nhắn khách hàng "" nếu ko xác định được
      } 

    ### Yêu cầu thêm mới, cập nhật hoặc xóa giao dịch. 
      {
        "intent":"addTx" hoặc "intent": "modifyTx" hoặc "intent":"deleteTx",
        "tab":"tên nhóm phân loại hiện tại, tuân thủ tuyệt đối tên nhóm trong danh sách, cả chữ lẫn emoji",
        "newtab": "tên nhóm mới nếu khách hàng yêu cầu chuyển giao dịch qua nhóm mới. Tuân thủ tuyệt đối đúng tên nhóm như trong danh sách, cả chữ lẫn emoji. Trả về rỗng nếu chỉ cầp cập nhật thông tin giao dịch như miêu tả, số tiền, mục trong cùng nhóm",
        "date":"ngày phát sinh giao dịch theo định dạng DD/MM/YYYY",
        "type": "có 2 giá trị '🤑Thu' hoặc '💸Chi', chỉ áp dụng cho intent 'addTx' hoặc 'modifyTx'",
        "desc":"miêu tả về giao dịch, ngắn gọn, tối đa 30 ký tự, dựa trên miêu tả cũ và yêu cầu của khách hàng",
        "amount":"số tiền giao dịch theo định dạng ${getCurrencyExample()} (bỏ dấu + hay - nếu cần thiết)",
        "location":"nơi phát sinh giao dịch. 3 giá trị thường gặp là Rennes, Nantes, N/A",
        "category":"mục phân loại, tuân thủ tuyệt đối tên mục trong chỉ dẫn phân loại,cả chữ lẫn emoji",
        "comment": 1 trong 2 giá trị dưới đây nếu chưa có lời ghi chú, nếu có lời ghi chú rồi thì giữ nguyên không thay đổi
         - rỗng nếu là intent "modifyTx"
         - "thêm thủ công" nếu khách hàng yêu cầu thêm giao dịch, chỉ áp dụng cho intent "addTx"
        "transactionId":"ID của giao dịch cần cập nhật áp dụng cho intent "modifyTx" và "deleteTx" (không áp dụng cho intent "addTx")",
        "confirmation":"tin nhắn xác nhận đã thực hiện thay đổi theo yêu cầu của khách hàng, in đậm tên Nhóm và Mục bằng markdown ví dụ *Chi phí biến đổi*, *Chi phí cố định* hay mục như *Mèo*, *Chợ*. Tuân thủ tuyệt đối tên nhóm và mục như trong chỉ dẫn phân loại.
      }

    ### Yêu cầu tạo dự toán cho tháng mới
      {
        "intent":"createBudget", 
        "sourceMonth":"tháng/năm nguồn dữ liệu để tạo dự toán mới theo định dạnh MM/yyyy. Nếu khách hàng không nói tháng, mặc định là tháng hiện tại.",
        "month":"tháng/năm dự toán theo định dạnh MM/yyyy. Nếu khách hàng không nói tháng, mặc định là tháng tới",
        "confirmation":"tin nhắn xác nhận hiểu và đang thực hiện yêu cầu của khách hàng",
      }

    ### Yêu cầu thay đổi dự toán: danh sách các thay đổi cần áp dụng cho dự toán. Nếu khách hàng không phản đối các điều chỉnh trong tin nhắn của bạn, gộp luôn các thay đổi đó vào danh sách.
      {
        "intent":"modifyBudget", 
        "month":"tháng/năm dự toán theo định dạnh MM/yyyy. Nếu khách hàng không nói năm, mặc định là năm hiện tại.",
        "confirmation":"tin nhắn xác nhận đã thực hiện thay đổi theo yêu cầu của khách hàng",
        "changes": [
          {
            "group":"nhóm dự toán". Sử dụng tên nhóm như trong Chỉ dẫn phân loại, bao gồm cả emoji.
            "category":"mục trong từng nhóm". Sử dụng đúng tên mục như trong Chỉ dẫn phân loại bao gồm cả emoji.
            "amount":"số tiền dự toán theo định dạng ${getCurrencyExample()} (bỏ dấu + hay - nếu cần thiết), số tiền này có thể hoàn toàn do khách hàng đề xuất hoặc là cộng dồn của dự toán hiện tại và bổ sung thêm từ khách hàng", 
            "ghi chú":"ghi chú của khách hàng về mục dự toán này cho tháng"
          }
        ]
      }
    
    ### Yêu cầu tra cứu dự toán: dự toán cho một tháng cố định
      {
        "intent":"getBudget", 
        "month":"tháng/năm dự toán theo định dạnh MM/yyyy. Nếu khách hàng không nói tháng, mặc định là tháng hiện tại.",
        "confirmation":"tin nhắn xác nhận đã thực hiện thay đổi theo yêu cầu của khách hàng"        
      }

    ### Yêu cầu tư vấn tài chính (bao gồm kiểm tra khả năng chi trả cho chi phí sinh hoạt hoặc mua sắm, tư vấn về tài chính cá nhân và coaching)
      {
        "intent":"consult",
        "consultType":"affordability hoặc coaching hoặc general",
        "question":"câu hỏi hoặc yêu cầu tư vấn của khách hàng",
        "item":"(chỉ cho affordability) tên món đồ hoặc khoản chi tiêu khách hàng muốn mua/chi trả",
        "amount":"(chỉ cho affordability) số tiền dự kiến chi theo định dạng ${getCurrencyExample()}",
        "category":"(chỉ cho affordability) mục phân loại dự kiến cho khoản chi này theo danh sách categories",
        "group":"(chỉ cho affordability) nhóm phân loại dự kiến cho khoản chi này",
        "timeframe":"(chỉ cho affordability) thời gian dự kiến chi trả (ngay lập tức, tháng này, tháng tới, quý này, năm này, etc.)",
        "confirmation":"tin nhắn xác nhận hiểu và đang thực hiện yêu cầu của khách hàng",
      }

    ### Yêu cầu tìm kiếm giao dịch
      {
        "intent":"search",
        "startDate":"ngày bắt đầu tìm kiếm theo định dạng DD/MM/YYYY, để trống nếu không xác định",
        "endDate":"ngày kết thúc tìm kiếm theo định dạng DD/MM/YYYY, để trống nếu không xác định",
        "location":"nơi phát sinh giao dịch. 3 giá trị thường gặp là Rennes, Nantes, N/A",
        "groups":["danh sách tên nhóm cần tìm kiếm, tuân thủ tuyệt đối tên nhóm trong danh sách, cả chữ lẫn emoji. Để trống nếu tìm tất cả nhóm"],
        "categories":["danh sách tên mục cần tìm kiếm trong nhóm. Để trống nếu tìm tất cả mục"],
        "keywords":["danh sách từ khóa cần tìm trong miêu tả và ghi chú giao dịch. Để trống nếu không có từ khóa cụ thể"],
        "confirmation":"tin nhắn xác nhận hiểu và đang thực hiện yêu cầu tìm kiếm của khách hàng"
      }

    ### Yêu cầu khác ngoài danh sách phân loại
      {
        "intent":"others",
        "reply":"câu trả lời của bạn cho khách hàng",
        "note:"ghi chú của bạn về ý định của khách hàng để có thể hỗ trợ tốt hơn lần sau"
      }.          
    `;

  return {
   systemMessage: `      
      The current time is ${currentTime}. The date format is ${getDateFormat()}.
      ## PERSISTENCE
      You are a personal finance assistant chatbot named Penny, communicating with users via Telegram. 
      Please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
      `, 
    userMessage: intentDetectionPrompt};
}

//prompt xác định hoàn cảnh mới để cải thiện nhận diện
function generateDetectNewContextPrompt(originalTx, originalText, replyText) {
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  const originalTxDesc = `Đây là giao dịch gốc ngày ${originalTx.date}, miêu tả: ${originalTx.desc}, số tiền: ${originalTx.amount}, nơi phát sinh: ${originalTx.location}, mục phân loại: ${originalTx.category}, ghi chú của ngân hàng: ${originalTx.comment} `;
  const userText = `Tin nhắn của bạn: ${originalText}\nPhản hồi của khách hàng: ${replyText}\n`;

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const categoriseInstructions = getCategoriseInstructions();
  const categories = getTxCat();

  let mainPrompt = `
  The current time is ${currentTime}. The date format is ${getDateFormat()}.
    
  # Identity  
  Bạn là chuyên gia tư vấn tài chính cá nhân đang trao đổi với khách hàng của mình qua mail và Telegram. 
  Nhiệm vụ của bạn là 
  - phân loại các giao dịch, thay đổi theo yêu cầu khách hàng và cải thiện chế độ phân loại
  - đề xuất dự toán hàng tháng, thay đổi số tiền trong dự toán theo yêu cầu của khách hàng
  
  # Language Instructions
  ${getLanguageInstruction()}

  # Nội dung trao đổi
  - Đây là thông tin giao dịch gốc ${originalTxDesc}\n
  - Đây là tin nhắn của bạn kèm phàn hồi của khách hàng ${userText}\n

  # Instructions
  ## Bước
  - Bước 1: so sánh giữa tin nhắn giao dịch gốc và tin phản hồi của khách hàng trong phần trao đổi
  - Bước 2: tìm kiếm trong Hòan cảnh và Chỉ dẫn phân loại
  - Bước 3: so sánh trong các mục và nhóm phân loại
  - Bước 4: suy ra thông tin hướng dẫn phân loại hoặc hoàn cảnh mới
      - Nếu phản hồi của khách hàng nói rõ: bỏ qua chỉ dẫn, không thêm chỉ dẫn, trả về JSON với giá trị "" cho tất cả các khóa.
      - Nếu đã tồn tại chỉ dẫn có giá trị tương đồng trong phần Chỉ dẫn phân loại, trả về JSON với giá trị "" cho tất cả các khóa.
      - Nếu chưa tồn tại chỉ dẫn, ghi lại điểm cần lưu ý để lần sau bạn có thể phân loại giao dịch chính xác hơn mà không cần hướng dẫn của người dùng và trả lại JSON theo cấu trúc sau, không có dấu code block.\

  ## Định dạng phản hồi
      {
        "instructionGroup": có 1 trong 3 giá trị:
          - "Hoàn cảnh": bổ sung thông tin về hoàn cảnh gia đình như thành phần gia đình, con cái, nhà cửa
          - "Chỉ dẫn phân loại": bổ sung thông tin để việc phân loại tốt hơn như nơi phát sinh giao dịch,các địa điểm, cửa hàng và các mục tương ứng
          - "Chỉ dẫn dự toán": bổ sung thông tin để việc dự toán tốt hơn như số tiền dự toán, mục dự toán, nhóm dự toán 
        "instructionName": tên của topic, ví dụ:
            Hoàn cảnh: Gia đinh, con cái, xe, thú cưng, thói quen sống
            Chỉ dẫn phân loại: hướng dẩn để cải thiện phân loại dựa trên phần hồi của khách hàng, ghi chú gốc của ngân hàng
            Chỉ dẫn dự toán: hướng dẩn để cải thiện dự toán dựa trên phần hồi của khách hàng, số tiền dự toán, mục dự toán, nhóm dự toán
        "instructionContent": trả về dưới dạng "các giao dịch có ghi chú của ngân hàng là ..., phân vào nhóm ... và mục ... tương ứng"
        Ví dụ:
          "instructionGroup":"Chỉ dẫn phân loại"
          "instructionName":"Hoàn tiền bảo hiểm"
          "instructionContent":"GENERATION là tiền hoàn bảo hiểm, ghi vào mục Thu trong Quỹ gia đình"
      }
  
  ##Hoàn cảnh
    \n${familyContext}
    \n${categoriseInstructions}
    \n${categories}`

  return {
    systemMessage: `      
      The current time is ${currentTime}. The date format is ${getDateFormat()}.
      ## PERSISTENCE
      You are a personal finance assistant chatbot named Penny, communicating with users via Telegram. 
      Please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
      Based on the customer goal, analyze the situation directly and clearly to help the customer achieve their personal financial goal.  
      You can only make mistake once. Carefully analyse the customer instruction and update your knowledge base to make sure you catetorise the transaction correctly without the need for further instructions from the customer.
      `,    
    userMessage: mainPrompt
  };
}

//prompt phân tích chi tiêu, dataSource có thể là: dashboard, fixEx, varEx
function generateExpenseAnalyticsPrompt(userText, monthText, dataSource) {
  var expenseAnalyticsPrompt = ""; 

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const catInstructions = getCategoriseInstructions();

  const currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  switch (dataSource) {
    case "dashboard": {
      monthDashboardData = getDashboardData (monthText);
      expenseAnalyticsPrompt = `
        The current time is ${currentTime}. The date format is ${getDateFormat()}.

        # Identity
        Bạn là chuyên gia cố vấn có kinh nghiệm và coach tài chính cá nhân.     
        Hãy trò chuyện với khách hàng 1 cách thân thiện và tích cực, dùng emoji vừa phải để sinh động hơn.
        
        # Language Instructions
        ${getLanguageInstruction()}

        # Yêu cầu của khách hàng
        Đây là yêu cầu của khách hàng theo ngôn ngữ tự nhiên: ${userText}\n
        
        # Instructions             
        Bước 1: Dựa trên câu hỏi đó, hoàn cảnh và các dữ liệu trong báo cáo tài chính tháng ${monthText}, bạn phải xác định rõ yêu cầu là dạng nào chỉ 1 trong 2 dạng: Tổng quát hay Chi tiết.
        Bước 2: Dựa trên kết quả bước 1, bạn phải trả lời cho khách hàng theo cấu trúc sau và tuân thủ các yêu cầu trình bày

        ##Yêu cầu trình bày
        - Giới hạn trong 200 ký tự
        - Ngôn ngữ: ${getLanguageInstruction()}
        - Dùng đúng tên mục trong báo cáo tài chính
        - Trình bày dùng text minh họa và emoji theo đúng emoji trong báo cáo tài chính tháng  
        - Dùng định dạng MarkdownV2 cho Telegram, không có dấu code block
            *bold text*
            _italic text_
            __underline text__
            ~strikethrough text~
            ||spoiler text||
            \`inline code\`
            [inline URL](http://www.example.com/)
            [inline mention of a user](tg://user?id=123456789)   

        ## Phân loại yêu cầu:
        ### Tổng quát — khi câu hỏi:
          - Không nói rõ nhóm cụ thể
          - Hoặc hỏi chung về "chi tiêu", "tình hình chi tiêu", "tháng này thế nào"
          - Hoặc chỉ hỏi "có vượt không", "vượt bao nhiêu", "chi tiêu ra sao"

        ### Chi tiết theo nhóm — khi câu hỏi:
          - Nêu rõ tên nhóm (ví dụ: "chi tiết chi phí biến đổi", "mục tiết kiệm")
          - Hoặc có các từ khóa: "chi tiết", "breakdown", "từng mục", "mục nào", "nhóm nào", "thành phần", "gồm những gì"

        ## Ví dụ phân loại:

        | Câu hỏi của khách | Phân loại |  
        |-------------------|-----------|  
        | "Chi tiêu tháng này thế nào?" | Tổng quát  
        | "Mình vượt bao nhiêu so với kế hoạch?" | Tổng quát  
        | "Chi tiết mục chi phí biến đổi tháng này giúp mình" | Chi tiết theo nhóm  
        | "Mình chi tiêu mục nào nhiều nhất trong nhóm chi phí cố định?" | Chi tiết theo nhóm  
        | "Cho mình xem breakdown tiết kiệm" | Chi tiết theo nhóm  
        | "Mục tiêu chi tiêu tháng này đạt không?" | Tổng quát
        | "Ăn ngoài tháng này tiêu hết bao nhiêu rồi?" | Chi tiết với 1 mục Ăn ngoài
        | "Chi phí cho xe hơi tháng này có vượt không?" | Chi tiết với 1 mục Xe hơi
        ---

        ## Cấu trúc trả lời

        ### Nếu là yêu cầu Tổng quát, trả lời theo cấu sau, không kèm ghi chú:

        *Tháng ${monthText}*        
        _Tính đến ngày ${currentDate}_
       
          *🏡Chi phí cố định*
            - dự chi
            - thực chi
            - còn lại nếu dương, vượt nếu âm. Nêu bật bằng emoji ⚠️(vượt mức dưới 5%) hoặc ‼️(nghiêm trọng -- vượt rất xa dự tính)

          *🛒Chi phí biến đổi*
            - dự chi
            - thực chi
            - còn lại nếu dương, vượt nếu âm. Nêu bật bằng emoji ⚠️(vượt mức dưới 5%) hoặc ‼️(nghiêm trọng -- vượt rất xa dự tính)
        
        - 🛟Thu vào quỹ gia đình: xem hàng TỔNG Thực Tế trong quỹ gia đình (nếu dư thì tốt, còn lại thì xấu)
        - 🎯Thu vào quỹ mục đích: xem hàng TỔNG Thực Tế trong quỹ mục đích (nếu dư thì tốt, còn lại thì xấu)
        - 🫙Thu vào tiết kiệm: xem hàng TỔNG Thực Tế trong tiết kiệm (nếu dư thì tốt, còn lại thì xấu)

        
        *🤯Mục vượt dự chi*
          Cho mỗi nhóm, nêu các mục vượt dự chi và số tiền vượt. Nêu bật bằng emoji ⚠️(vượt mức dưới 5%) hoặc ‼️(nghiêm trọng -- vượt rất xa dự tính)
      
        *🎯Mục tiêu*: phân tích tình hình chi tiêu hiện tại và khả năng hoàn thành mục tiêu

        ### Nếu là yêu cầu Chi tiết theo nhóm hoặc theo mục, trả lời theo cấu trúc dưới đây, không kèm ghi chú:
        *Tháng ${monthText}*
        _Tính đến ngày ${currentDate}_
        
          *Tên nhóm*
          *Tên mục 1* 
            - dự chi
            - thực chi
            - *chênh lệch*

          *Tên mục 2*
            - dự chi
            - thực chi
            - *chênh lệch*          
          ...
        Nếu nhóm có mục vượt dự chi, nêu bật bằng emoji ⚠️(vượt mức dưới 5%) hoặc ‼️(nghiêm trọng -- vượt rất xa dự tính)
      
        *🎯Mục tiêu*: phân tích tình hình chi tiêu hiện tại và khả năng hoàn thành mục tiêu 
        
        # Hoàn cảnh và dữ liệu
        ${familyContext}.
        ${catInstructions}.
        \nBáo cáo tài chính tháng có cấu trúc như sau:\n        
        - Mỗi nhóm bao gồm các mục, ngăn với nhau bằng dấu |, chứa các thông tin lần lượt là Mục, Dự đoán, Thực Tế, Chênh lệch.
        - Cuối mỗi nhóm, dòng TỔNG chứa tổng dự đoán, tổng thực tế và tổng chênh lệch         
        ${monthDashboardData}`                
    ;  
      break;
    }

    default: {
      expenseAnalyticsPrompt = getDashboardData (monthText);
    }
  }
  return {         
    systemMessage: `      
      The current time is ${currentTime} (date format is ${getDateFormat()})
      ## PERSISTENCE
      You are a personal finance assistant chatbot named Penny, communicating with users via Telegram. 
      Please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
      Based on the customer goal, analyze the situation directly and clearly to help the customer achieve their personal financial goal.`, 

    userMessage: expenseAnalyticsPrompt };
}

//prompt phân tích dự toán theo tháng
function generateBudgetAnalyticsPrompt(nextMonthText, thisMonthText, replyText) {
  var budgetAnalyticsPrompt = ""; 

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const budgetInstructions = getBudgetInstructions();

  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  //lấy budget tháng kế tiếp
  const budgetData = getBudgetData (nextMonthText); 

  //lấy chi tiêu tháng hiện tại
  const dashboardData = getDashboardData (thisMonthText);

  //lấy số dư các quỹ
  const fundBalances = formatFundBalances(getFundBalances());
  
  budgetAnalyticsPrompt = `
    The current time is ${currentTime}. The date format is ${getDateFormat()}.

    # Danh tính
    Bạn là chuyên gia cố vấn có kinh nghiệm và coach tài chính cá nhân.     
    Hãy trò chuyện với khách hàng 1 cách thân thiện và tích cực, dùng emoji vừa phải để sinh động hơn.
    
    # Language Instructions
    ${getLanguageInstruction()}

    # Yêu cầu khách hàng
    ## Các bước phân tích
    Dựa trên các thông tin về chi tiêu, hoàn cảnh, chỉ dẫn dự toán, hãy tiến hành các bước sau và trả lời cho khách hàng.
    Đầu tiên, xác định ngôn ngữ khách hàng đang dùng để trả lời cho khách hàng theo hướng dẫn ngôn ngữ ở trên.
    - Bước 1: đối chiếu dự toán tháng ${nextMonthText} với chi tiêu tháng ${thisMonthText} từ phần Dữ liệu
    - Bước 2: tra cứu các chỉ dẫn dự toán xem tháng sau có phát sinh giao dịch gì không từ phẩn Chỉ dẫn
    - Bước 3: dựa trên các thông tin trên, đề xuất các thay đổi cho dự toán tháng ${nextMonthText}  
    - Bước 4: trả lời cho khách hàng theo cấu trúc sau và tuần thủ yêu cầu trình bày
      - Giới hạn trong 250 ký tự
      - Ngôn ngữ: ${getLanguageInstruction()}
      - Dùng đúng tên mục trong báo cáo tài chính
      - Trình bày dùng text minh họa và emoji theo đúng emoji trong báo cáo tài chính tháng 
      - Dùng dấu ✅ để ghi nhận chênh lệch tốt và ⚠️ để ghi nhận chênh lệch xấu
      - Cho phần dự toán, nó rõ là đề nghị để khách hàng cân nhắc và thêm call to action để khách hàng trả lời lại tin nhắn nếu cần thay đổi dự toán
      - Dùng định dạng MarkdownV2 cho Telegram, không có dấu code block
            *bold text*
            _italic text_
            __underline text__
            ~strikethrough text~
            ||spoiler text||
            \`inline code\`
            [inline URL](http://www.example.com/)
            [inline mention of a user](tg://user?id=123456789)       

    ## Cấu trúc trả lời      
      *🫣Tình hình chi tiêu tháng ${thisMonthText}*      
        *🏡Chi phí cố định*
        - tổng số thực chi và chênh lệch kèm giải thích chênh lệch tốt và xấu
        - các mục chênh lệch lớn
        - lưu ý xuống dòng cho từng mục và dùng đúng emoji
        
        *🛒Chi phí biến đổi*
        - tổng số thực chi và chênh lệch kèm giải thích chênh lệch tốt và xấu
        - các mục chênh lệch lớn
        - lưu ý xuống dòng cho từng mục và dùng đúng emoji
        
        - 🛟Thu vào quỹ gia đình: tổng số thực tế và chênh lệch        
        - 🎯Thu vào quỹ mục đích: tổng số thực tế và chênh lệch
        - 🫙Thu vào tiết kiệm: tổng số thực tế và chênh lệch
        
      *💶Dự toán tháng ${nextMonthText}*      
       - <tên mục>:  <số tiền đề nghị cho tháng>. Dựa trên mục tiêu tài chính trong hoàn cảnh và chỉ dẫn dự toán, giải thích lí do của đề nghị tăng hay giảm so với mức dự toán cũ (ngoại trừ thu nhập).  

    # Chỉ dẫn
    ${familyContext}.    
    ${budgetInstructions}.

    # Dữ liệu 
    ## Dự toán tháng ${nextMonthText} 
    ${budgetData}.

    ## Chi tiêu tháng ${thisMonthText}
    ${dashboardData}.              

    ## Số dư các quỹ
    ${fundBalances}.

    # Tin nhắn gốc
    ${replyText}    
  `;

  return {         
   systemMessage: `      
      The current time is ${currentTime}. The date format is ${getDateFormat()}.
      ## PERSISTENCE
      You are a personal finance assistant chatbot named Penny, communicating with users via Telegram. 
      Please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.
      Based on the customer goal, analyze the situation directly and clearly to help the customer achieve their personal financial goal.  
      `, 
    userMessage: budgetAnalyticsPrompt };
}

//prompt tư vấn tài chính thông qua agent handler
function generateConsultPrompt(userQuestion, consultType = "general", intentObj) {
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  const systemPrompt = `
    The current date is ${currentTime}. The date format is ${getDateFormat()}.

    # Identity
    You are a personal financial coach talking to your customer via Telegram.
    Your name is Penny, communicating with users via Telegram.
    Be frank and firm.

    # Instructions
    Based on the customer goal, close with any final advice or truths the customer may need to hear - especially things they might resist but need to confront to achieve their goal.
    ${getLanguageInstruction()}
    Don't just rely on the tools, plan and think of all the steps to solve the customer question.

    Use the available tools to gather the necessary financial data, then provide your comprehensive analysis.
    `;

  let consultPrompt = `
    The current date is ${currentTime}. The date format is ${getDateFormat()}.

    # Customer Request    
  `;

  // Add specific context based on consultation type  
  if (consultType === "affordability" && intentObj.item) {
    // For affordability tests, provide structured context
    consultPrompt += `
      Tôi muốn kiểm tra khả năng chi trả cho: ${intentObj.item} với số tiền ${intentObj.amount}.
      Dự kiến phân loại vào mục ${intentObj.category} (${intentObj.group}) 
      và chi trả trong thời gian ${intentObj.timeframe}
      Câu hỏi gốc: ${userQuestion}`;

  } else if (consultType === "coaching") {
      // For coaching, add context about financial advice
    consultPrompt = `Tôi cần lời khuyên coaching tài chính: ${userQuestion}`;
  }

  consultPrompt += `
    # Analysis Requirements
    1. Use the available tools to gather comprehensive financial data
    2. Analyze the customer's current financial situation
    3. Provide specific, actionable advice
    4. Include concrete numbers and calculations
    5. Always consider the family context and budget guidelines

    # Response Format
    - ${getLanguageInstruction()}
    - Be friendly but professional
    - Use appropriate emojis
    - Use Telegram MarkdownV2 format (no code blocks)
        *bold text*
        _italic text_
        __underline text__
        ~strikethrough text~
        ||spoiler text||
        \`inline code\`
        [inline URL](http://www.example.com/)      
    - Limit to 400 words maximum
    - Focus on practical, actionable advice
    - Base recommendations on actual data
  `;

  return {
    systemMessage: systemPrompt,
    userMessage: consultPrompt
  };
}

//prompt phân tích ảnh hóa đơn để trích xuất thông tin giao dịch
function generateReceiptAnalysisPrompt(base64Image, userMessage = "") {
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const catInstructions = getCategoriseInstructions();
  const catPrompt = getTxCat();

  let mainPrompt = `
  The current time is ${currentTime}. The date format is ${getDateFormat()}.

  # Identity  
  Bạn là chuyên gia tư vấn tài chính cá nhân đang phân tích ảnh hóa đơn để trích xuất thông tin giao dịch.
  Nhiệm vụ của bạn là phân tích ảnh hóa đơn và trích xuất thông tin giao dịch một cách chính xác.
  
  # Language Instructions
  ${getLanguageInstruction()}

  # Ảnh hóa đơn
  Đây là ảnh hóa đơn mà khách hàng gửi để thêm giao dịch vào hệ thống.
  ${userMessage ? `Tin nhắn kèm theo: "${userMessage}"` : ""}
  
  # Instruction
  ## Bước phân tích
  Dựa vào ảnh hóa đơn, hãy trích xuất thông tin giao dịch:
  - Bước 1: Xác định ngày giao dịch (nếu có trong ảnh, nếu không thì dùng ngày hiện tại)
  - Bước 2: Xác định số tiền giao dịch
  - Bước 3: Xác định mô tả giao dịch (tên cửa hàng, dịch vụ, sản phẩm)
  - Bước 4: Xác định địa điểm (thành phố, khu vực nếu có thể đoán được)
  - Bước 5: Phân loại giao dịch vào nhóm và mục phù hợp dựa trên hoàn cảnh gia đình và chỉ dẫn phân loại
  - Bước 6: Xác định loại giao dịch (Thu hay Chi)

  # Hoàn cảnh gia đình khách hàng 
  ${familyContext}

  # Các chỉ dẫn phân loại/dự toán cần thiết
  ${catInstructions}
  
  # Danh sách các nhóm và mục phân loại
  Tuyệt đối tuân thủ tên nhóm và mục phân loại bao gồm cả tên và emoji
  ${catPrompt}

  ## Định dạng phản hồi
  Trả về kết quả dưới dạng JSON, không có dấu code block, không có lời giải thích:

  {
    "intent": "addTx",
    "tab": "tên nhóm cần thêm giao dịch đúng như trong danh sách, bao gồm tên và emoji",
    "category": "mục theo đúng tên mục như mô tả",
    "type": "có 2 giá trị '🤑Thu' hoặc '💸Chi'",
    "date": "ngày phát sinh giao dịch theo định dạng DD/MM/YYYY",
    "desc": "ghi chú về giao dịch, ngắn gọn, tối đa 30 ký tự",
    "amount": "số tiền giao dịch theo định dạng ${getCurrencyExample()} (bỏ dấu + hay - nếu cần thiết)",
    "location": "thành phố nơi phát sinh giao dịch, nếu không đoán được thì ghi N/A",
    "comment": "từ ảnh hóa đơn"
  }

  `;

  return {
    systemMessage: `      
      The current time is ${currentTime}. The date format is ${getDateFormat()}.
      ## PERSISTENCE
      You are a personal finance assistant chatbot named Penny, communicating with users via Telegram. 
      Please keep going until the user's query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved.      
      `,
    userMessage: mainPrompt,
    image: base64Image
  };
}
