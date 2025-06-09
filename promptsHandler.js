//tạo các prompts

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
  ${familyContext}
  \n${budgetInstructions}
  \n${categoriseInstructions}
  \n${categories}
  \n${userText}  

  Bạn là chuyên gia tư vấn tài chính cá nhân đang trao đổi với khách hàng của mình qua mail và Telegram. 
  Nhiệm vụ của bạn là 
  - phân loại các giao dịch, thay đổi theo yêu cầu khách hàng và cải thiện chế độ phân loại
  - đề xuất dự toán hàng tháng, thay đổi số tiền trong dự toán theo yêu cầu của khách hàng
  Hãy trò chuyện với khách hàng 1 cách thân thiện và tích cực, dùng emoji vừa phải để sinh động hơn.
  
  Dựa vào nội dung trao đổi trên, kèm thông tin dự toán của tháng hiện tại, hãy xác định xem ý định (intent) của khách hàng dựa trên danh sách sau
        - addTx: thêm thủ công 1 giao dịch mới
        - modifyTx: cập nhật dòng giao dịch
        - deleteTx: xóa dòng giao dịch           
        - getMonthlyReport: yêu cầu báo cáo tài chính tháng
        - addNewBudget: tạo dự toán cho tháng mới hoặc dự án mới
        - getBudget: yêu cầu thông tin dự toán của tháng
        - modifyBudget: cập nhật dự toán dự trên thông tin bạn đề nghị
        - getFundBalance: lấy số dư các quỹ.
        - getSavingBalance: lấy số dư tiết kiệm.
        - affordTest: kiểm tra khả năng chi trả cho một khoản chi tiêu dựa trên tình hình tài chính hiện tại
        - others: các intent khác, kèm theo ghi chú trong mục note
  
  Trong một tin nhắn của khách hàng có thể có nhiều intents, 
  Ví dụ 1: khách hàng yêu cầu chuyển 600 EUR từ quỹ mục đích sang quỹ gia đình thì có 2 ý định
            1/ intent trong nhóm quỹ gia đình, mục Chuyển nội bộ, số tiền 600 EUR
            2/ intent trong nhóm quỹ mục đích, mục Thu, số tiền 600 EUR
  Ví dụ 2: khách hàng yêu cầu chi trả tiền cấp cứu mèo bằng quỹ gia đình 200 EUR thì có 2 ý định
            1/ intent trong nhóm quỹ gia đình, mục Phát sinh, số tiền 200 EUR
            2/ intent trong nhóm chi phí biến đổi, mục Mèo, số tiền 200 EUR
  Trả về 1 danh sách sau dưới dạng JSON, không có dấu code block.
  {"intents": [
    //mảng các intent được miêu tả dưới đây
    {"intent": "",   }    
  ]} 

  Cho mỗi intent, trả lại JSON theo cấu trúc sau, không có dấu code block
    - Yêu cầu báo cáo 
      {
        "intent": "getMonthlyReport", 
        "month": tháng xác định được từ tin nhắn khách hàng, "" nếu ko xác định được
        "year": năm xác định được từ tin nhắn khách hàng "" nếu ko xác định được
      } 
    - Yêu cầu thêm mới, cập nhật hoặc xóa giao dịch. 
      Có thể có những giao dịch bị trùng lắp từ email, bạn sẽ hỏi khách hàng có muốn thêm hay không. Nếu khách hàng có ý định bỏ qua, trả về intent=others và bỏ qua giao dịch.
      {
        "intent":"addTx" hoặc "intent": "modifyTx" hoặc "intent":"deleteTx",
        "tab":"tên tab hiện tại đúng như trong danh sách",
        "newtab": "tên tab mới nếu khách hàng yêu cầu chuyển giao dịch qua tab mới, rỗng nếu chỉ cầp cập nhật",
        "date":"ngày phát sinh giao dịch theo định dạng DD/MM/YYYY",
        "desc":"miêu tả về giao dịch, ngắn gọn, tối đa 30 ký tự, dựa trên miêu tả cũ và yêu cầu của khách hàng",
        "amount":"số tiền giao dịch theo định dạng €20.00 (bỏ dấu + hay - nếu cần thiết)",
        "location":"nơi phát sinh giao dịch. 3 giá trị thường gặp là Rennes, Nantes, N/A",
        "category":"mục mới theo đúng tên mục như mô tả",
        "comment": 1 trong 2 giá trị dưới đây nếu chưa có lời ghi chú, nếu có lời ghi chú rồi thì giữ nguyên không thay đổi
         - lời chú thích của Ngân hàng như trong thông báo gốc  
         - "thêm thủ công" nếu khách hàng tự thêm         
        "row":"số thứ tự của dòng cần cập nhật",
        "confirmation":"tin nhắn xác nhận đã thực hiện thay đổi theo yêu cầu của khách hàng",
      }
    - Yêu cầu tạo dự toán cho tháng mới
      {
        "intent":"createBudget", 
        "sourceMonth":"tháng/năm nguồn dữ liệu để tạo dự toán mới theo định dạnh MM/yyyy. Nếu khách hàng không nói tháng, mặc định là tháng hiện tại.",
        "month":"tháng/năm dự toán theo định dạnh MM/yyyy. Nếu khách hàng không nói tháng, mặc định là tháng tới",
        "confirmation":"tin nhắn xác nhận đã thực hiện thay đổi theo yêu cầu của khách hàng",
      }
    - Yêu cầu thay đổi dự toán: danh sách các thay đổi cần áp dụng cho dự toán. Nếu khách hàng không phản đối các điều chỉnh trong tin nhắn của bạn, gộp luôn các thay đổi đó vào danh sách.
      {
        "intent":"modifyBudget", 
        "month":"tháng/năm dự toán theo định dạnh MM/yyyy. Nếu khách hàng không nói năm, mặc định là năm hiện tại.",
        "changes": [
          {
            "group":"nhóm dự toán". Sử dụng đúng tên nhóm như trong Chỉ dẫn phân loại.
            "category":"mục trong từng nhóm". Sử dụng đúng tên mục như trong Chỉ dẫn phân loại.
            "amount":"số tiền dự toán, số tiền này có thể hoàn toàn do khách hàng đề xuất hoặc là cộng dồn của dự toán hiện tại và bổ sung thêm từ khách hàng", 
            "ghi chú":"ghi chú của khách hàng về mục dự toán này cho tháng"
          }
        ]
      }
    - Yêu cầu kiểm tra khả năng chi trả
      {
        "intent":"affordTest",
        "item":"tên món đồ hoặc khoản chi tiêu khách hàng muốn mua/chi trả",
        "amount":"số tiền dự kiến chi theo định dạng €20.00",
        "category":"mục phân loại dự kiến cho khoản chi này theo danh sách categories",
        "group":"nhóm phân loại dự kiến cho khoản chi này",
        "timeframe":"thời gian dự kiến chi trả (ngay lập tức, tháng này, tháng tới, quý này, năm này, etc.)",
        "confirmation":"tin nhắn xác nhận đã thực hiện phân tích khả năng chi trả"
      }
    - Nếu không xác định được ý định, thử tìm hiểu ý định của khách hàng là gì và đáp ứng. Ngoài ra, chỉ rõ hiện tại bạn chỉ hỗ trợ
        - ghi chép giao dịch,
        - lấy báo cáo tài chính,
        - tạo và chỉnh sửa dự toán cho tháng,
        - chỉnh sửa giao dịch,
        - kiểm tra khả năng chi trả cho các khoản chi tiêu.
      Thử đề nghị 1 yêu cầu phù hợp trong danh sách và rả lại JSON theo cấu trúc sau, không có dấu code block 
      {"intent":"others", 
        "reply":"câu trả lời của bạn cho khách hàng",
        "note:"ghi chú của bạn về ý định của khách hàng để có thể hỗ trợ tốt hơn lần sau"
      }.  
    `
  return {
    systemMessage: `Bạn là một cố vấn tài chính cá nhân phiên bản 0.6 đang trao đổi với khách hàng qua Telegram và Email. 
    Nếu không rõ hoặc thiếu thông tin giao dịch, hãy trao đổi với khách hàng để làm rõ thêm, tránh hiểu nhầm ý định của khách hàng.
    Mốc thời gian hiện tại là tháng ${currentTime}.`, 
    userMessage: intentDetectionPrompt};
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
        Hoàn cảnh gia đình:\n${familyContext}.
        \nHướng dẫn phân loại:\n${catInstructions}.
        \nBáo cáo tài chính tháng có cấu trúc như sau:\n        
        - Mỗi nhóm bao gồm các mục, ngăn với nhau bằng dấu |, chứa các thông tin lần lượt là Mục, Dự đoán, Thực Tế, Chênh lệch.
        - Cuối mỗi nhóm, dòng TỔNG chứa tổng dự đoán, tổng thực tế và tổng chênh lệch 
        ${monthDashboardData}                

        Đây là yêu cầu của khách hàng theo ngôn ngữ tự nhiên: ${userText}\n
        Dựa trên câu hỏi đó, bạn phải xác định rõ yêu cầu là dạng nào chỉ 1 trong 2 dạn: Tổng quát hay Chi tiết theo nhóm

        ### Phân loại yêu cầu:

        1. **Tổng quát** — khi câu hỏi:
          - Không nói rõ nhóm cụ thể
          - Hoặc hỏi chung về "chi tiêu", "tình hình chi tiêu", "tháng này thế nào"
          - Hoặc chỉ hỏi "có vượt không", "vượt bao nhiêu", "chi tiêu ra sao"

        2. **Chi tiết theo nhóm** — khi câu hỏi:
          - Nêu rõ tên nhóm (ví dụ: "chi tiết chi phí biến đổi", "mục tiết kiệm")
          - Hoặc có các từ khóa: "chi tiết", "breakdown", "từng mục", "mục nào", "nhóm nào", "thành phần", "gồm những gì"

        ---

        ### Ví dụ phân loại:

        | Câu hỏi của khách | Phân loại |  
        |-------------------|-----------|  
        | "Chi tiêu tháng này thế nào?" | Tổng quát  
        | "Mình vượt bao nhiêu so với kế hoạch?" | Tổng quát  
        | "Chi tiết mục chi phí biến đổi tháng này giúp mình" | Chi tiết theo nhóm  
        | "Mình chi tiêu mục nào nhiều nhất trong nhóm chi phí cố định?" | Chi tiết theo nhóm  
        | "Cho mình xem breakdown tiết kiệm" | Chi tiết theo nhóm  
        | "Mục tiêu chi tiêu tháng này đạt không?" | Tổng quát  

        ---

        ### Hướng dẫn phản hồi:

        **Nếu là yêu cầu Tổng quát**, trả lời theo cấu trúc:
        =====
        *Báo cáo chi tiêu tháng ${monthText}*        
        _Tính đến ngày ${currentDate}_

        *🫣Tình hình chi tiêu*
        ======
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

        =====
        *🤯Mục vượt dự chi*
          Cho mỗi nhóm, nêu các mục vượt dự chi và số tiền vượt. Nêu bật bằng emoji ⚠️(vượt mức dưới 5%) hoặc ‼️(nghiêm trọng -- vượt rất xa dự tính)
        =====
        *🎯Mục tiêu*: phân tích tình hình chi tiêu hiện tại và khả năng hoàn thành mục tiêu

        **Nếu là yêu cầu Chi tiết theo nhóm**, trả lời theo cấu trúc:
        =====
        *Báo cáo chi tiêu tháng ${monthText}*
        _Tính đến ngày ${currentDate}_

        *🫣Tình hình chi tiêu*
        ======
          *Tên nhóm*
          - Tên mục 
            - dự chi
            - thực chi
            - chênh lệch
          - Tên mục 
            - dự chi
            - thực chi
            - chênh lệch          
          ...
        Nếu nhóm có mục vượt dự chi, nêu bật bằng emoji ⚠️(vượt mức dưới 5%) hoặc ‼️(nghiêm trọng -- vượt rất xa dự tính)
        =====
        *🎯Mục tiêu*: phân tích tình hình chi tiêu hiện tại và khả năng hoàn thành mục tiêu


        Yêu cầu
        - Giới hạn trong 200 ký tự
        - Ngôn ngữ: mặc định tiếng Việt. Nếu khách hàng hỏi bằng ngôn ngữ khác (e.g. what is the breakdown for fix expense this month?), hãy trả lời bằng cùng ngôn ngữ với khách hàng.
        - Dùng đúng tên mục trong báo cáo tài chính
        - Trình bày dùng text minh họa và emoji theo đúng emoji trong báo cáo tài chính tháng  
        - Dùng định dạng markdown cho Telegram, không có dấu code block
            *bold text*
            _italic text_
            [inline URL](http://www.example.com/)
            [inline mention of a user](tg://user?id=123456789)
        `;  
      break;
    }

    case "fixEx": {
      //TODO
    }

    case "varEx": {
      //TODO
    }

    default: {
      expenseAnalyticsPrompt = getDashboardData (monthText);
    }
  }
  return {         
    systemMessage: `Bạn là một chuyên gia tài chính cá nhân đang trao đổi với khách hàng qua Telegram. 
      Mốc thời gian hiện tại là tháng ${currentTime}
      Hãy dựa vào mục tiêu của khách hàng, phân tích thẳng thắng, rõ ràng để giúp khách hoàn thành mục tiêu tài chính cá nhân của mình.`, 
    userMessage: expenseAnalyticsPrompt };
}

