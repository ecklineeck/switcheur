/**
 * How to use Auto Channel
 * This plugin is designed to help in the automatic creation and deletion of channels inside of a category channel. 
 * Auto channels that are not inside of Catrgory channels will be ignored.
 * What is an cration channel? An auto channel is a channel that when joined will create a new auto channel, then move the user into that auto channel. The new auto channel takes the permissions and settings of the creator channel it was created from allowing you to use them for many things!
 * What is an auto channel? These are the channels created by maker channels, note these will be deleted automatically when they are empty!
 * How to create a new auto channel? Inside the autoChannelLite config there is an emoji (🎮 by default) that when a channel is prefixed with it becomes an auto channel.
 * You can also give the creator of auto channels
 */



module.exports = {
    loading: function () {
        console.debug('Loading Auto Channel for Firebot V1.0')

    },

    ready: function () {
        client.autoChannel = require("./autoChannelLite/config")

        client.autoChannel.currentAutoChannels = new Array
    },

    message: function (args, command, message) {

    },

    channelCreate: function (channel) {

    },

    channelDelete: function (channel) {
        // This will remove autoChannels from the array if they are deleted (Garbage Collection basically)
        if (client.autoChannel.currentAutoChannels.includes(channel.id)) {
            for (i = 0; client.autoChannel.currentAutoChannels.length > i; i++) {
                if (client.autoChannel.currentAutoChannels[i] === channel.id) {
                    client.autoChannel.currentAutoChannels.splice(i, 1)
                }
            }
        }
        console.log(client.autoChannel.currentAutoChannels)
    },

    voiceStateUpdate: function (oldMember, newMember) {


        //user wants to create new auto channel
        if (newMember.voiceChannelID) {
            const newChannel = newMember.guild.channels.get(newMember.voiceChannelID);
            if (newChannel.name.startsWith(client.autoChannel.channelPrefix) && newChannel.parent !== undefined) {
                newChannel.clone({
                    name: '--' + client.autoChannel.newChannelName,
                    withPermissions: true,
                    withTopic: false,
                    reason: 'New autoGroup Channel created by: ' + newMember.displayName
                })
                    .then(createdChannel => {
                        createdChannel.edit({
                            bitrate: 96000,
                            userLimit: newChannel.userLimit,
                            parentID: newChannel.parentID,
                            rawPosition: newChannel + 1,
                        })  // add new channel to array, and give permissions if setup in config.
                            .then(createdChannel => {
                                newMember.setVoiceChannel(createdChannel)
                                createdChannel.overwritePermissions(newMember.user, client.autoChannel.groupCreatorPermissions)
                                client.autoChannel.currentAutoChannels.push(createdChannel.id)
                            })
                    })
            }
        }

        // Check if the user came from another channel.
        if (oldMember.voiceChannelID && typeof (oldMember.guild.channels.get(oldMember.voiceChannelID)) != "undefined") {
            // Delete the user's now empty temporary channel, if applicable.
            const oldChannel = oldMember.guild.channels.get(oldMember.voiceChannelID);
            if (client.autoChannel.currentAutoChannels.includes(oldChannel.id) && !oldChannel.members.array().length) {
                oldChannel.delete()
            }
        }
    },
    help: {
        embed: {
            color: 16711680,
            author: {
                name: "Fire Bot Auto Channel",
                icon_url: 'http://i.imgur.com/aDiphof.png'
            },
            title: "How to use Auto Channel!",
            fields: [{
                name: "Create and Auto Channel!",
                value: "To create an Auto Channel join any channel with a controller emoji prefix. If will move you into the new Auto Channel automatically! Others can join your auto channels just like any normal channel!"
            },
            {
                name: "Leaving an Auto channel",
                value: "When everyone leaves auto channel it deletes itself, cool right!"
            },
            {
                name: "Group Creators",
                value: "On Warframe LFG if your the creator of an Auto Channel your allowed to edit the channel setting and change the channel name! You can also drag unwanted guests out of the channel by dropping them in the Vesper Relay!"
            }
            ],
            timestamp: new Date(),
            footer: {
                icon_url: 'http://i.imgur.com/aDiphof.png',
                text: "© Firebot"
            }
        }

    }
}
