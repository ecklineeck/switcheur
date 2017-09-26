var Discord = require('discord.js');
var path = require('path');
var fs = require('fs');
var sequelize = require('sequelize');
var config = require('./config')

// Create a global client so all our plugins have access to it.
global.client = new Discord.Client({ autoReconnect: true });
console.log('Firebot Loading');
var logErrors = true


// Let's give all the plugins access to the config incase they need any thing from it, or want to add to it.
client.config = config;
client.Logo = 'http://i.imgur.com/aDiphof.png';
client.commandPass = "✔";
client.commandFail = "❌";
if (client.config.BotSettings.Debug == true) {
  console.log("Debug is set to " + true + ". Firebot will output all debug information!")
}
// Database Setup if enabled (This will ignore what's written in the config.)
function dbLoad() {
  // Connection
  client.mysql = new sequelize(client.config.MySql.dbName, client.config.MySql.dbUserName, client.config.MySql.dbPassword, {
    host: client.config.MySql.dbHost,
    dialect: client.config.MySql.dbType,
    logging: client.config.BotSettings.Debug,
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
  });
  // Configuration table setup with it's default options.
  client.fireconfig = client.mysql.define('fireconfig', {
    setting: sequelize.STRING,
    value: sequelize.STRING
  })

  client.fireconfig.sync();

  // Let's add our default options to the database. This will insure that new options can later be added safely when you download new versions of the Firebot core.
  //Setup and Load the bot Prefix
  client.fireconfig.findOrCreate({
    where: {
      setting: "Prefix"
    }
  }).then(function (dbPrefix) {
    if (dbPrefix[0].value == undefined || dbPrefix[0].value == null) {
      client.fireconfig.update({
        value: "!",
      }, {
          where: {
            Setting: {
              $eq: "Prefix"
            }
          }
        })
      client.prefix = "!"
    }
    if (client.prefix != "!") {
      client.prefix = dbPrefix[0].value
    }
    console.log(client.prefix + " is the bot Prefix!")
  });
  // Add the ignoreBots default to the database if doesn't exist
  client.fireconfig.findOrCreate({
    where: {
      setting: "IgnoreBots"
    }
  }).then(function (dbIgnoreBots) {
    if (dbIgnoreBots[0].value == undefined || dbIgnoreBots[0].value == null) {
      client.fireconfig.update({
        value: true,
      }, {
          where: {
            Setting: {
              $eq: "IgnoreBots"
            }
          }
        })
      client.config.IgnoreBots = true
    }
    if (dbIgnoreBots[0].value == 1) {
      client.config.ignoreBots = true;
      console.log('Firebot will ignore other bots');
    } else {
      client.config.ignoreBots = false;
    }
  });
};

if (client.config.useDatabase === true) {
  dbLoad()
} else {
  client.prefix = client.config.BotSettings.prefix
  console.log(client.prefix + " is the bot Prefix!")
  if (client.config.BotSettings.ignoreBots == true) {
    client.config.ignoreBots = client.config.BotSettings.ignoreBots;
    console.log('Firebot will ignore other bots');
  } else {
    client.config.ignoreBots = client.config.BotSettings.ignoreBots;
  }
}
//
//
//
//
// END DATABASE SETUP

//Just in case you decided for some reason not to install plugins, let's close the bot.
var stillLoading = true

function NoPluginsFound() { Error.apply(this, arguments); this.reason = "I have no plugins!  (╯°□°）╯︵ ┻━┻) "; }
NoPluginsFound.prototype = Object.create(Error.prototype);

//Let's load some plugins!!!
const pluginsFolder = path.join(__dirname, "/plugins");
console.debug('Looking for plugin files...');
var pluginsList = fs.readdirSync(pluginsFolder);
// add debugging true here on release
if (client.config.BotSettings.Debug == true) { console.log(pluginsList) }
// let's remove all the non .js files from the array
if (pluginsList.length != 0) {
  for (i = 0; i < pluginsList.length; i++) {
    var type = fs.statSync(pluginsFolder + '/' + pluginsList[i])
    if (type.isDirectory() == true) {
      pluginsList.splice(i, 1)
    }
  }
};
if (client.config.BotSettings.Debug == true) { console.log(pluginsList) };


