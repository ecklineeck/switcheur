module.exports = {
    // This plugin is the core commands for Fire Bot. We put them here so if users want to use other command plugins they can!
    loading: function () {
        console.debug('Loading Fire Bot Core Commands')
    },

    ready: function () {
        client.guilds.forEach(function (guild) {
            guild.owner.user.createDM()
                .then(dmChannel => {
                    dmChannel.send("Firebot AC has just restarted!")
                })
        })
    },

    message: function (args, command, message) {

        if (command === "ping") {
            message.channel.send("Pong!")
            message.react("✅")

        }
        if (command === "info") {
            message.channel.send("I'm firebot V1.0 bitched!!! | For support join my discord! https://discord.gg/7TZ7gTG ")
            message.react("✅")

        }
        if (command === "help") {
            for (i = 0; i < client.pluginHelp.length; i++) {
                message.channel.send(client.pluginHelp[i])
            }
            message.react("✅")
        }
        if (command === "servercount") {

        }
        if (command === "botannouncement" && message.author.id == "109440322139885568") {
            var announcement = args.join(" ");
            client.guilds.forEach(function (guild) {
                guild.owner.user.createDM()
                    .then(dmChannel => {
                        console.log(dmChannel)
                        dmChannel.send(announcement)
                    })
            })
            console.log(client.guilds)
            message.channel.send("Sent announcement to " + client.guilds.size + " server owners")
            message.react("✅")
        }
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