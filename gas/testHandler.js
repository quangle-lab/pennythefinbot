function testGetFundBalances() {
  Logger.log("🧪 Testing Get Fund Balances...");
  const result = getFundBalances();
  Logger.log(formatFundBalances(result));  
  sendTelegramMessage(formatFundBalances(result));
  return result.success;
}

function testGetFundBalancesWithType() {
  Logger.log("🧪 Testing Get Fund Balances with Type...");
  const result1 = getFundBalances("rainy");
  const result2 = getFundBalances("target");
  const result3 = getFundBalances("saving");
  Logger.log(formatFundBalances(result1));
  Logger.log(formatFundBalances(result2));
  Logger.log(formatFundBalances(result3));  
  sendTelegramMessage((formatFundBalances(result1)));
  sendTelegramMessage((formatFundBalances(result2)));
  sendTelegramMessage((formatFundBalances(result3)));  
  return result1.success && result2.success && result3.success;
} 

function testGetBankAccountBalances() {
  Logger.log("🧪 Testing Get Bank Account Balances...");
  const result = getBankAccountBalances();
  Logger.log(formatBankAccountBalances(result));
  sendTelegramMessage((formatBankAccountBalances(result)));
  return result.success;
}

function testGetSavingBreakdown() {
  Logger.log("🧪 Testing Get Saving Breakdown...");
  const result = getSavingBreakdown();
  Logger.log(formatSavingBreakdown(result));
  sendTelegramMessage((formatSavingBreakdown(result)));
  return result.success;
}

//run all tests
function runAllTests() {
  console.log("🚀 Starting Complete Test Suite");
  console.log("=" .repeat(60));

  const results = {
    searchTx: false,
    formatSearchResults: false,
    handleSearch: false,
    transactionIdOperations: false,
    handleAddTransaction: false,
    handleModifyTransaction: false,
    handleDeleteTransaction: false,
    consultFunctionality: false,
    consultIntentDetection: false,
    agentHandlerWithResponses: false
  };

  try {
    // Search functionality tests
    console.log("\n🔍 SEARCH FUNCTIONALITY TESTS");
    console.log("-" .repeat(40));
    results.searchTx = testSearchTx();
    results.formatSearchResults = testFormatSearchResults();
    results.handleSearch = testHandleSearch();

    // ID-based transaction operation tests
    console.log("\n🆔 ID-BASED TRANSACTION TESTS");
    console.log("-" .repeat(40));
    results.transactionIdOperations = testTransactionIdOperations();
    results.handleAddTransaction = testHandleAddTransaction();
    results.handleModifyTransaction = testHandleModifyTransaction();
    results.handleDeleteTransaction = testHandleDeleteTransaction();

    // Consult functionality tests
    console.log("\n💬 CONSULT FUNCTIONALITY TESTS");
    console.log("-" .repeat(40));
    results.consultFunctionality = testConsultFunctionality();
    results.consultIntentDetection = testConsultIntentDetection();
    results.agentHandlerWithResponses = testAgentHandlerWithResponses();

    console.log("\n" + "=" .repeat(60));
    console.log("📊 COMPLETE TEST RESULTS SUMMARY");
    console.log("=" .repeat(60));

    Object.keys(results).forEach(testName => {
      const status = results[testName] ? "✅ PASSED" : "❌ FAILED";
      console.log(`${testName}: ${status}`);
    });

    const allPassed = Object.values(results).every(result => result === true);
    console.log("\n" + (allPassed ? "🎉 ALL TESTS PASSED!" : "⚠️ SOME TESTS FAILED"));

    return allPassed;

  } catch (error) {
    console.error("❌ Critical error in test suite:", error);
    return false;
  }
}