//
var pluginLoadErrors = 0;
var pluginListLength = pluginsList.length;
var pluginLoaded = new Array(pluginListLength);
if (pluginListLength != 0) {
  for (i = 0; i < pluginListLength; i++) {
    const currentPlugin = pluginsList[i].slice(0, -3);
    const pluginPath = path.join(pluginsFolder, pluginsList[i]);
    if (client.config.BotSettings.Debug == true) { console.log('found plugin: ' + pluginPath) };
    console.log('| Loading plugin: ' + currentPlugin);
    try {
      pluginLoaded[i] = require(pluginPath);
      // the next line is there to catch the error that occurs if a plugin creator removed the loading function, it's needed to keep the plugin count and array accurate.
      try { pluginLoaded[i].loading() } catch (err) { }
    }
    catch (err) {
      console.error("There was an error loading plugin: " + currentPlugin + "\nError Code: " + err || "Missing error code");
      //pluginLoadErrors = pluginLoadErrors + 1;
      if (client.config.BotSettings.Debug == true) { console.log(pluginsList[i] + ' has been unloaded') };
      pluginsList[i] = 'unloadedPlugin';
    }
  }
} else if (pluginLoaded.length == 0) {
  throw new NoPluginsFound()
};
// This will clean the plugin array, and remove any plugins that were not loaded from the plugin list.
pluginsList = pluginsList.filter(function (unload) {
  return unload !== 'unloadedPlugin';
});
var pluginListLength = pluginsList.length;

// This will clean the plugin array from those pesky broken plugins that didn't load.
pluginLoaded = pluginLoaded.filter(function (empty) {
  return empty !== 'undefined'
});

if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded) };
console.debug(pluginLoaded.length + ' plugins loaded: ' + pluginsList);

// This will load the help text from all the plugins.
client.pluginHelp = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].help !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].help) }
      client.pluginHelp.push(pluginLoaded[p].help)
    }
  }
}

if (client.config.BotSettings.Debug == true) {
  console.log(client.pluginHelp)
  console.log('Help Embeds have been loaded!')
};
stillLoading = false

//~~~~~~~~ This next section is the discord events section. Each event starts with code that seperates the matching functions into their own array for the event, and then fires then when needed.
//    channelCreate:   

var pluginChannelCreate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].channelCreate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].channelCreate) }
      pluginChannelCreate.push(pluginLoaded[p].channelCreate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginChannelCreate)
  console.log('channelCreate functions have been loaded!')
};

client.on("channelCreate", channel => {
  for (i = 0; i < pluginChannelCreate.length; i++) {
    try {
      pluginChannelCreate[i](channel);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginChannelCreate[i] + 'Error: ' + err)
    }
  }
});

//    channelDelete:   

var pluginChannelDelete = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].channelDelete !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].channelDelete) }
      pluginChannelDelete.push(pluginLoaded[p].channelDelete)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginChannelDelete)
  console.log('channelDelete functions have been loaded!')

};

client.on("channelDelete", channel => {
  for (i = 0; i < pluginChannelDelete.length; i++) {
    try {
      pluginChannelDelete[i](channel);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginChannelCreate[i] + 'Error: ' + err)
    }
  }
});

//    channelPinsUpdate:   

var pluginChannelPinsUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].channelPinsUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].channelPinsUpdate) }
      pluginChannelPinsUpdate.push(pluginLoaded[p].channelPinsUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log('ChannelPinsUpdate functions have been loaded!')
  console.log(pluginChannelPinsUpdate)
};

client.on("channelPinsUpdate", (channel, time) => {
  for (i = 0; i < pluginChannelPinsUpdate.length; i++) {
    try {
      pluginChannelPinsUpdate[i](channel, time);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginChannelPinsUpdate[i] + 'Error: ' + err)
    }
  }
});