//prompt phân tích dự toán theo tháng
function generateBudgetAnalyticsPrompt(nextMonthText, thisMonthText) {
  var budgetAnalyticsPrompt = ""; 

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const budgetInstructions = getBudgetInstructions();

  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  //lấy budget tháng kế tiếp
  const budgetData = getBudgetData (nextMonthText); 

  //lấy chi tiêu tháng hiện tại
  const dashboardData = getDashboardData (thisMonthText);
  
  budgetAnalyticsPrompt = `
    \nHoàn cảnh gia đình như sau:\n${familyContext}
    \nChỉ dẫn dự toán:\n${budgetInstructions}
    \n${dashboardData}    
    \n${budgetData}
            
    Dựa trên các thông tin về chi tiêu, hướng dẫn dự toán, hãy trả về nội dung theo cấu trúc sau
      🧐 *Đối chiếu Dự toán ${nextMonthText} vs. Chi tiêu ${thisMonthText} *. 

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
       - <tên mục>:  <số tiền đề nghị>. Dựa trên mục tiêu tài chính trong hoàn cảnh, giải thích lí do của đề nghị tăng hay giảm so với mức dự toán cũ (ngoại trừ thu nhập).      
        
    Yêu cầu trình bày
      - Giới hạn trong 250 ký tự
      - Ngôn ngữ: mặc định tiếng Việt. Nếu khách hàng hỏi bằng ngôn ngữ khác (e.g. what is the breakdown for fix expense this month?), hãy trả lời bằng cùng ngôn ngữ với khách hàng.
      - Dùng đúng tên mục trong báo cáo tài chính
      - Trình bày dùng text minh họa và emoji theo đúng emoji trong báo cáo tài chính tháng 
      - Dùng dấu ✅ để ghi nhận chênh lệch tốt và ⚠️ để ghi nhận chênh lệch xấu
      - Cho phần dự toán, nó rõ là đề nghị để khách hàng cân nhắc và thêm call to action để khách hàng trả lời lại tin nhắn nếu cần thay đổi dự toán
      - Dùng định dạng markdown cho Telegram, không có dấu code block
            *bold text*
            _italic text_
            [inline URL](http://www.example.com/)
            [inline mention of a user](tg://user?id=123456789)  
  `;

  return {         
    systemMessage: `Bạn là một chuyên gia tài chính cá nhân đang trao đổi với khách hàng qua Telegram. 
      Mốc thời gian hiện tại là tháng ${currentTime}
      Tuân thủ chặt chẽ các yêu cầu chỉ dẫn dự toán nhằm hạn chế phát sinh.`, 
    userMessage: budgetAnalyticsPrompt };
}