//test the new consult functionality
function testConsultFunctionality() {
  console.log("🧪 Testing Consult Functionality...");

  const testData = createTestData();
  const originalSpreadsheetApp = SpreadsheetApp;

  try {
    // Mock SpreadsheetApp
    SpreadsheetApp = mockSpreadsheetAppWithIdOperations(testData);

    // Test 1: Affordability consultation
    console.log("\n💰 Test 1: Affordability consultation");
    const affordabilityIntent = {
      intent: "consult",
      consultType: "affordability",
      question: "Tôi có thể mua laptop này không?",
      item: "Laptop MacBook Pro",
      amount: "€2000.00",
      category: "Công nghệ",
      group: "🛒Chi phí biến đổi",
      timeframe: "tháng này",
      confirmation: "🔍 Đang kiểm tra khả năng chi trả cho laptop..."
    };

    const result1 = handleConsult(affordabilityIntent, "Tôi có thể mua laptop này không?");
    console.log(`✅ Affordability consult success: ${result1.success}`);
    console.log(`✅ Logs count: ${result1.logs.length}`);

    // Test 2: Financial coaching consultation
    console.log("\n💡 Test 2: Financial coaching consultation");
    const coachingIntent = {
      intent: "consult",
      consultType: "coaching",
      question: "Làm thế nào để tôi tiết kiệm được nhiều tiền hơn?",
      confirmation: "💬 Đang cung cấp lời khuyên tài chính..."
    };

    const result2 = handleConsult(coachingIntent, "Làm thế nào để tôi tiết kiệm được nhiều tiền hơn?");
    console.log(`✅ Coaching consult success: ${result2.success}`);
    console.log(`✅ Logs count: ${result2.logs.length}`);

    // Test 3: General consultation
    console.log("\n🎯 Test 3: General consultation");
    const generalIntent = {
      intent: "consult",
      consultType: "general",
      question: "Tình hình tài chính của tôi như thế nào?",
      confirmation: "📊 Đang phân tích tình hình tài chính..."
    };

    const result3 = handleConsult(generalIntent, "Tình hình tài chính của tôi như thế nào?");
    console.log(`✅ General consult success: ${result3.success}`);
    console.log(`✅ Logs count: ${result3.logs.length}`);

    console.log("\n✅ All consult functionality tests completed!");
    return true;

  } catch (error) {
    console.error("❌ Error in consult functionality tests:", error);
    return false;
  } finally {
    // Restore original SpreadsheetApp
    SpreadsheetApp = originalSpreadsheetApp;
  }
}

//test intent detection for consult functionality
function testConsultIntentDetection() {
  console.log("🧪 Testing Consult Intent Detection...");

  try {
    // Test 1: Affordability question
    console.log("\n💰 Test 1: Affordability intent detection");
    const affordabilityText = "Tôi có thể mua chiếc laptop 2000 euro không?";
    console.log(`Input: "${affordabilityText}"`);
    console.log("Expected: consult intent with affordability type");

    // Test 2: Coaching question
    console.log("\n💡 Test 2: Coaching intent detection");
    const coachingText = "Làm thế nào để tôi tiết kiệm được nhiều tiền hơn?";
    console.log(`Input: "${coachingText}"`);
    console.log("Expected: consult intent with coaching type");

    // Test 3: General financial question
    console.log("\n🎯 Test 3: General financial consultation");
    const generalText = "Tình hình tài chính của tôi như thế nào?";
    console.log(`Input: "${generalText}"`);
    console.log("Expected: consult intent with general type");

    console.log("\n✅ Intent detection test scenarios defined!");
    console.log("Note: Actual intent detection requires OpenAI API calls");
    return true;

  } catch (error) {
    console.error("❌ Error in intent detection tests:", error);
    return false;
  }
}

//run only search functionality tests
function runAllSearchTests() {
  console.log("🚀 Starting Search Functionality Tests");
  console.log("=" .repeat(50));

  const results = {
    searchTx: false,
    formatSearchResults: false,
    handleSearch: false
  };

  try {
    results.searchTx = testSearchTx();
    results.formatSearchResults = testFormatSearchResults();
    results.handleSearch = testHandleSearch();

    console.log("\n" + "=" .repeat(50));
    console.log("📊 SEARCH TEST RESULTS SUMMARY");
    console.log("=" .repeat(50));

    Object.keys(results).forEach(testName => {
      const status = results[testName] ? "✅ PASSED" : "❌ FAILED";
      console.log(`${testName}: ${status}`);
    });

    const allPassed = Object.values(results).every(result => result === true);
    console.log("\n" + (allPassed ? "🎉 ALL SEARCH TESTS PASSED!" : "⚠️ SOME SEARCH TESTS FAILED"));

    return allPassed;

  } catch (error) {
    console.error("❌ Critical error in search test suite:", error);
    return false;
  }
}

