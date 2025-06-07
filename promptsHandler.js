//tạo các prompts

//prompt hướng dẫn phân loại giao dịch
function generateTxCatPrompt() {
  const namedRanges = [
    "ThuNhap",
    "ChiPhiCoDinh",
    "ChiPhiBienDoi",
    "QuyGiaDinh",
    "QuyMucDich",
    "TietKiem"
  ];

  const catTxSheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  const promptParts = [];
  promptParts.push("Các giao dịch tài chính được phân vào các tab:");

  namedRanges.forEach((rangeName, index) => {
    const namedRange = catTxSheet.getRangeByName(rangeName);
    if (!namedRange) return;

    const sheet = namedRange.getSheet();
    const startRow = namedRange.getRow();    
    const numRows = namedRange.getNumRows();

    // Mở rộng từ cột A đến C => width = 3
    const fullRange = sheet.getRange(startRow, 1, numRows, 3);
    const values = fullRange.getValues();

    // Lấy tên nhóm từ cột A (duy nhất trong đoạn này)
    const uniqueGroupNames = [...new Set(values.map(row => row[0]).filter(name => !!name))];
    const groupName = uniqueGroupNames[0] || rangeName;

    const items = [];
    values.forEach(([, muc, mieuta]) => {
      if (muc && mieuta) {
        items.push(`  ${muc}: ${mieuta}`);
      }
    });

    if (items.length > 0) {
      promptParts.push(`\n${index + 1}/ ${groupName}:\n${items.join('\n')}`);
    }
  });
  
  const instructionCatPrompt = promptParts.join("\n");
  return instructionCatPrompt;
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
        - others: các intent khác, kèm theo ghi chú trong mục note
  
  Trong một tin nhắn của khách hàng có thể có nhiều intents, 
  Ví dụ 1: khách hàng yêu cầu chuyển 600 EUR từ quỹ mục đích sang quỹ gia đình thì có 2 ý định
            1/ intent trong nhóm quỹ gia đình, mục Chuyển nội bộ, số tiền 600 EUR
            2/ intent trong nhóm quỹ mục đích, mục Thu, số tiền 600 EUR
  Ví dụ 2: khách hàng yêu cầu chi trả tiền cấp cứu mèo bằng quỹ gia đình 200 EUR thì có 2 ý định
            1/ intent trong nhóm quỹ gia đình, mục Phát sinh, số tiền 200 EUR
            2/ intent trong nhóm chi phí biến đổi, mục Mèo, số tiền 200 EUR
  Trả về 1 danh sách sau dưới dạng JSON, không có dấu code block.
  "intents": [//mảng các intent được miêu tả dưới đây
    {"intent": "",   }    
  ] 

  Cho mỗi intent, trả lại JSON theo cấu trúc sau, không có dấu code block
    - Yêu cầu báo cáo 
      {
        "intent": "getMonthlyReport", 
        "month": tháng xác định được từ tin nhắn khách hàng, "" nếu ko xác định được
        "year": năm xác định được từ tin nhắn khách hàng "" nếu ko xác định được
      } 
    - Yêu cầu thêm mới, cập nhật hoặc xóa giao dịch. 
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
    - Nếu không xác định được ý định, thử tìm hiểu ý định của khách hàng là gì và đáp ứng. Ngoài ra, chỉ rõ hiện tại bạn chỉ hỗ trợ 
        - ghi chép giao dịch, 
        - lấy báo cáo tài chính, 
        - tạo và chỉnh sửa dự toán cho tháng, 
        - chỉnh sửa giao dịchh. 
      Thử đề nghị 1 yêu cầu phù hợp trong danh sách và rả lại JSON theo cấu trúc sau, không có dấu code block 
      {"intent":"others", 
        "reply":"câu trả lời của bạn cho khách hàng",
        "note:"ghi chú của bạn về ý định của khách hàng để có thể hỗ trợ tốt hơn lần sau"
      }.  
    `
  return intentDetectionPrompt;
}

//prompt hoàn cảnh phân loại chi tiêu
function generateContextExpensePrompt() {
  const props = PropertiesService.getScriptProperties();
  const sheetName = props.getProperty('sheet_ContextConfig') || '🤖Tùy chỉnh Prompts';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "";

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const contextMap = new Map (); // Nhóm -> array of lines

  rows.forEach(([nhom, ten, noidung]) => {
    if (!nhom || !ten || !noidung) return;
    if (!contextMap.has(nhom)) contextMap.set(nhom, []);
    contextMap.get(nhom).push(`- ${ten}: ${noidung}`);
  });

  const parts = [];

  if (contextMap.has("Hoàn cảnh")) {
    parts.push("🏠 Hoàn cảnh hộ gia đình:");
    parts.push(...contextMap.get("Hoàn cảnh"));
  }

  if (contextMap.has("Chỉ dẫn phân loại")) {
    parts.push("🔍 Hướng dẫn phân loại giao dịch:");
    parts.push(...contextMap.get("Chỉ dẫn phân loại"));
  }

  let contextPrompt = parts.join("\n");
  return contextPrompt;
}

//prompt hoàn cảnh phân loại dự toán
function generateContextBudgetPrompt() {
  const props = PropertiesService.getScriptProperties();
  const sheetName = props.getProperty('sheet_ContextConfig') || '🤖Tùy chỉnh Prompts';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "";

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const contextMap = new Map (); // Nhóm -> array of lines

  rows.forEach(([nhom, ten, noidung]) => {
    if (!nhom || !ten || !noidung) return;
    if (!contextMap.has(nhom)) contextMap.set(nhom, []);
    contextMap.get(nhom).push(`- ${ten}: ${noidung}`);
  });

  const parts = [];

  if (contextMap.has("Hoàn cảnh")) {
    parts.push("🏠 Hoàn cảnh hộ gia đình:");
    parts.push(...contextMap.get("Hoàn cảnh"));
  }

  if (contextMap.has("Chỉ dẫn dự toán")) {
    parts.push("💶 Hướng dẫn dự toán:");
    parts.push(...contextMap.get("Chỉ dẫn dự toán"));
  }

  let contextPrompt = parts.join("\n");  
  return contextPrompt;
}

//prompt phân tích chi tiêu, dataSource có thể là: dashboard, fixEx, varEx
function generateExpenseAnalyticsPrompt(monthText, dataSource) {
  var expenseAnalyticsPrompt = ""; 

  const contextPrompt = generateContextExpensePrompt ();
  const currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  switch (dataSource) {
    case "dashboard": {
      monthDashboardData = getDashboardData (monthText);
      expenseAnalyticsPrompt = `        
        Hoàn cảnh như sau:\n${contextPrompt}.
        \nBáo cáo tài chính tháng:\n${monthDashboardData}                

        Dựa trên các thông tin trên, hãy trả về nội dung theo cấu trúc sau
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
        
        🛟Số dư quỹ gia đình
        🎯Số dư quỹ mục tiêu

        =====
        *🤯Mục vượt dự chi*
          Cho mỗi nhóm, nêu các mục vượt dự chi và số tiền vượt. Nêu bật bằng emoji ⚠️(vượt mức dưới 5%) hoặc ‼️(nghiêm trọng -- vượt rất xa dự tính)
        =====

        Yêu cầu
        - Giới hạn trong 200 ký tự
        - Ngôn ngữ sử dụng: Tiếng Việt
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
  return expenseAnalyticsPrompt;
}

