require("dotenv").config();
const fs = require("fs");
const Discord = require("discord.js");
Discord.Rest = require('@discordjs/rest');
Discord.Builders = require('@discordjs/builders');

// Vérification de l'existence d'un token discord
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error("No Discord bot token provided in .env file");
    process.exit(1);
}

// Récupération de la sauvegarde
var saveFile = process.env.SAVE_FILE;
var data = {
    guilds: []
};
if (fs.statSync(saveFile)) {
    data = JSON.parse(fs.readFileSync(saveFile));
    console.info("Loaded save from "+saveFile);    
}

// Fonction de sauvegarde
function save() {
    fs.writeFileSync(saveFile, JSON.stringify(data));
    console.info("Saved save to "+saveFile);
}

// Création des commandes
var commands = [
    new Discord.Builders.SlashCommandBuilder()
        .setName("tweetschannel")
        .setDescription("Set the channel where users can submit tweets")
        .addChannelOption(option => option.setName("channel").setDescription("The channel")),
    new Discord.Builders.SlashCommandBuilder()
        .setName("tweetsemoji")
        .setDescription("Set the emoji to react to publish a message on Twitter")
        .addStringOption(option => option.setName("emoji").setDescription("The emoji").setRequired(true)),
    new Discord.Builders.SlashCommandBuilder()
        .setName("tweetsemojicount")
        .setDescription("Set the count of emojis needed to publish a message on Twitter")
        .addIntegerOption(option => option.setName("count").setDescription("The minimal count").setRequired(true))
].map(command => command.toJSON());

// Publication des commandes
function publishCommands(appId, guild) {
    const rest = new Discord.Rest.REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);
    rest.put("/applications/"+appId+"/guilds/"+guild.id+"/commands", { body: commands })
        .then(() => console.log("Successfully registered application commands on guild "+guild.name))
        .catch(console.error);
}

// Création du client
const client = new Discord.Client({ intents:
    [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});
client.on("ready", () => {
    console.log("Logged in as "+client.user.tag);
    for (let guild of client.guilds.cache) {
        publishCommands(client.user.id, guild[1]);
        if (!data.guilds[guild[1].id])
            data.guilds[guild[1].id] = {tweetsChannelId:null, tweetsEmoji:"🐦", tweetsEmojiCount:10};
    }
});

// Quand un nouveau serveur est ajouté
client.on("guildCreate", guild => {
    publishCommands(client.user.id, guild);
    data.guilds[guild.id] = {tweetsChannelId:null, tweetsEmoji:"🐦", tweetsEmojiCount:10};
});

// Quand une commande est envoyée
client.on("interactionCreate", interaction => {
    if (!interaction.isCommand()) return;
    console.log(`interactionCreate in ${interaction.channel.id} : ${interaction.commandName} (${interaction.options.length})`);
    switch (interaction.commandName) {
        case "tweetschannel":
            var channel = interaction.options.getChannel("channel") ?? interaction.channel;
            data.guilds[interaction.guild.id].tweetsChannelId = channel.id;
            save();
            interaction.reply("Tweets channel set to <#"+channel.id+"> !")
            break;
        case "tweetsemoji":
            var emoji = interaction.options.getString("emoji");
            var matchCustomEmoji = emoji.match(/^<:[^: ]+:([0-9]+)>$/);
            if (matchCustomEmoji)
                emoji = matchCustomEmoji[1];
            else console.log(emoji.length);
            data.guilds[interaction.guild.id].tweetsEmoji = emoji;
            save();
            interaction.reply("Tweets emoji set to "+interaction.options.getString("emoji")+" !")
            break;
        case "tweetsemojicount":
            var count = interaction.options.getInteger("count");
            data.guilds[interaction.guild.id].tweetsEmojiCount = count;
            save();
            interaction.reply("Tweets emoji count set to "+count+" !")
            break;
    }
});

// Quand un message est envoyé
client.on("messageCreate", message => {
    console.log("messageCreate in "+message.channel.id+" : " + message.content);
    if (message.author.bot) return;
    if (message.channel.id == data.guilds[message.guild.id].tweetsChannelId) {
        message.react(data.guilds[message.guild.id].tweetsEmoji)
            .catch(e => {
                message.channel.send("Tweet emoji is invalid, reset it with /tweetsemoji");
            });
    }
});

// Quand une réaction est ajoutée
client.on("messageReactionAdd", (reaction, user) => {
    var emoji = reaction.emoji.id ?? reaction.emoji.name;
    var guildData = data.guilds[reaction.message.guild.id];
    if (reaction.message.channel.id == guildData.tweetsChannelId) {
        if (reaction.count >= guildData.tweetsEmojiCount && emoji == guildData.tweetsEmoji) {
            if(reaction.message.reactions.cache["☑"] && reaction.message.reactions.cache["☑"].me) return;
            console.log("Tweeting message \""+reaction.message.content+"\"");
            reaction.message.react("☑");
            save();
        }
    }
});

// Connexion du client à Discord
client.login(process.env.DISCORD_BOT_TOKEN);