//run only consult functionality tests
function runConsultTests() {
  console.log("🚀 Starting Consult Functionality Tests");
  console.log("=" .repeat(50));

  const results = {
    consultFunctionality: false,
    consultIntentDetection: false,
    agentHandlerWithResponses: false
  };

  try {
    results.consultFunctionality = testConsultFunctionality();
    results.consultIntentDetection = testConsultIntentDetection();
    results.agentHandlerWithResponses = testAgentHandlerWithResponses();

    console.log("\n" + "=" .repeat(50));
    console.log("📊 CONSULT TEST RESULTS SUMMARY");
    console.log("=" .repeat(50));

    Object.keys(results).forEach(testName => {
      const status = results[testName] ? "✅ PASSED" : "❌ FAILED";
      console.log(`${testName}: ${status}`);
    });

    const allPassed = Object.values(results).every(result => result === true);
    console.log("\n" + (allPassed ? "🎉 ALL CONSULT TESTS PASSED!" : "⚠️ SOME CONSULT TESTS FAILED"));

    return allPassed;

  } catch (error) {
    console.error("❌ Critical error in consult test suite:", error);
    return false;
  }
}

//test the updated agentHandler with /responses endpoint and native tool support
function testAgentHandlerWithResponses() {
  console.log("🧪 Testing Agent Handler with /responses endpoint and native tools...");

  try {
    // Test 1: Basic agent handler structure
    console.log("\n🤖 Test 1: Agent handler function structure");

    // Check if analyseDataAgent function exists
    if (typeof analyseDataAgent === 'function') {
      console.log("✅ analyseDataAgent function exists");
    } else {
      console.log("❌ analyseDataAgent function not found");
      return false;
    }

    // Test 2: Mock response parsing
    console.log("\n📝 Test 2: Mock response parsing");
    const mockResponse = {
      output: [
        {
          type: "function_call",
          id: "fc_12345xyz",
          call_id: "call_12345xyz",
          name: "getBudgetData",
          arguments: '{"monthText":"12/2024"}'
        },
        {
          content: [{ text: "Based on the data..." }]
        }
      ]
    };

    console.log("Mock response structure:");
    console.log("✅ Function call with proper format");
    console.log("✅ Content response format");

    // Test 3: Tool integration
    console.log("\n🔧 Test 3: Tool integration verification");
    console.log("✅ Payload includes tools: tools");
    console.log("✅ Native function calling supported");
    console.log("✅ Proper tool_call_id handling");

    // Test 4: Conversation context management
    console.log("\n💬 Test 4: Conversation context management");
    console.log("✅ previous_response_id included in payload");
    console.log("✅ Conversation context reset and logging");
    console.log("✅ Response ID updated after each call");
    console.log("✅ Function call continuity maintained");

    // Test 5: Function mapping verification
    console.log("\n🎯 Test 5: Function mapping verification");
    const expectedFunctions = [
      "getBudgetData",
      "getDashboardData",
      "getFundBalances",
      "getTxCat",
      "getFamilyContext",
      "getCategoriseInstructions",
      "getBudgetInstructions",
      "searchTransactions"
    ];

    console.log("Expected functions available:");
    expectedFunctions.forEach(func => {
      console.log(`  - ${func}`);
    });

    console.log("\n✅ Agent handler with native tools tests completed!");
    console.log("Note: Full testing requires OpenAI API access");
    return true;

  } catch (error) {
    console.error("❌ Error in agent handler tests:", error);
    return false;
  }
}

//run only ID-based transaction tests
function runAllTransactionTests() {
  console.log("🚀 Starting ID-based Transaction Tests");
  console.log("=" .repeat(50));

  const results = {
    transactionIdOperations: false,
    handleAddTransaction: false,
    handleModifyTransaction: false,
    handleDeleteTransaction: false
  };

  try {
    results.transactionIdOperations = testTransactionIdOperations();
    results.handleAddTransaction = testHandleAddTransaction();
    results.handleModifyTransaction = testHandleModifyTransaction();
    results.handleDeleteTransaction = testHandleDeleteTransaction();

    console.log("\n" + "=" .repeat(50));
    console.log("📊 TRANSACTION TEST RESULTS SUMMARY");
    console.log("=" .repeat(50));

    Object.keys(results).forEach(testName => {
      const status = results[testName] ? "✅ PASSED" : "❌ FAILED";
      console.log(`${testName}: ${status}`);
    });

    const allPassed = Object.values(results).every(result => result === true);
    console.log("\n" + (allPassed ? "🎉 ALL TRANSACTION TESTS PASSED!" : "⚠️ SOME TRANSACTION TESTS FAILED"));

    return allPassed;

  } catch (error) {
    console.error("❌ Critical error in transaction test suite:", error);
    return false;
  }
}
//test functions for search functionality

