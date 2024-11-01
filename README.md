# Discord Minecraft Server Bot

## Description
Discord Minecraft Server Bot is a discord bot whose purpose is to look at a minecraft server instance, check whether it is running or not and turn it on or off accordingly. 

⚠️ An account called “minecraft” is required in the instance on which you're going to run the bot. Otherwise adapt the shell scripts to your liking. ⚠️
## Features
- Discord command "!minecraft"
- Script write in shell to check server status
- Script write in shell to turn on the server
- Script write in shell to turn off the server

## Installation
1. Clone the repository: `git clone https://github.com/IZn0gooD/Main/tree/Discord-Minecraft-Server-Bot.git`
2. Install the dependencies: `sudo apt install python3 python3-pip screen`
3. Setup the env: `python3 -m venv env`
4. Activate the env `source env/bin/activate`
5. Install the discord python package `pip install discord.py`
6. Run the program: `python main.py`
7. Launch the bot in his folder: `screen -dmS PyDisc bash -c "python3 BotDiscordV3.py"`