//prompt phân tích dự toán theo tháng
function generateBudgetAnalyticsPrompt(nextMonthText, thisMonthText) {
  var budgetAnalyticsPrompt = ""; 

  const contextPrompt = generateContextBudgetPrompt ();
  const currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  //lấy budget tháng kế tiếp
  const budgetData = getBudgetData (nextMonthText); 

  //lấy chi tiêu tháng hiện tại
  const dashboardData = getDashboardData (thisMonthText);
  
  budgetAnalyticsPrompt = `
    \nHoàn cảnh gia đình như sau:
    \n${contextPrompt}
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
        
        - 🛟Số dư quỹ gia đình: tổng số thực tế và chênh lệch
        
        - 🎯Số dư quỹ mục tiêu: tổng số thực tế và chênh lệch
        
      *💶Dự toán tháng ${nextMonthText}*      
       - <tên mục>:  <số tiền đề nghị>. Giải thích lí do của đề nghị tăng hay giảm so với mức dự toán cũ (ngoại trừ thu nhập).      
        
    Yêu cầu trình bày
      - Giới hạn trong 250 ký tự
      - Ngôn ngữ sử dụng: Tiếng việt
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

  return budgetAnalyticsPrompt;
}


//TODO: prompt phân tích tình hình quỹ dựa trên mục tiêu trong target, dataSource có thể là: rainyFund, targetFund, saving
function generateFundAnalyticsPrompt(monthText, target, dataSource) {
  //TODO
}