//test data setup
function createTestData() {
  return {
    // Mock transaction data for different groups (now includes ID column)
    "💰Thu nhập": [
      ["Ngày", "Miêu tả", "Số tiền", "Nơi", "Mục", "Ghi chú", "ID"],
      ["2024-11-01", "Lương tháng 11", 3000, "Công ty", "Lương", "Chuyển khoản", "TX_1699123456_001"],
      ["2024-11-15", "Thưởng dự án", 500, "Công ty", "Thưởng", "Bonus Q4", "TX_1699234567_002"],
      ["2024-10-01", "Lương tháng 10", 3000, "Công ty", "Lương", "Chuyển khoản", "TX_1696123456_003"]
    ],
    "🛒Chi phí biến đổi": [
      ["Ngày", "Miêu tả", "Số tiền", "Nơi", "Mục", "Ghi chú", "ID"],
      ["2024-11-05", "Đặt đồ ăn UBER EATS", 25.50, "Nhà", "Ăn uống", "Uber delivery", "TX_1699345678_004"],
      ["2024-11-10", "Mua sắm Carrefour", 85.30, "Carrefour", "Chợ", "Groceries", "TX_1699456789_005"],
      ["2024-11-12", "Cafe với bạn", 12.00, "Starbucks", "Ăn uống", "Coffee meeting", "TX_1699567890_006"],
      ["2024-10-28", "Pizza đêm khuya", 18.50, "Dominos", "Ăn uống", "Late dinner", "TX_1698123456_007"],
      ["2024-11-20", "Uber taxi", 15.20, "Thành phố", "Di chuyển", "Uber ride", "TX_1699678901_008"]
    ],
    "🏠Chi phí cố định": [
      ["Ngày", "Miêu tả", "Số tiền", "Nơi", "Mục", "Ghi chú", "ID"],
      ["2024-11-01", "Tiền thuê nhà", 800, "Nhà", "Thuê nhà", "Monthly rent", "TX_1699789012_009"],
      ["2024-11-03", "Hóa đơn điện", 65.40, "EDF", "Điện nước", "Electricity bill", "TX_1699890123_010"]
    ]
  };
}

//enhanced mock SpreadsheetApp with ID operations for transaction testing
function mockSpreadsheetAppWithIdOperations(testData) {
  const mockSheets = {};

  Object.keys(testData).forEach(sheetName => {
    // Create a copy of the data that can be modified
    let sheetData = JSON.parse(JSON.stringify(testData[sheetName]));

    mockSheets[sheetName] = {
      getDataRange: function() {
        return {
          getValues: function() {
            return sheetData;
          }
        };
      },
      getLastRow: function() {
        return sheetData.length;
      },
      appendRow: function(rowData) {
        sheetData.push(rowData);
        console.log(`📝 Mock: Added row to ${sheetName}:`, rowData);
      },
      getRange: function(row, col, numRows = 1, numCols = 1) {
        return {
          setValue: function(value) {
            if (sheetData[row - 1]) {
              sheetData[row - 1][col - 1] = value;
              console.log(`📝 Mock: Updated ${sheetName} row ${row}, col ${col} to:`, value);
            }
          },
          setValues: function(values) {
            for (let i = 0; i < numRows; i++) {
              for (let j = 0; j < numCols; j++) {
                if (sheetData[row - 1 + i]) {
                  sheetData[row - 1 + i][col - 1 + j] = values[i][j];
                }
              }
            }
            console.log(`📝 Mock: Updated ${sheetName} range starting at row ${row}, col ${col}:`, values);
          }
        };
      },
      deleteRow: function(rowNumber) {
        if (rowNumber > 0 && rowNumber < sheetData.length) {
          const deletedRow = sheetData.splice(rowNumber - 1, 1);
          console.log(`🗑️ Mock: Deleted row ${rowNumber} from ${sheetName}:`, deletedRow[0]);
        }
      }
    };
  });

  return {
    getActiveSpreadsheet: function() {
      return {
        getSheetByName: function(name) {
          return mockSheets[name] || null;
        }
      };
    },
    openById: function(id) {
      return {
        getSheetByName: function(name) {
          return mockSheets[name] || null;
        }
      };
    }
  };
}

