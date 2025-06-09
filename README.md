# Penny - The Financial Bot
## Prerequisites
- Google Spreadsheet with the correct structure (c.f. template)
- Telegram bot with the privacy turned off to read the group messages freely
- OpenAI account with the API key

## AppsScripts project settings
- debug_Mode: `off` to send replies to the main channel, `on` to the debug channel
- sheet_ContextConfig: the sheet name where the context and instruction are stored for prompts building
- sheet_txCatConfig: the sheet name where the transaction categories are stored
- telegram_DebugChat: the chat id where the debug messages are sent
- telegram_logsChat: the chat id where the log messages are sent
- telegram_lastUpdateId: the last update id read from Telegram, to avoid reading the same message twice


## Features
### Description
The Telegram bot enables a household to manage their budget semi-automatically through email synchronisation and manual input. 
The only database is a **Google Spreadsheet**.

**By tagging or replying to the bot as if talking to an assistant**, a user can
- get notified via Telegram whenever there's a mail notification from the bank
- modify/delete any spending transaction with the amount, date and any description relevant to the family
- add new transactions manually
- request the general spending status of the family
- request the detailed spending status for a group such as *fix expense, variable expense, saving, family fund, target fund*, etc.
- get the weekly spending report
- get monthly budget suggestion and adjust the budget for the next month
- check the affordability of a new purchase or a short-term goal

### Data privacy
- At anytimes, the user can turn off the bot and continue using the spreadsheet manually
- The bot does not store any user data, except for the last update id read from Telegram to avoid reading the same message twice
- The bot does not store any chat data, all the conversation is happening in the Telegram group
- The bot does not store any transaction data, all the transactions are stored in the Google Spreadsheet and fetch on the fly to answer the user queries

### Scheduled functions
- Read the mailbox every hour to add new transactions
- Read the group chat every minute to answer user queries
- Send weekly spending report every Monday
- Initiate the monthly budget every 27th of the month

## Codebase
### botHandler
- Read Telegram message and call for intent detection
- Act upon the detected intent with the proper function (get/set from the sheets)
- Send the answer to a dedicated group chat (or channel) set in the configuration

### promptHandler
- Build both user and system prompts before calling the LLM
- Prompts are used for: transaction classification, intent detection, spending analytics (with sub-intent), budget analytics, monthly budget setup, enrich the context and instruction database

### llmHandler
- Build the prompts using available promptHanlder functions
- Call the LLM to get the results

### sheetHandler
- Functions to retrieve or update the sheet data while relying on the sheets named ranges to retrieve
- Including: get/set tx, get/set budget, get dashboard data, get/set classification instruction, context, budgeting instructions

### configuration_template
Configuration required for the bot to run properly