//    channelUpdate:   

var pluginChannelUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].channelUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].channelUpdate) }
      pluginChannelUpdate.push(pluginLoaded[p].channelUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginChannelUpdate)
  console.log('channelUpdate functions have been loaded!')
};

client.on("channelUpdate", (oldChannel, newChannel) => {
  for (i = 0; i < pluginChannelUpdate.length; i++) {
    try {
      pluginChannelUpdate[i](oldChannel, newChannel);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginChannelUpdate[i] + 'Error: ' + err)
    }
  }
});

//    clientUserGuildSettingsUpdate:   

var pluginClientUserGuildSettingsUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].clientUserGuildSettingsUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].clientUserGuildSettingsUpdate) }
      pluginClientUserGuildSettingsUpdate.push(pluginLoaded[p].clientUserGuildSettingsUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginClientUserGuildSettingsUpdate)
  console.log('clientUserGuildSettingsUpdate functions have been loaded!')
};

client.on("clientUserSettingsUpdate", clientUserGuildSettings => {
  for (i = 0; i < pluginClientUserGuildSettingsUpdate.length; i++) {
    try {
      pluginClientUserGuildSettingsUpdate[i](clientUserGuildSettings);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginClientUserGuildSettingsUpdate[i] + 'Error: ' + err)
    }
  }
});

//    clientUserSettingsUpdate:   

var pluginClientUserSettingsUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].clientUserSettingsUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].clientUserSettingsUpdate) }
      pluginClientUserSettingsUpdate.push(pluginLoaded[p].clientUserSettingsUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginClientUserSettingsUpdate)
  console.log('clientUserSettinsUpdate functions have been loaded!')
};

client.on("clientUserSettingsUpdate", clientUserSettings => {
  for (i = 0; i < pluginClientUserSettingsUpdate.length; i++) {
    try {
      pluginClientUserSettingsUpdate[i](clientUserSettings);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginClientUserSettingsUpdate[i] + 'Error: ' + err)
    }
  }
});


//    debug:   

var pluginDebug = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].debug !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].debug) }
      pluginDebug.push(pluginLoaded[p].debug)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginDebug)
  console.log('debug functions have been loaded!')
};

client.on("debug", info => {


  for (i = 0; i < pluginDebug.length; i++) {
    try {
      pluginDebug[i](info);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginDebug[i] + 'Error: ' + err)
    }
  }
});

//    disconnect:   

var pluginDisconnect = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].disconnect !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].disconnect) }
      pluginDisconnect.push(pluginLoaded[p].disconnect)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginDisconnect)
  console.log('Disconnect functions have been loaded!')
};

client.on("disconnect", event => {


  for (i = 0; i < pluginDisconnect.length; i++) {
    try {
      pluginDisconnect[i](event);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginDisconnect[i] + 'Error: ' + err)
    }
  }
});

//    emojiCreate:   

var pluginEmojiCreate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].emojiCreate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].emojiCreate) }
      pluginEmojiCreate.push(pluginLoaded[p].emojiCreate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginEmojiCreate)
  console.log('emojiCreate functions have been loaded!')
};

client.on("emojiCreate", emoji => {


  for (i = 0; i < pluginEmojiCreate.length; i++) {
    try {
      pluginEmojiCreate[i](emoji);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginEmojiCreate[i] + 'Error: ' + err)
    }
  }
});

//    emojiDelete:   

var pluginEmojiDelete = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].emojiDelete !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].emojiDelete) }
      pluginEmojiDelete.push(pluginLoaded[p].emojiDelete)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginEmojiDelete)
  console.log('emojiDelete functions have been loaded!')
};

client.on("emojiDelete", emoji => {


  for (i = 0; i < pluginEmojiDelete.length; i++) {
    try {
      pluginEmojiDelete[i](emoji);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginEmojiDelete[i] + 'Error: ' + err)
    }
  }
});
//    emojiUpdate:   

var pluginEmojiUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].emojiUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].emojiUpdate) }
      pluginEmojiUpdate.push(pluginLoaded[p].emojiUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginEmojiUpdate)
  console.log('emojiUpdate functions have been loaded!')
};

client.on("emojiUpdate", (oleEmoji, newEmoji) => {


  for (i = 0; i < pluginEmojiUpdate.length; i++) {
    try {
      pluginEmojiUpdate[i](oleEmoji, newEmoji);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginEmojiUpdate[i] + 'Error: ' + err)
    }
  }
});
//    error:   

var pluginError = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].error !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].error) }
      pluginError.push(pluginLoaded[p].error)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginError)
  console.log('error functions have been loaded!')
};

client.on("error", error => {


  for (i = 0; i < pluginError.length; i++) {
    try {
      pluginError[i](error);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginError[i] + 'Error: ' + err)
    }
  }
});

//    guildBanAdd:   

var pluginGuildBanAdd = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildBanAdd !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildBanAdd) }
      pluginGuildBanAdd.push(pluginLoaded[p].guildBanAdd)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildBanAdd)
  console.log('guildBanAdd functions have been loaded!')
};

client.on("guildBanAdd", (guild, user) => {


  for (i = 0; i < pluginGuildBanAdd.length; i++) {
    try {
      pluginGuildBanAdd[i](guild, user);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildBanAdd[i] + 'Error: ' + err)
    }
  }
});

//    guildBanRemove:   

var pluginGuildBanRemove = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildBanRemove !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildBanRemove) }
      pluginGuildBanRemove.push(pluginLoaded[p].guildBanRemove)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildBanRemove)
  console.log('guildBanRemove functions have been loaded!')
};

client.on("guildBanRemove", (guild, user) => {


  for (i = 0; i < pluginGuildBanRemove.length; i++) {
    try {
      pluginGuildBanRemove[i](guild, user);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildBanRemove[i] + 'Error: ' + err)
    }
  }
});

//    guildCreate: The bot joins a guild for the first time while bot is active.

var pluginGuildCreate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildCreate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildCreate) }
      pluginGuildCreate.push(pluginLoaded[p].guildCreate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildCreate)
  console.log('guildCreate functions have been loaded!')
};

client.on("guildCreate", guild => {


  for (i = 0; i < pluginGuildCreate.length; i++) {
    try {
      pluginGuildCreate[i](guild);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildCreate[i] + 'Error: ' + err)
    }
  }
});

//    guildDelete: The bot leaves a guild while bot is active.

var pluginGuildDelete = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildDelete !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildDelete) }
      pluginGuildDelete.push(pluginLoaded[p].guildDelete)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildDelete)
  console.log('guildDelete functions have been loaded!')
};

client.on("guildDelete", guild => {


  for (i = 0; i < pluginGuildDelete.length; i++) {
    try {
      pluginGuildDelete[i](guild);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildDelete[i] + 'Error: ' + err)
    }
  }
});

//    guildMemberAdd:   

var pluginGuildMemberAdd = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildMemberAdd !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildMemberAdd) }
      pluginGuildMemberAdd.push(pluginLoaded[p].guildMemberAdd)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildMemberAdd)
  console.log('guildMemberAdd functions have been loaded!')
};

client.on("guildMemberAdd", member => {


  for (i = 0; i < pluginGuildMemberAdd.length; i++) {
    try {
      pluginGuildMemberAdd[i](member);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildMemberAdd[i] + 'Error: ' + err)
    }
  }
});

//    guildMemberAvailible:   

var pluginGuildMemberAvailible = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildMemberAvailible !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildMemberAvailible) }
      pluginGuildMemberAvailible.push(pluginLoaded[p].guildMemberAvailible)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildMemberAvailible)
  client.login('guildMemberAvailible functions have been loaded!')
};