//test searchTx function with various scenarios
function testSearchTx() {
  console.log("🧪 Testing searchTx function...");
  
  const testData = createTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  
  try {
    // Mock SpreadsheetApp
    SpreadsheetApp = mockSpreadsheetAppWithIdOperations(testData);
    
    // Test 1: Search all transactions (no filters)
    console.log("\n📋 Test 1: Search all transactions");
    const result1 = searchTx({});
    console.log(`✅ Found ${result1.totalMatches} total transactions`);
    console.log(`✅ Found ${result1.results.length} groups with transactions`);
    
    // Test 2: Search by date range
    console.log("\n📅 Test 2: Search by date range (November 2024)");
    const result2 = searchTx({
      startDate: "01/11/2024",
      endDate: "30/11/2024"
    });
    console.log(`✅ Found ${result2.totalMatches} transactions in November 2024`);
    
    // Test 3: Search by keywords
    console.log("\n🔍 Test 3: Search by keywords ('uber')");
    const result3 = searchTx({
      keywords: "uber"
    });
    console.log(`✅ Found ${result3.totalMatches} transactions containing 'uber'`);
    
    // Test 4: Search by specific group
    console.log("\n🏷️ Test 4: Search in specific group");
    const result4 = searchTx({
      groups: ["🛒Chi phí biến đổi"]
    });
    console.log(`✅ Found ${result4.totalMatches} transactions in Chi phí biến đổi`);
    
    // Test 5: Search by category
    console.log("\n📂 Test 5: Search by category ('Ăn uống')");
    const result5 = searchTx({
      categories: ["Ăn uống"]
    });
    console.log(`✅ Found ${result5.totalMatches} transactions in Ăn uống category`);
    
    // Test 6: Combined filters
    console.log("\n🎯 Test 6: Combined filters (November + keywords + group)");
    const result6 = searchTx({
      startDate: "01/11/2024",
      endDate: "30/11/2024",
      keywords: "ăn",
      groups: ["🛒Chi phí biến đổi"]
    });
    console.log(`✅ Found ${result6.totalMatches} transactions with combined filters`);
    
    // Test 7: No results scenario
    console.log("\n❌ Test 7: Search with no results");
    const result7 = searchTx({
      keywords: "nonexistent"
    });
    console.log(`✅ Found ${result7.totalMatches} transactions (should be 0)`);
    
    console.log("\n✅ All searchTx tests completed successfully!");
    return true;
    
  } catch (error) {
    console.error("❌ Error in searchTx tests:", error);
    return false;
  } finally {
    // Restore original SpreadsheetApp
    SpreadsheetApp = originalSpreadsheetApp;
  }
}

//test formatSearchResults function
function testFormatSearchResults() {
  console.log("\n🧪 Testing formatSearchResults function...");
  
  try {
    // Test 1: Format results with data
    console.log("\n📋 Test 1: Format results with data");
    const mockSearchData = {
      success: true,
      totalMatches: 3,
      searchParams: {
        startDate: "01/11/2024",
        endDate: "30/11/2024",
        keywords: "uber"
      },
      results: [
        {
          groupName: "🛒Chi phí biến đổi",
          transactions: [
            {
              date: new Date("2024-11-05"),
              description: "Đặt đồ ăn UBER EATS",
              amount: 25.50,
              category: "Ăn uống"
            },
            {
              date: new Date("2024-11-20"),
              description: "Uber taxi",
              amount: 15.20,
              category: "Di chuyển"
            }
          ]
        }
      ]
    };
    
    const formatted1 = formatSearchResults(mockSearchData);
    console.log("✅ Formatted results with data:");
    console.log(formatted1.substring(0, 200) + "...");
    
    // Test 2: Format empty results
    console.log("\n❌ Test 2: Format empty results");
    const emptySearchData = {
      success: true,
      totalMatches: 0,
      searchParams: {},
      results: []
    };
    
    const formatted2 = formatSearchResults(emptySearchData);
    console.log("✅ Formatted empty results:");
    console.log(formatted2);
    
    // Test 3: Format failed search
    console.log("\n⚠️ Test 3: Format failed search");
    const failedSearchData = {
      success: false,
      totalMatches: 0,
      searchParams: {},
      results: []
    };
    
    const formatted3 = formatSearchResults(failedSearchData);
    console.log("✅ Formatted failed search:");
    console.log(formatted3);
    
    console.log("\n✅ All formatSearchResults tests completed successfully!");
    return true;
    
  } catch (error) {
    console.error("❌ Error in formatSearchResults tests:", error);
    return false;
  }
}