//prompt phân loại giao dịch từ email
function generateClassifyTransactionPrompt(subject, body) {
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const catInstructions = getCategoriseInstructions();
  const catPrompt = getTxCat();

  let mainPrompt = `
  ${familyContext}
  \n${catInstructions}
  \n${catPrompt}

  - Tiêu đề email: ${subject}
  - Nội dung email: ${body}

  Trả về kết quả dưới dạng JSON 9 khóa sau, không có dấu code block, không có lời giải thích:
    - group: tên tab cần thêm giao dịch đúng như trong danh sách
    - category: mục theo đúng tên mục như mô tả
    - type: có 2 giá trị "🤑Thu" hoặc "💸Chi"
    - date: ngày phát sinh giao dịch theo định dạng DD/MM/YYYY
    - desc: ghi chú về giao dịch, ngắn gọn, tối đa 30 ký tự
    - amount: số tiền giao dịch theo định dạng €20.00 (bỏ dấu + hay - nếu cần thiết)
    - location: thành phố nơi phát sinh giao dịch, nếu không đoán được thì ghi N/A
    - bankcomment: trích chú thích Ngân hàng, chỉ ghi thông tin địa điểm phát sinh giao dịch
  `;

  return {
    systemMessage: `Bạn là một cố vấn tài chính cá nhân. Bạn đang đọc email thông báo giao dịch của ngân hàng để phân loại giúp khách hàng. Mốc thời gian hiện tại là  ${currentTime}`,
    userMessage: mainPrompt
  };
}

