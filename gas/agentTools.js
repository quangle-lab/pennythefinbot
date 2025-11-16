tools =[
  {
    "type": "function",
    "name": "getBudgetData",
    "description": "Retrieve budget data for a specific month",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "monthText": {
          "type": "string",
          "description": "Month in MM/yyyy format (e.g., '12/2024')"
        }
      },
      "additionalProperties": false,
      "required": [
        "monthText"
      ]
    }
  },
  {
    "type": "function",
    "name": "getDashboardData",
    "description": "Get dashboard spending data for a specific month",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "monthText": {
          "type": "string",
          "description": "Month in MM/yyyy format (e.g., '12/2024')"
        }
      },
      "additionalProperties": false,
      "required": [
        "monthText"
      ]
    }
  },
  {
    "type": "function",
    "name": "findTransactionRowById",
    "description": "Find a transaction by its unique ID",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "sheetName": {
          "type": "string",
          "description": "Name of the transaction group sheet"
        },
        "transactionId": {
          "type": "string",
          "description": "Unique transaction ID (e.g., 'TX_1699123456_789')"
        }
      },
      "additionalProperties": false,
      "required": [
        "sheetName",
        "transactionId"
      ]
    }
  },
  {
    "type": "function",
    "name": "getFundBalances",
    "description": "Get fund balances for specific fund types or all funds from the unified stats_BalanceOverview range. This does not include the bank account balances for fixed and variable expenses. Returns data for Quỹ gia đình (rainy/family), Quỹ mục đích (target), and Tiết kiệm (saving) funds with cash available, planned amount, gap, target amount, account number, and update date.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "rainy",
            "family",
            "target",
            "saving",
            "all"
          ],
          "description": "Fund type: 'rainy' or 'family' for family fund (Quỹ gia đình), 'target' for purpose fund (Quỹ mục đích), 'saving' for savings (Tiết kiệm), 'all' for all funds"
        }
      },
      "additionalProperties": false,
      "required": [
        "type"
      ]
    }
  },
  {
    "type": "function",
    "name": "getTxCat",
    "description": "Get list of transaction categories and groups with their descriptions",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "type": "function",
    "name": "getFamilyContext",
    "description": "Get family context information for financial planning",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "type": "function",
    "name": "getCategoriseInstructions",
    "description": "Get categorization instructions for transaction classification",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "type": "function",
    "name": "getBudgetInstructions",
    "description": "Get budget creation and management instructions to plan spending for the family and budget management tips",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "type": "function",
    "name": "searchTransactions",
    "description": "Search for transactions in spreadsheet based on date range, groups, categories, and keywords.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "startDate": {
          "type": "string",
          "description": "Start date for filtering transactions in DD/MM/YYYY format."
        },
        "endDate": {
          "type": "string",
          "description": "End date for filtering transactions in DD/MM/YYYY format."
        },
        "groups": {
          "type": "array",
          "description": "List of transaction group names (sheet names) to search. If empty or not provided, all groups are searched.",
          "items": {
            "type": "string",
            "description": "Transaction group or sheet name."
          }
        },
        "categories": {
          "type": "array",
          "description": "List of categories to filter transactions.",
          "items": {
            "type": "string",
            "description": "Category name."
          }
        },
        "keywords": {
          "type": "array",
          "description": "Keywords to match in transaction description or bank comment.",
          "items": {
            "type": "string",
            "description": "Search keyword."
          }
        }
      },
      "required": [
        "startDate",
        "endDate",
        "groups",
        "categories",
        "keywords"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "getCategoryRemainingAmount",
    "description": "Calculate the remaining budget amount for a specific category in a specific group",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "group": {
          "type": "string",
          "description": "Name of the transaction group (e.g., '🛒 Chi phí biến đổi', '💸 Chi phí cố định')"
        },
        "category": {
          "type": "string",
          "description": "Name of the category within the group (e.g., 'Chợ', 'Ăn ngoài')"
        }
      },
      "additionalProperties": false,
      "required": [
        "group",
        "category"
      ]
    }
  },
  {
    "type": "function",
    "name": "getBankAccountBalances",
    "description": "Retrieve the real bank account balances data from stats_BalanceOverview range for spending groups (Chi phí cố định, Chi phí biến đổi, Quỹ gia đình) and also includes detailed saving breakdown from stats_SavingBreakdown range showing savings by type (cash, forex, coin, etf, etc.) with balances, account numbers, forex balances, and update dates.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "type": "function",
    "name": "getSavingBreakdown",
    "description": "Get detailed breakdown of savings from stats_SavingBreakdown range, showing savings by type (cash, forex, coin, etf, etc.) with individual balances, account numbers, forex balances if available, update dates, and notes. For Cash type, the balance should match with the saving row in the overview balance.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  }
]