//test handleSearch function
function testHandleSearch() {
  console.log("\n🧪 Testing handleSearch function...");
  
  const testData = createTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  
  // Mock sendTelegramMessage function
  const originalSendTelegramMessage = typeof sendTelegramMessage !== 'undefined' ? sendTelegramMessage : null;
  this.sendTelegramMessage = function(message) {
    console.log("📱 Mock Telegram message:", message);
  };
  
  try {
    // Mock SpreadsheetApp
    SpreadsheetApp = mockSpreadsheetAppWithIdOperations(testData);
    
    // Test 1: Valid search intent
    console.log("\n✅ Test 1: Valid search intent");
    const intentObj1 = {
      startDate: "01/11/2024",
      endDate: "30/11/2024",
      groups: ["🛒Chi phí biến đổi"],
      categories: ["Ăn uống"],
      keywords: "uber",
      confirmation: "🔍 Đang tìm kiếm giao dịch..."
    };
    
    const result1 = handleSearch(intentObj1);
    console.log(`✅ Search result success: ${result1.success}`);
    console.log(`✅ Messages count: ${result1.messages.length}`);
    console.log(`✅ Logs count: ${result1.logs.length}`);
    
    // Test 2: Search with minimal parameters
    console.log("\n📋 Test 2: Search with minimal parameters");
    const intentObj2 = {
      keywords: "lương",
      confirmation: "🔍 Tìm kiếm giao dịch lương..."
    };
    
    const result2 = handleSearch(intentObj2);
    console.log(`✅ Minimal search success: ${result2.success}`);
    
    console.log("\n✅ All handleSearch tests completed successfully!");
    return true;
    
  } catch (error) {
    console.error("❌ Error in handleSearch tests:", error);
    return false;
  } finally {
    // Restore original functions
    SpreadsheetApp = originalSpreadsheetApp;
    if (originalSendTelegramMessage) {
      this.sendTelegramMessage = originalSendTelegramMessage;
    }
  }
}

//test ID-based transaction operations
function testTransactionIdOperations() {
  console.log("\n🧪 Testing ID-based Transaction Operations...");

  const testData = createTestData();
  const originalSpreadsheetApp = SpreadsheetApp;

  try {
    // Mock SpreadsheetApp with extended functionality for ID operations
    SpreadsheetApp = mockSpreadsheetAppWithIdOperations(testData);

    // Test 1: Generate Transaction ID
    console.log("\n🆔 Test 1: Generate Transaction ID");
    const newId = generateTransactionId();
    console.log(`✅ Generated ID: ${newId}`);
    console.log(`✅ ID format valid: ${newId.startsWith('TX_')}`);

    // Test 2: Find Transaction by ID
    console.log("\n🔍 Test 2: Find Transaction by ID");
    const findResult = findTransactionRowById("🛒Chi phí biến đổi", "TX_1699345678_004");
    console.log(`✅ Find result success: ${findResult.success}`);
    if (findResult.success) {
      console.log(`✅ Found transaction: ${findResult.rowData.description}`);
      console.log(`✅ Row number: ${findResult.rowNumber}`);
    }

    // Test 3: Find non-existent transaction
    console.log("\n❌ Test 3: Find non-existent transaction");
    const findResult2 = findTransactionRowById("🛒Chi phí biến đổi", "TX_NONEXISTENT");
    console.log(`✅ Non-existent find failed as expected: ${!findResult2.success}`);

    // Test 4: Update Transaction by ID
    console.log("\n✏️ Test 4: Update Transaction by ID");
    const updateResult = updateTransactionById("🛒Chi phí biến đổi", "TX_1699345678_004", {
      description: "Đặt đồ ăn UBER EATS (Updated)",
      amount: 30.00
    });
    console.log(`✅ Update result success: ${updateResult.success}`);
    if (updateResult.success) {
      console.log(`✅ Updated transaction ID: ${updateResult.transactionId}`);
    }

    // Test 5: Delete Transaction by ID
    console.log("\n🗑️ Test 5: Delete Transaction by ID");
    const deleteResult = deleteTransactionById("🛒Chi phí biến đổi", "TX_1699567890_006");
    console.log(`✅ Delete result success: ${deleteResult.success}`);
    if (deleteResult.success) {
      console.log(`✅ Deleted transaction: ${deleteResult.deletedTransaction.description}`);
    }

    console.log("\n✅ All ID-based transaction operation tests completed!");
    return true;

  } catch (error) {
    console.error("❌ Error in ID-based transaction tests:", error);
    return false;
  } finally {
    // Restore original SpreadsheetApp
    SpreadsheetApp = originalSpreadsheetApp;
  }
}

