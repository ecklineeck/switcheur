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
        console.debug('Loading Auto Role Lite for Firebot V1.0')

    },

    ready: function () {
        client.autoRole = require("./autoRoleLite/config")
        // remove all auto roles when bot comes online
        client.guilds.forEach(function (guild) {
            guild.members.forEach(function (member) {
                member.roles.forEach(function (role) {
                    if (role.name.startsWith(client.autoRole.rolePrefix)) { member.removeRole(role) } //role is removed if it starts with the prefix defined in the config.
                })
            })
        })
    },

    presenceUpdate: function (oldMember, newMember) {
        var guild = newMember.guild;
        console.log(newMember.user.username + "presence has been updated!")
        console.log(newMember.user)
        if (!newMember.user.presence.activity) {
            //take away auto roles when there is no activity.
            newMember.roles.forEach(function (role) {
                if (role.name.startsWith(client.autoRole.rolePrefix)) { newMember.removeRole(role) }
            });
        }
        else if (newMember.user.presence.activity.type == "PLAYING") {
            //remove other auto roles
            newMember.roles.forEach(function (role) {
                if (role.name.startsWith(client.autoRole.rolePrefix)) { newMember.removeRole(role) }
            });
            //get activity
            var newStatus = newMember.user.presence.activity.name;
            //give role if auto role exists for status
            var newRole = guild.roles.find("name", client.autoRole.rolePrefix + " " + newStatus)
            if (newRole) {
                newMember.addRole(guild.roles.find("name", client.autoRole.rolePrefix + " " + newStatus))
                    .then(function () {
                        console.log("Role:" + newRole + " was given to " + newMember.user.username);
                    }, function (e) {
                        console.error(e);
                    });
            }
        }
        else if (!newMember.user.presence.activity.type != "PLAYING") {
            //remove all auto roles when activity is not "playing."
            newMember.roles.forEach(function (role) {
                if (role.name.startsWith(client.autoRole.rolePrefix)) { newMember.removeRole(role) }
            });
        }
    },

    help: {
        embed: {
            color: 16711680,
            author: {
                name: "Fire Bot Auto Role",
                icon_url: 'http://i.imgur.com/aDiphof.png'
            },
            title: "Auto Role Help",
            fields: [{
                name: "Create and Auto Role.",
                value: "Auto Roles are created by making a role with a 🎮 prefix."
            },
            {
                name: "Join/Leave an Auto Role.",
                value: 'Players join and leave Auto Roles based on what they are playing. The Role must contain the name of the game they are playing for it to work.\nFor example if a member is playing Destiny 2, the auto role would be called "🎮 Destiny 2"'
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
