//function tools definitions for LLM integration based on sheetHandler.js

//--------- ANALYSE DATA AGENT --------------//
//agent phân tích dữ liệu với khả năng gọi nhiều function liên tiếp
function analyseDataAgent(userQuestion) {
  userQuestion = `phân tích toàn bộ lịch sử ăn ngoài của gia đình tôi từ khi có dữ liệu (bao nhiêu lần, trung bình bao nhiêu tiền, ăn ở những nơi nào nhiều nhất) và đưa ra lời khuyên để tiết kiệm`; 

  const apiKey = OPENAI_TOKEN;
  const currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  // Step 1: Create system prompt
  const systemPrompt = `
The current date is ${currentDate}. The date format is dd/MM/yyyy.

# Identity
You are a personal financial coach talking to your customer via Telegram.
Your name is Penny, communicating with users via Telegram.
Be frank and firm.

# Instructions
Based on the customer goal, close with any final advice or truths the customer may need to hear - especially things they might resist but need to confront to achieve their goal.
Use the following language: Vietnamese
Don't just rely on the tools, plan and think of all the steps to solve the customer question.

Based on the return the set of functions that you need to answer the user's questions with the following structure, use the JSON format.
Provide the complete list of functions at the first run, unless it's impossible.
{
        "functions":
    ["list of functions to execute, the functions will be executed and the result will be return to you"
         {"function_name": "name of the function from the list" ,
         "params": ["list of params for the function"]
    ],
    "last_step": "yes/no -- indicate clearly if this is the last step to execute. If this is not the last step, the result will be sent to you to determine the next step."
}
`;

  // Step 2: Create initial payload with tools
  const initialPayload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuestion }
    ],
    tools: tools.map(tool => ({
      type: "function",
      function: tool
    })),
    tool_choice: "auto",
    temperature: 0.5
  };

  let stepCount = 0;
  const maxSteps = 7;
  let conversationHistory = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userQuestion }
  ];

  try {
    // Step 3: Execute iterative function calling
    while (stepCount < maxSteps) {
      stepCount++;

      Logger.log(`Step ${stepCount}: Making OpenAI API call`);

      const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        payload: JSON.stringify({
          ...initialPayload,
          messages: conversationHistory
        }),
        muteHttpExceptions: true
      });

      const json = JSON.parse(response.getContentText());

      if (!json.choices || !json.choices[0]) {
        throw new Error("Invalid OpenAI response");
      }

      const assistantMessage = json.choices[0].message;
      conversationHistory.push(assistantMessage);

      // Check if AI wants to call functions
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        Logger.log(`Step ${stepCount}: Processing ${assistantMessage.tool_calls.length} tool calls`);

        // Execute each function call
        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          Logger.log(`Executing function: ${functionName} with args:`, functionArgs);

          let functionResult;
          try {
            // Execute the function based on its name
            switch (functionName) {
              case "getBudgetData":
                functionResult = getBudgetData(functionArgs.monthText);
                break;
              case "getDashboardData":
                functionResult = getDashboardData(functionArgs.monthText);
                break;
              case "findTransactionRowById":
                functionResult = findTransactionRowById(functionArgs.sheetName, functionArgs.transactionId);
                break;
              case "getFundBalances":
                functionResult = getFundBalances(functionArgs.type);
                break;
              case "getTxCat":
                functionResult = getTxCat();
                break;
              case "getFamilyContext":
                functionResult = getFamilyContext();
                break;
              case "getCategoriseInstructions":
                functionResult = getCategoriseInstructions();
                break;
              case "getBudgetInstructions":
                functionResult = getBudgetInstructions();
                break;
              case "searchTransactions":
                functionResult = searchTx({
                  startDate: functionArgs.startDate,
                  endDate: functionArgs.endDate,
                  groups: functionArgs.groups || [],
                  categories: functionArgs.categories || [],
                  keywords: functionArgs.keywords || []
                });
                break;
              default:
                functionResult = { error: `Unknown function: ${functionName}` };
            }
          } catch (error) {
            functionResult = { error: `Error executing ${functionName}: ${error.toString()}` };
          }

          // Add function result to conversation
          conversationHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          });
        }

        // Continue to next iteration to get AI's response to function results
        continue;
      }

      // If no tool calls, check if this is the final response
      if (assistantMessage.content) {
        Logger.log(`Step ${stepCount}: Got final response from AI`);

        // Step 4: Send response via Telegram
        sendTelegramMessage(assistantMessage.content);

        return {
          success: true,
          response: assistantMessage.content,
          steps: stepCount
        };
      }
    }

    // If we reach max steps without completion
    const fallbackMessage = "😅 Xin lỗi, tôi cần nhiều thời gian hơn để phân tích yêu cầu của bạn. Bạn có thể thử lại với câu hỏi cụ thể hơn không?";
    sendTelegramMessage(fallbackMessage);

    return {
      success: false,
      error: "Reached maximum steps without completion",
      steps: stepCount
    };

  } catch (error) {
    Logger.log("Error in analyseDataAgent:", error);
    const errorMessage = "😱 Đã xảy ra lỗi khi phân tích dữ liệu. Vui lòng thử lại sau.";
    sendTelegramMessage(errorMessage);

    return {
      success: false,
      error: error.toString(),
      steps: stepCount
    };
  }
}