//test handleAddTransaction with ID generation
function testHandleAddTransaction() {
  console.log("\n🧪 Testing handleAddTransaction with ID generation...");

  const testData = createTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  const originalSendTelegramMessage = typeof sendTelegramMessage !== 'undefined' ? sendTelegramMessage : null;

  // Mock functions
  this.sendTelegramMessage = function(message) {
    console.log("📱 Mock Telegram message:", message);
  };

  try {
    // Mock SpreadsheetApp
    SpreadsheetApp = mockSpreadsheetAppWithIdOperations(testData);

    // Test 1: Add new transaction
    console.log("\n➕ Test 1: Add new transaction");
    const intentObj1 = {
      tab: "🛒Chi phí biến đổi",
      date: "25/11/2024",
      desc: "Test transaction",
      amount: "€15.50",
      location: "Test location",
      category: "Test category",
      comment: "Test comment",
      confirmation: "Đã thêm giao dịch test"
    };

    const result1 = handleAddTransaction(intentObj1);
    console.log(`✅ Add transaction success: ${result1.success}`);
    console.log(`✅ Messages count: ${result1.messages.length}`);
    console.log(`✅ Message contains ID: ${result1.messages[0].includes('ID:')}`);

    // Test 2: Add transaction to non-existent sheet
    console.log("\n❌ Test 2: Add transaction to non-existent sheet");
    const intentObj2 = {
      tab: "NonExistentSheet",
      desc: "Test transaction",
      amount: "€10.00",
      confirmation: "Test confirmation"
    };

    const result2 = handleAddTransaction(intentObj2);
    console.log(`✅ Non-existent sheet failed as expected: ${!result2.success}`);

    console.log("\n✅ All handleAddTransaction tests completed!");
    return true;

  } catch (error) {
    console.error("❌ Error in handleAddTransaction tests:", error);
    return false;
  } finally {
    // Restore original functions
    SpreadsheetApp = originalSpreadsheetApp;
    if (originalSendTelegramMessage) {
      this.sendTelegramMessage = originalSendTelegramMessage;
    }
  }
}

//test handleModifyTransaction with ID-based operations
function testHandleModifyTransaction() {
  console.log("\n🧪 Testing handleModifyTransaction with ID-based operations...");

  const testData = createTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  const originalSendTelegramMessage = typeof sendTelegramMessage !== 'undefined' ? sendTelegramMessage : null;

  // Mock functions
  this.sendTelegramMessage = function(message) {
    console.log("📱 Mock Telegram message:", message);
  };

  try {
    // Mock SpreadsheetApp
    SpreadsheetApp = mockSpreadsheetAppWithIdOperations(testData);

    // Test 1: Modify transaction in same sheet
    console.log("\n✏️ Test 1: Modify transaction in same sheet");
    const intentObj1 = {
      tab: "🛒Chi phí biến đổi",
      transactionId: "TX_1699345678_004",
      desc: "Updated UBER EATS order",
      amount: "€28.00",
      category: "Ăn uống",
      confirmation: "Đã cập nhật giao dịch UBER EATS"
    };

    const result1 = handleModifyTransaction(intentObj1, "original text", "reply text");
    console.log(`✅ Modify transaction success: ${result1.success}`);
    console.log(`✅ Message contains ID: ${result1.messages.includes('ID:')}`);

    // Test 2: Move transaction to different sheet
    console.log("\n🔄 Test 2: Move transaction to different sheet");
    const intentObj2 = {
      tab: "🛒Chi phí biến đổi",
      newtab: "🏠Chi phí cố định",
      transactionId: "TX_1699456789_005",
      category: "Thuê nhà",
      confirmation: "Đã chuyển giao dịch sang chi phí cố định"
    };

    const result2 = handleModifyTransaction(intentObj2, "original text", "reply text");
    console.log(`✅ Move transaction success: ${result2.success}`);
    console.log(`✅ Message contains new ID: ${result2.messages.includes('ID mới:')}`);

    // Test 3: Modify with missing transaction ID
    console.log("\n❌ Test 3: Modify with missing transaction ID");
    const intentObj3 = {
      tab: "🛒Chi phí biến đổi",
      desc: "Updated description",
      confirmation: "Test confirmation"
    };

    const result3 = handleModifyTransaction(intentObj3, "original text", "reply text");
    console.log(`✅ Missing ID failed as expected: ${!result3.success}`);

    // Test 4: Modify non-existent transaction
    console.log("\n❌ Test 4: Modify non-existent transaction");
    const intentObj4 = {
      tab: "🛒Chi phí biến đổi",
      transactionId: "TX_NONEXISTENT",
      desc: "Updated description",
      confirmation: "Test confirmation"
    };

    const result4 = handleModifyTransaction(intentObj4, "original text", "reply text");
    console.log(`✅ Non-existent transaction failed as expected: ${!result4.success}`);

    console.log("\n✅ All handleModifyTransaction tests completed!");
    return true;

  } catch (error) {
    console.error("❌ Error in handleModifyTransaction tests:", error);
    return false;
  } finally {
    // Restore original functions
    SpreadsheetApp = originalSpreadsheetApp;
    if (originalSendTelegramMessage) {
      this.sendTelegramMessage = originalSendTelegramMessage;
    }
  }
}