//prompt xác định ngữ cảnh mới để cải thiện nhận diện
function generateDetectNewContextPrompt(originalTx, originalText, replyText) {
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm dd/MM/yyyy");

  const originalTxDesc = `Đây là giao dịch gốc ngày ${originalTx.date}, miêu tả: ${originalTx.desc}, số tiền: ${originalTx.amount}, nơi phát sinh: ${originalTx.location}, mục phân loại: ${originalTx.category}, ghi chú của ngân hàng: ${originalTx.comment} `;
  const userText = `Tin nhắn của bạn: ${originalText}\nPhản hồi của khách hàng: ${replyText}\n`;

  //tạo prompt hoàn cảnh và phân loại
  const familyContext = getFamilyContext();
  const categoriseInstructions = getCategoriseInstructions();
  const categories = getTxCat();

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
  `;

  return {
    systemMessage: `Bạn là một chuyên gia tài chính cá nhân. Mốc thời gian hiện tại là ${currentTime}
        - Bạn phân loại các giao dịch của khách hàng và ghi chú những tiêu chí cần thiết để luôn luôn cải thiện việc phân loại giao dịch.
        - Bạn chỉ có quyền phân loại sai 1 lần. Bạn phải ghi chép cụ thể hướng dẫn để đảm bảo lỗi phân loại sai không diễn ra lần nữa mà không cần khách hàng xác nhận.`,
    userMessage: mainPrompt
  };
}

//prompt phân tích khả năng chi trả
function generateAffordabilityAnalysisPrompt(item, amount, category, group, timeframe) {
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  const currentMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");
  const nextMonth = Utilities.formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), Session.getScriptTimeZone(), "MM/yyyy");

  // Get family context and budget instructions
  const familyContext = getFamilyContext();
  const budgetInstructions = getBudgetInstructions();

  // Get current month expense data
  const currentMonthData = getDashboardData(currentMonth);

  // Get next month budget data
  const nextMonthBudget = getBudgetData(nextMonth);

  // Get fund balances
  const fundBalances = getFundBalances("all");
  const formattedFundBalances = formatFundBalances(fundBalances);

  let affordabilityPrompt = `
  🏠 **Hoàn cảnh gia đình:**
  ${familyContext}

  💶 **Hướng dẫn dự toán:**
  ${budgetInstructions}

  📊 **Tình hình tài chính tháng hiện tại (${currentMonth}):**
  ${currentMonthData}

  📋 **Dự toán tháng tới (${nextMonth}):**
  ${nextMonthBudget}

  💰 **Số dư các quỹ hiện tại:**
  ${formattedFundBalances}

  🛒 **Khoản chi tiêu cần phân tích:**
  - Món đồ/Chi phí: ${item}
  - Số tiền: ${amount}
  - Phân loại dự kiến: ${category} (${group})
  - Thời gian dự kiến: ${timeframe}

  📝 **Yêu cầu phân tích:**
  Dựa trên tất cả thông tin tài chính trên, hãy phân tích khả năng chi trả cho khoản chi tiêu này và đưa ra lời khuyên cụ thể.

  **Cấu trúc phản hồi:**

  🔍 **Phân tích khả năng chi trả cho "${item}" - ${amount}**
  _Ngày phân tích: ${currentTime}_

  **💡 Kết luận:** [CÓ THỂ CHI TRẢ / CẦN CÂN NHẮC / KHÔNG NÊN CHI TRẢ]

  **📊 Phân tích chi tiết:**

  1. **Tình hình ngân sách hiện tại:**
     - Phân tích mức độ sử dụng ngân sách tháng hiện tại
     - Đánh giá khả năng dư thừa trong nhóm chi phí tương ứng
     - So sánh với dự toán tháng tới

  2. **Tác động đến quỹ:**
     - Đánh giá tác động đến số dư các quỹ
     - Khuyến nghị quỹ nào nên sử dụng (nếu có)
     - Tác động đến mục tiêu tài chính dài hạn

  3. **Phương án thực hiện:**
     - Thời điểm tối ưu để chi trả
     - Cách thức chi trả (từ quỹ nào, hay điều chỉnh ngân sách)
     - Các biện pháp bù đắp (nếu cần)

  **⚠️ Lưu ý và khuyến nghị:**
  - Đưa ra lời khuyên cụ thể dựa trên hoàn cảnh gia đình
  - Đề xuất các phương án thay thế (nếu có)
  - Cảnh báo về rủi ro tài chính (nếu có)

  **🎯 Kế hoạch hành động:**
  - Các bước cụ thể khách hàng nên thực hiện
  - Điều chỉnh ngân sách cần thiết
  - Theo dõi và đánh giá sau khi chi trả

  **Yêu cầu trình bày:**
  - Ngôn ngữ: Tiếng Việt, thân thiện và dễ hiểu
  - Sử dụng emoji phù hợp để làm nổi bật
  - Đưa ra con số cụ thể và tính toán rõ ràng
  - Dùng định dạng markdown cho Telegram
  - Giới hạn trong 300 từ, tập trung vào những điểm quan trọng nhất
  `;

  return {
    systemMessage: `Bạn là một chuyên gia tài chính cá nhân với kinh nghiệm phân tích khả năng chi trả.
    Nhiệm vụ của bạn là đưa ra lời khuyên chính xác, thực tế và có trách nhiệm về việc có nên chi tiêu hay không.
    Luôn ưu tiên sự ổn định tài chính lâu dài của khách hàng.
    Mốc thời gian hiện tại là ${currentTime}.`,
    userMessage: affordabilityPrompt
  };
}
