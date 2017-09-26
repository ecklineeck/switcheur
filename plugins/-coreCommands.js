module.exports = {
    // This plugin is the core commands for Fire Bot. We put them here so if users want to use other command plugins they can!
    loading: function () {
        console.debug('Loading Fire Bot Core Commands')
    },

    message: function (args, command, message) {
        // This is the command that will update the prefix for the bot
        if (command === "prefix" && message.author.id === "109440322139885568") {
            console.log(args)
            const newPrefix = args[0];
            console.log(newPrefix)
            message.delete().catch(O_o => { });
            fireconfig.update({
                value: newPrefix,
            }, {
                    where: {
                        Setting: {
                            $eq: "Prefix"
                        }
                    }
                })
            client.prefix = newPrefix
            message.channel.send("I have updated to prefix to " + newPrefix)
            message.react("✅")

        } else if (command === "prefix" && message.author.id !== "109440322139885568") {
            message.channel.send("Sorry this is a command only for my master")
        }
        if (command === "ping") {
            message.channel.send("Pong!")
            message.react("✅")

        }
        if (command === "info") {
            message.channel.send("I'm firebot V1.0 bitched!!! | Check me out at www.firebot.online!")
            message.react("✅")

        }
        if (command === "help") {
            for (i = 0; i < client.pluginHelp.length; i++) {
                message.channel.send(client.pluginHelp[i])
            }
            message.react("✅")
        }
        //console.log(message.author)

    },

    help: {
        embed: {
            color: 16711680,
            author: {
                name: "Firebot for Discord",
                icon_url: 'http://i.imgur.com/aDiphof.png'
            },
            title: "Commands",
            description: "Below lists all of my commands, if some don't work for you make sure you have permissions to actually use them!",
            fields: [
            {
                name: "Ping",
                value: "You say Ping and I say Pong!"
            },
            {
                name: "Info",
                value: "I'll tell you what version of Firebot this discord is running, and where you can download Firebot for yourself!"
            },
			{
                name: "Help",
                value: "Displays this help info... or did you forget already?"
            }
            ],
            timestamp: new Date(),
            footer: {
                icon_url: 'http://i.imgur.com/aDiphof.png',
                text: "© Firebot"
            }
        }

    }
};