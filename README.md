The Telegram bot enables a household to manage their budget semi-automatically through email synchronisation and manual input. By tagging or replying to the bot, a user can
- add/modify/delete a transaction to change the amount, date or any description relevant to the transaction
- get the general monthly financial status
- get the detailed monthly financial status for a group
- set up and adjust the budget for a new month based on an existing month
- sync up with a GMail inbox to read and add transaction based on the bank mail notifications

## botHandler
- Read Telegram message and call for intent detection
- Send the answer to a dedicated group chat (or channel) set in the configuration
- DEBUG MODE: on to send replies to the main channel, off to the debug channel

## promptHandler
- Build both user and system prompts before calling the llm
- Prompts are used for: transaction classification, intent detection, spending analytics (with sub-intent), budget analytics, monthly budget setup, enrich the context and instruction database

## llmHandler
- Build the prompts based on promptHanlder functions
- Call the LLM to get the results

## sheetHandler
- Functions to retrieve or update the sheet data
- Based on the sheets named ranges
- Including: get/set tx, get/set budget, get dashboard data, get/set classification instruction, context, budgeting instructions

## configuration_template
Configuration required for the bot to run properly
