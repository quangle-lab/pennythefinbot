//function tools definitions for LLM integration based on sheetHandler.js

//--------- ANALYSE DATA AGENT --------------//
//agent phân tích dữ liệu với khả năng gọi nhiều function liên tiếp
function consultDataAnalysticsAgent(consultPrompts) {
  const apiKey = OPENAI_TOKEN;  

  // Step 1: Get prompts
  const systemPrompt = consultPrompts.systemMessage;
  const userQuestion = consultPrompts.userMessage;

  // Step 2: Initialize conversation for /responses endpoint
  let stepCount = 0;
  const maxSteps = 7;
  let conversationHistory = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userQuestion }
  ];

  try {
    // Initialize conversation context for agent session
    resetConversationIfNeeded();
    logConversationContext();

    // Step 3: Execute iterative function calling
    while (stepCount < maxSteps) {
      stepCount++;

      Logger.log(`Step ${stepCount}: Making OpenAI API call`);

      // Create payload for /responses endpoint
      const payload = {
        model: "gpt-4.1",
        input: conversationHistory,
        temperature: 0.5,
        tools: tools
      };

      // Add conversation context for function call continuity
      const context = getConversationContext();
      if (context.previous_response_id) {
        payload.previous_response_id = context.previous_response_id;
      }

      const response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const json = JSON.parse(response.getContentText());

      if (json.error) {
        Logger.log (json.error.message);
        throw new Error(`OpenAI API Error: ${json.error.message}`);
      }

      if (!json.output || !Array.isArray(json.output)) {
        throw new Error("Invalid OpenAI response");
      }

      // Update conversation context for next iteration
      if (json.id) {
        updateConversationContext(json.id, 'agent_analysis');
      }

      // Handle different types of outputs
      let assistantMessage = { role: "assistant", content: "" };
      let functionCalls = [];

      for (const output of json.output) {
        if (output.type === "function_call") {
          functionCalls.push(output);
        } else if (output.content && output.content[0] && output.content[0].text) {
          assistantMessage.content = output.content[0].text;
        }
      }

      conversationHistory.push(assistantMessage);

      // Process function calls if any
      if (functionCalls.length > 0) {
        Logger.log(`Step ${stepCount}: Processing ${functionCalls.length} function calls`);

        // Execute each function call
        for (const functionCall of functionCalls) {
          const functionName = functionCall.name;
          const functionArgs = JSON.parse(functionCall.arguments || "{}");

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
            type: "function_call_output",
            call_id: functionCall.call_id,
            output: JSON.stringify(functionResult)
          });
        }

        // Continue to next iteration to get AI's response to function results
        continue;
      }

      // If no function calls and we have content, this is the final response
      if (assistantMessage.content && assistantMessage.content.trim()) {
        Logger.log(`Step ${stepCount}: Got final response from AI`);

        // Step 4: Send response via Telegram
        sendTelegramMessage(assistantMessage.content);

        // Update final conversation context
        if (json.id) {
          updateConversationContext(json.id, 'agent_final_response');
        }

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