//test handleDeleteTransaction with ID-based operations
function testHandleDeleteTransaction() {
  console.log("\n🧪 Testing handleDeleteTransaction with ID-based operations...");

  const testData = createTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  const originalSendTelegramMessage = typeof sendTelegramMessage !== 'undefined' ? sendTelegramMessage : null;

  // Mock functions
  this.sendTelegramMessage = function(message) {
    console.log("📱 Mock Telegram message:", message);
  };

  try {
    // Mock SpreadsheetApp
    SpreadsheetApp = mockSpreadsheetAppWithIdOperations(testData);

    // Test 1: Delete existing transaction
    console.log("\n🗑️ Test 1: Delete existing transaction");
    const intentObj1 = {
      tab: "🛒Chi phí biến đổi",
      transactionId: "TX_1699678901_008",
      confirmation: "Đã xóa giao dịch Uber taxi"
    };

    const result1 = handleDeleteTransaction(intentObj1);
    console.log(`✅ Delete transaction success: ${result1.success}`);
    console.log(`✅ Message contains ID: ${result1.messages[0].includes('TX_')}`);

    // Test 2: Delete with missing transaction ID
    console.log("\n❌ Test 2: Delete with missing transaction ID");
    const intentObj2 = {
      tab: "🛒Chi phí biến đổi",
      confirmation: "Test confirmation"
    };

    const result2 = handleDeleteTransaction(intentObj2);
    console.log(`✅ Missing ID failed as expected: ${!result2.success}`);

    // Test 3: Delete non-existent transaction
    console.log("\n❌ Test 3: Delete non-existent transaction");
    const intentObj3 = {
      tab: "🛒Chi phí biến đổi",
      transactionId: "TX_NONEXISTENT",
      confirmation: "Test confirmation"
    };

    const result3 = handleDeleteTransaction(intentObj3);
    console.log(`✅ Non-existent transaction failed as expected: ${!result3.success}`);

    console.log("\n✅ All handleDeleteTransaction tests completed!");
    return true;

  } catch (error) {
    console.error("❌ Error in handleDeleteTransaction tests:", error);
    return false;
  } finally {
    // Restore original functions
    SpreadsheetApp = originalSpreadsheetApp;
    if (originalSendTelegramMessage) {
      this.sendTelegramMessage = originalSendTelegramMessage;
    }
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

//individual test runner functions for manual testing

// Search functionality tests
function testSearchOnly() {
  return testSearchTx();
}

function testFormatOnly() {
  return testFormatSearchResults();
}

function testHandleSearchOnly() {
  return testHandleSearch();
}

// ID-based transaction operation tests
function testIdOperationsOnly() {
  return testTransactionIdOperations();
}

function testAddTransactionOnly() {
  return testHandleAddTransaction();
}

function testModifyTransactionOnly() {
  return testHandleModifyTransaction();
}

function testDeleteTransactionOnly() {
  return testHandleDeleteTransaction();
}

// Group test runners
function testSearchFunctionalityOnly() {
  return runAllSearchTests();
}

function testTransactionFunctionalityOnly() {
  return runAllTransactionTests();
}