client.on("guildMemberAvailible", member => {


  for (i = 0; i < pluginGuildMemberAvailible.length; i++) {
    try {
      pluginGuildMemberAvailible[i](member);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildMemberAvailible[i] + 'Error: ' + err)
    }
  }
});

//    guildMemberRemove:   

var pluginGuildMemberRemove = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildMemberRemove !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildMemberRemove) }
      pluginGuildMemberRemove.push(pluginLoaded[p].guildMemberRemove)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildMemberRemove)
  console.log('guildMemberRemove functions have been loaded!')
};

client.on("guildMemberRemove", member => {


  for (i = 0; i < pluginGuildMemberRemove.length; i++) {
    try {
      pluginGuildMemberRemove[i](member);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildMemberRemove[i] + 'Error: ' + err)
    }
  }
});

//    guildMemberChunk:   

var pluginGuildMemberChunk = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildMemberChunk !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildMemberChunk) }
      pluginGuildMemberChunk.push(pluginLoaded[p].guildMemberChunk)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildMemberChunk)
  console.log('guildMemberChunk functions have been loaded!')
};

client.on("guildMemberChunk", (members, guild) => {


  for (i = 0; i < pluginGuildMemberChunk.length; i++) {
    try {
      pluginGuildMemberChunk[i](members, guild);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildMemberChunk[i] + 'Error: ' + err)
    }
  }
});

//    guildMemberSpeaking: When a member start's and stops speaking.

var pluginGuildMemberSpeaking = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildMemberSpeaking !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildMemberSpeaking) }
      pluginGuildMemberSpeaking.push(pluginLoaded[p].guildMemberSpeaking)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildMemberSpeaking)
  console.log('guildMemberSpeaking functions have been loaded!')
};

client.on("guildMemberSpeaking", (member, speaking) => {


  for (i = 0; i < pluginGuildMemberSpeaking.length; i++) {
    try {
      pluginGuildMemberSpeaking[i](member, speaking);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildMemberSpeaking[i] + 'Error: ' + err)
    }
  }
});

//    guildMemberUpdate:   

var pluginGuildMemberUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildMemberUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildMemberUpdate) }
      pluginGuildMemberUpdate.push(pluginLoaded[p].guildMemberUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildMemberUpdate)
  console.log('guildMemberUpdate functions have been loaded!')
};

client.on("guildMemberUpdate", (oldMember, newMember) => {


  for (i = 0; i < pluginGuildMemberUpdate.length; i++) {
    try {
      pluginGuildMemberUpdate[i](oldMember, newMember);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildMemberUpdate[i] + 'Error: ' + err)
    }
  }
});

//    guildUnavailable:   

var pluginGuildUnavailable = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildUnavailable !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildUnavailable) }
      pluginGuildUnavailable.push(pluginLoaded[p].guildUnavailable)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildUnavailable)
  console.log('guildUnavailable functions have been loaded!')
};

client.on("guildUnavailable", guild => {


  for (i = 0; i < pluginGuildUnavailable.length; i++) {
    try {
      pluginGuildUnavailable[i](guild);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildUnavailable[i] + 'Error: ' + err)
    }
  }
});

//    guildUpdate:   

var pluginGuildUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].guildUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].guildUpdate) }
      pluginGuildUpdate.push(pluginLoaded[p].guildUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginGuildUpdate)
  console.log('guildUpdate functions have been loaded!')
};

client.on("guildUpdate", (oldGuild, newGuild) => {


  for (i = 0; i < pluginGuildUpdate.length; i++) {
    try {
      pluginGuildUpdate[i](oldGuild, newGuild);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginGuildUpdate[i] + 'Error: ' + err)
    }
  }
});

//	  message: 

var pluginMessage = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].message !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].message) }
      pluginMessage.push(pluginLoaded[p].message)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginMessage)
  console.log('message functions have been loaded!')
};

