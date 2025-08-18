# 🤖 Penny — Telegram Finance Assistant Bot

**Penny** is a Telegram bot that helps families manage their household finances through a semi-automated system integrated with Google Sheets/GMail. It works via email notifications and manual input, using an LLM for smart classification and analysis.
Penny can also act as a personal finance assistant, providing insights, recommendations, and coaching based on your spending data, budgets habits, goals and instructions.

---

## 🧰 Prerequisites

To use the bot, you’ll need:

* ✅ A Google Spreadsheet with the proper structure ([see template](#))
* ✅ A Telegram bot with **privacy mode turned off** to read group messages
* ✅ An OpenAI API key
* ✅ Apps Script project with the following configuration:

| Setting                 | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `debug_Mode`            | `on`: send replies to debug chat, `off`: send to main group |
| `sheet_ContextConfig`   | Name of the sheet storing prompt context/instructions       |
| `sheet_txCatConfig`     | Name of the sheet with transaction categories               |
| `telegram_DebugChat`    | Chat ID for debug messages                                  |
| `telegram_logsChat`     | Chat ID for system logs                                     |
| `telegram_lastUpdateId` | Tracks last Telegram message processed                      |

---

## ✨ Features

Interact with Penny directly in your Telegram group chat using natural language. Supported actions include:

* 📬 Get notified of new transactions via bank emails
* 🖌️ Keep track of the bank account balances for each expesens via bank emails
* 📝 Add, modify, or delete transactions manually
* 💰 Create or modify budgets
* 🔍 Search for transactions based on criteria like date, category, or keywords
* 📊 View overall or detailed spending reports (e.g., fixed, variable, savings, family fund)
* 📝 Get financial coaching and advice based on your spending data, budgets habits, goals and instructions
---

## 🔐 Data Privacy

* Penny **does not store** user or transaction data.
* All data lives in your Google Spreadsheet.
* The bot only tracks the last Telegram update ID to avoid duplicate reads.
* You can turn off the bot anytime and continue using the spreadsheet manually.

---

## 🕒 Scheduled Jobs

| Task                                  | Frequency    |
| ------------------------------------- | ------------ |
| Check bank email for new transactions | Every 10 min |
| Read Telegram group chat              | Every minute |
| Send weekly spending summary          | Every Sat    |
| Generate monthly budget suggestion    | Every 27th   |

---

## 🧱 Codebase Overview

```text
.
├── mailHandler.js            # Checks bank emails for new transactions
├── botHandler.js             # Handles Telegram messages, detects intent, calls actionHandler and sends replies
├── actionHandler.js          # Executes specific actions based on detected intent
├── promptHandler.js          # Generates prompts for intent detection and financial reasoning
├── llmHandler.js             # Sends prompts to the LLM and parses responses
├── agentHandler.js           # Handles agent conversations with multiple function calls
├── toolHandler.js            # List of tools available to the agent
├── sheetHandler.js           # Reads/writes transaction, budget, and config data from Sheets
├── configuration_template.js # Sample config required to run the bot
├── testHandler.js            # Unit tests for core functionality
```
