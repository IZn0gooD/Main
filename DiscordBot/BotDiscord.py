import discord
from discord.ext import commands
import subprocess

# Créer une instance de bot
intents = discord.Intents.default()
intents.message_content = True  # Autorise le bot à lire le contenu des messages
intents.guilds = True  # Pour avoir accès aux informations du serveur 
intents.members = True  # Si tu as besoin d'informations sur les membres du serveur
bot = commands.Bot(command_prefix="!", intents=intents)

TOKEN = "YOUR TOKEN"

# Fonction pour vérifier l'état du serveur Minecraft via un script shell
def check_server_status():
    try:
        # Script shell qui vérifie l'état du serveur
        result = subprocess.run(["/home/minecraft/discord/check_server_status.sh"], capture_output=True, text=True)
        return result.stdout.strip() == "on"  # On suppose que le script retourne "on" si le serveur est allumé
    except Exception as e:
        print(f"Erreur lors de la vérification de l'état du serveur : {e}")
        return False

# Fonction pour exécuter un script shell donné
def execute_script(script_path):
    try:
        subprocess.run([script_path], check=True)
    except Exception as e:
        print(f"Erreur lors de l'exécution du script {script_path} : {e}")

# Commande !minecraft
@bot.command(name="minecraft")
async def minecraft(ctx):
    server_status = check_server_status()
    
    # Définir l'état du serveur et les boutons correspondants
    if server_status:
        description = "Le serveur Minecraft est actuellement allumé."
        button_label = "Éteindre le serveur"
        button_style = discord.ButtonStyle.danger
        button_callback = turn_off_server
    else:
        description = "Le serveur Minecraft est actuellement éteint."
        button_label = "Allumer le serveur"
        button_style = discord.ButtonStyle.success
        button_callback = turn_on_server

    # Créer un embed pour afficher l'état du serveur
    embed = discord.Embed(title="État du serveur Minecraft", description=description, color=discord.Color.blue())
    view = discord.ui.View()

    # Ajouter le bouton pour allumer/éteindre le serveur
    button = discord.ui.Button(label=button_label, style=button_style)
    button.callback = button_callback
    view.add_item(button)

    # Envoyer le message avec le bouton
    await ctx.send(embed=embed, view=view)

# Callback pour allumer le serveur
async def turn_on_server(interaction: discord.Interaction):
    await interaction.response.defer()  # Indiquer que la réponse prend du temps
    execute_script("/home/minecraft/discord/start_server.sh")
    await interaction.followup.send("Le serveur Minecraft est en cours d'allumage...", ephemeral=True)

# Callback pour éteindre le serveur
async def turn_off_server(interaction: discord.Interaction):
    await interaction.response.defer()  # Indiquer que la réponse prend du temps
    execute_script("/home/minecraft/discord/stop_server.sh")
    await interaction.followup.send("Le serveur Minecraft est en cours d'arrêt...", ephemeral=True)

# Événement de connexion du bot
@bot.event
async def on_ready():
    print(f'We have logged in as {bot.user}')

# Connecte le bot au serveur
bot.run(TOKEN)