// remember to add in the docs later down the road that all commands for all plugins NEED to use the bot defined prefix.
client.on("message", message => {
  // console prints every message on the server, doesn't exist on release versions
  if (client.config.BotSettings.Debug == true) { console.log(message) };

  // ignores bots
  if (client.config.BotSettings.IgnoreBots == true) { if (message.author.bot) return }

  // Let's make creating commands a bit easier shall we?
  if (message.content.indexOf(client.prefix) !== 0) return;
  const args = message.content.slice(client.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // This fire's all the message events in the plugins
  for (i = 0; i < pluginMessage.length; i++) {
    try {
      pluginMessage[i](args, command, message);
    } catch (err) {
      console.log('There was an error while exicuting the message event ' + pluginMessage[i] + 'Error: ' + err)
      message.channel.send("There was an internal error with one of the bot plugins, please let your admin know to check the logs.")
    }
  }
});

//    messageDelete: 

var pluginMessageDelete = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].messageDelete !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].memessageDeletessage) }
      pluginMessageDelete.push(pluginLoaded[p].messamessageDeletege)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginMessageDelete)
  console.log('messageDelete functions have been loaded!')
};

client.on("messmessageDeleteage", message => {


  for (i = 0; i < pluginMessageDelete.length; i++) {
    try {
      pluginMessageDelete[i](message);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginMessageDelete[i] + 'Error: ' + err)
    }
  }
});

//    messageBulkDelete:   

var pluginMessageBulkDelete = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].messageBulkDelete !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].messageBulkDelete) }
      pluginMessageBulkDelete.push(pluginLoaded[p].messageBulkDelete)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginMessageBulkDelete)
  console.log('messageBulkDelete functions have been loaded!')
};

client.on("messageBulkDelete", messages => {


  for (i = 0; i < pluginMessageBulkDelete.length; i++) {
    try {
      pluginMessageBulkDelete[i](messages);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginMessageBulkDelete[i] + 'Error: ' + err)
    }
  }
});

//    messageReactionAdd:   

var pluginMessageReactionAdd = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].messageReactionAdd !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].messageReactionAdd) }
      pluginMessageReactionAdd.push(pluginLoaded[p].messageReactionAdd)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginMessageReactionAdd)
  console.log('messageReactionAdd functions have been loaded!')
};

client.on("messageReactionAdd", (messageReaction, user) => {


  for (i = 0; i < pluginMessageReactionAdd.length; i++) {
    try {
      pluginMessageReactionAdd[i](messageReaction, user);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginMessageReactionAdd[i] + 'Error: ' + err)
    }
  }
});

//    messageReactionRemove:   

var pluginMessageReactionRemove = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].messageReactionRemove !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].messageReactionRemove) }
      pluginMessageReactionRemove.push(pluginLoaded[p].messageReactionRemove)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginMessageReactionRemove)
  console.log('messageReactionRemove functions have been loaded!')
};

client.on("messageReactionRemove", (messageReaction, user) => {


  for (i = 0; i < pluginMessageReactionRemove.length; i++) {
    try {
      pluginMessageReactionRemove[i](messageReaction, user);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginMessageReactionRemove[i] + 'Error: ' + err)
    }
  }
});

//    messageReactionRemoveAll:   

var pluginMessageReactionRemoveAll = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].messageReactionRemoveAll !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].messageReactionRemoveAll) }
      pluginMessageReactionRemoveAll.push(pluginLoaded[p].messageReactionRemoveAll)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginMessageReactionRemoveAll)
  console.log('messageReactionRemoveAll functions have been loaded!')
};

client.on("messageReactionRemoveAll", message => {


  for (i = 0; i < pluginMessageReactionRemoveAll.length; i++) {
    try {
      pluginMessageReactionRemoveAll[i](message);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginMessageReactionRemoveAll[i] + 'Error: ' + err)
    }
  }
});

//    messageUpdate:   

var pluginMessageUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].messageUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].messageUpdate) }
      pluginMessageUpdate.push(pluginLoaded[p].messageUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginMessageUpdate)
  console.log('messageUpdate functions have been loaded!')
};

client.on("messageUpdate", oldMessage => {


  for (i = 0; i < pluginMessageUpdate.length; i++) {
    try {
      pluginMessageUpdate[i](oldMessage);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginMessageUpdate[i] + 'Error: ' + err)
    }
  }
});

//    presenceUpdate:   

var pluginPresenceUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].presenceUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].presenceUpdate) }
      pluginPresenceUpdate.push(pluginLoaded[p].presenceUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginPresenceUpdate)
  console.log('presenceUpdate functions have been loaded!')
};

client.on("presenceUpdate", (oldMember, newMember) => {


  for (i = 0; i < pluginPresenceUpdate.length; i++) {
    try {
      pluginPresenceUpdate[i](oldMember, newMember);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginPresenceUpdate[i] + 'Error: ' + err)
    }
  }
});

//    ready:   

var pluginReady = new Array;


if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].ready !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].ready) }
      pluginReady.push(pluginLoaded[p].ready)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginReady)
  console.log('reconnecting functions have been loaded!')
};

client.on("ready", () => {
  console.log('Firebot has connected to ' + client.guilds.array().length + ' server(s).')


  for (i = 0; i < pluginReady.length; i++) {
    try {
      pluginReady[i]();
    } catch (err) {
      if (logErrors == true) { console.error('There was an error while exicuting Ready event ' + String(pluginReady[i]).split("\n").slice(0, 10).join("\n") + '\n Error: ' + err + "\n Note: Only first 10 lines of function shown!") }
    }
  }
});

//    reconnecting:   

var pluginReconnecting = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].reconnecting !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].reconnecting) }
      pluginReconnecting.push(pluginLoaded[p].reconnecting)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginReconnecting)
  console.log('reconnected functions have been loaded!')
};

client.on("reconnecting", () => {


  for (i = 0; i < pluginReconnecting.length; i++) {
    try {
      pluginReconnecting[i]();
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginReconnecting[i] + 'Error: ' + err)
    }
  }
});

//    resume: When a websocket resumes (not a music feature!)

var pluginResume = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].resume !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].resume) }
      pluginResume.push(pluginLoaded[p].resume)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginResume)
  console.log('resume functions have been loaded!')
};

client.on("resume", replayed => {


  for (i = 0; i < pluginResume.length; i++) {
    try {
      pluginResume[i](replayed);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginResume[i] + 'Error: ' + err)
    }
  }
});

//    roleCreate:   

var pluginRoleCreated = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].roleCreate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].roleCreate) }
      pluginRoleCreated.push(pluginLoaded[p].roleCreate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginRoleCreated)
  console.log('roleCreated functions have been loaded!')
};

client.on("roleCreate", role => {


  for (i = 0; i < pluginRoleCreated.length; i++) {
    try {
      pluginRoleCreated[i](role);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginRoleCreated[i] + 'Error: ' + err)
    }
  }
});

//    roleDelete:   

var pluginRoleDelete = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].roleDelete !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].roleDelete) }
      pluginRoleDelete.push(pluginLoaded[p].roleDelete)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginRoleDelete)
  console.log('roleDelete functions have been loaded!')
};

client.on("roleDelete", role => {


  for (i = 0; i < pluginRoleDelete.length; i++) {
    try {
      pluginRoleDelete[i](role);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginRoleDelete[i] + 'Error: ' + err)
    }
  }
});

//    roleUpdate:   

var pluginRoleUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].roleUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].roleUpdate) }
      pluginRoleUpdate.push(pluginLoaded[p].roleUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginRoleUpdate)
  console.log('roleUpdate functions have been loaded!')
};

client.on("roleUpdate", (oldRole, newRole) => {


  for (i = 0; i < pluginRoleUpdate.length; i++) {
    try {
      pluginRoleUpdate[i](mesoldRole, newRolesage);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginRoleUpdate[i] + 'Error: ' + err)
    }
  }
});

//    typingStart:   

var pluginTypingStart = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].typingStart !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].typingStart) }
      pluginTypingStart.push(pluginLoaded[p].typingStart)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginTypingStart)
  console.log('typingStart functions have been loaded!')
};

client.on("typingStart", (channel, user) => {


  for (i = 0; i < pluginTypingStart.length; i++) {
    try {
      pluginTypingStart[i](channel, user);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginTypingStart[i] + 'Error: ' + err)
    }
  }
});

//    typingStop:   

var pluginTypingStop = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].typingStop !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].typingStop) }
      pluginTypingStop.push(pluginLoaded[p].typingStop)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginTypingStop)
  console.log('typingStop functions have been loaded!')
};

client.on("typingStop", (channel, user) => {


  for (i = 0; i < pluginTypingStop.length; i++) {
    try {
      pluginTypingStop[i](channel, user);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginTypingStop[i] + 'Error: ' + err)
    }
  }
});

//    userNoteUpdate:   

var pluginUserNoteUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].userNoteUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].userNoteUpdate) }
      pluginUserNoteUpdate.push(pluginLoaded[p].userNoteUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginUserNoteUpdate)
  console.log('userNoteUpdate functions have been updated!')
};

client.on("userNoteUpdate", (user, oldNote, newNote) => {


  for (i = 0; i < pluginUserNoteUpdate.length; i++) {
    try {
      pluginUserNoteUpdate[i](user, oldNote, newNote);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginUserNoteUpdate[i] + 'Error: ' + err)
    }
  }
});

//    userUpdate:   

var pluginUserUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].userUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].userUpdate) }
      pluginUserUpdate.push(pluginLoaded[p].userUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginUserUpdate)
  console.log('userUpdate functions have been loaded!')
};

client.on("userUpdate", (oldUser, newUser) => {


  for (i = 0; i < pluginUserUpdate.length; i++) {
    try {
      pluginUserUpdate[i](oldUser, newUser);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginUserUpdate[i] + 'Error: ' + err)
    }
  }
});

//    voiceStateUpdate:   

var pluginVoiceStateUpdate = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].voiceStateUpdate !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].voiceStateUpdate) }
      pluginVoiceStateUpdate.push(pluginLoaded[p].voiceStateUpdate)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginVoiceStateUpdate)
  console.log('voiceStateUpdate functions have been loaded!')
};

client.on("voiceStateUpdate", (oldMember, newMember) => {


  for (i = 0; i < pluginVoiceStateUpdate.length; i++) {
    try {
      pluginVoiceStateUpdate[i](oldMember, newMember);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginVoiceStateUpdate[i] + 'Error: ' + err)
    }
  }
});

//    warn:   

var pluginWarn = new Array;
if (pluginLoaded != 'undefined') {
  for (p = 0; p < pluginLoaded.length; p++) {
    if (pluginLoaded[p].warn !== undefined) {
      if (client.config.BotSettings.Debug == true) { console.log(pluginLoaded[p].warn) }
      pluginWarn.push(pluginLoaded[p].warn)
    }
  }
};

if (client.config.BotSettings.Debug == true) {
  console.log(pluginWarn)
  console.log('warn functions have been loaded!')
};

client.on("warn", info => {


  for (i = 0; i < pluginWarn.length; i++) {
    try {
      pluginWarn[i](info);
    } catch (err) {
      console.error('There was an error while exicuting event ' + pluginWarn[i] + 'Error: ' + err)
    }
  }
});


// This is the last line of the file!
client.login(client.config.BotSettings.BotToken, loginOutput);
function loginOutput(error, token) {
  if (error) {
    console.log('Login Error: ${error}')
    return;
  } else {
    console.log('Connecting to Discord Servers...')
  }
}